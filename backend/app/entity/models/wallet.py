"""
Money movements that aren't stock trades, plus the platform's revenue book.

Two tables live here because they're written together almost everywhere:

  WalletTransaction  — every credit/debit against an investor's assets
                       that isn't a buy/sell fill: cash in, cash out, the
                       platform fee on a trade, gifts sent/received, and the
                       monthly expert compensation payout. The stock
                       `transaction` table can't hold these (symbol/quantity/
                       price are NOT NULL and meaningless for cash events), so
                       the Transaction Portal unions the two on read.

  PlatformRevenue    — one row per event that earns the platform money. This
                       is the single source of truth for the finance admin
                       dashboard. Subscriptions are mirrored in here too (see
                       backfill_subscription_revenue) so the dashboard never
                       has to union across differently-shaped tables.

Amounts are float dollars, matching investor.assets. Note that
subscription.amount is stored in CENTS — convert on the way in.
"""
from sqlalchemy import Column, ForeignKey, String, Float, DateTime, Text, func
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4

TZ = ZoneInfo("Asia/Singapore")


def _now():
    return datetime.now(TZ)


# Wallet transaction types. Sign convention: `amount` is signed as the
# investor experiences it — positive credits assets, negative debits it.
TXN_CASH_IN = "cash_in"
TXN_CASH_OUT = "cash_out"
TXN_PLATFORM_FEE = "platform_fee"
TXN_GIFT_SENT = "gift_sent"
TXN_GIFT_RECEIVED = "gift_received"
TXN_COMPENSATION = "compensation"

# Revenue sources — keep in sync with the finance dashboard filters.
REV_SUBSCRIPTION = "subscription"
REV_TRADE_FEE = "trade_fee"
REV_GIFT_COMMISSION = "gift_commission"

REVENUE_SOURCES = (REV_SUBSCRIPTION, REV_TRADE_FEE, REV_GIFT_COMMISSION)

REVENUE_SOURCE_LABELS = {
    REV_SUBSCRIPTION: "Subscriptions",
    REV_TRADE_FEE: "Trading fees",
    REV_GIFT_COMMISSION: "Gift commission",
}


class WalletTransaction(Base):
    __tablename__ = "wallet_transaction"

    wallet_txn_id = Column(String(50), primary_key=True,
                           default=lambda: f"wtxn_{uuid4()}")
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    txn_type = Column(String(30), nullable=False)
    # Signed: positive = credited to assets, negative = debited.
    amount = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=True)
    status = Column(String(20), nullable=False, default="completed")
    description = Column(String(255), nullable=True)
    # Free-form link back to whatever caused this row (order_id, gift_id,
    # ledger_id, ...). Not a FK — the target table varies by txn_type.
    reference_id = Column(String(50), nullable=True)
    # Only populated for cash_in / cash_out. Account numbers are stored
    # MASKED — this is a sandbox and we never want full numbers at rest.
    bank_name = Column(String(120), nullable=True)
    account_number_masked = Column(String(40), nullable=True)
    created_at = Column(DateTime, default=_now)

    # ── writes ───────────────────────────────────────────────────────────

    @staticmethod
    def record(session, investor_id, txn_type, amount, *, description=None,
               reference_id=None, bank_name=None, account_number_masked=None,
               balance_after=None, status="completed"):
        """Insert a wallet row on an ALREADY-OPEN session.

        Callers own the transaction boundary so the money move and its ledger
        row commit together — never call this on its own session while the
        balance update sits in another.
        """
        row = WalletTransaction(
            investor_id=investor_id,
            txn_type=txn_type,
            amount=round(float(amount), 2),
            balance_after=round(float(balance_after), 2)
            if balance_after is not None else None,
            status=status,
            description=description,
            reference_id=reference_id,
            bank_name=bank_name,
            account_number_masked=account_number_masked,
        )
        session.add(row)
        session.flush()
        return row.wallet_txn_id

    # ── reads ────────────────────────────────────────────────────────────

    @staticmethod
    def get_for_investor(investor_id, limit=100, txn_type=None):
        with get_session() as session:
            q = session.query(WalletTransaction).filter(
                WalletTransaction.investor_id == investor_id)
            if txn_type:
                q = q.filter(WalletTransaction.txn_type == txn_type)
            rows = q.order_by(
                WalletTransaction.created_at.desc()).limit(limit).all()
            return [
                {
                    "wallet_txn_id": r.wallet_txn_id,
                    "txn_type": r.txn_type,
                    "amount": r.amount,
                    "balance_after": r.balance_after,
                    "status": r.status,
                    "description": r.description,
                    "reference_id": r.reference_id,
                    "bank_name": r.bank_name,
                    "account_number_masked": r.account_number_masked,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]

    @staticmethod
    def get_all_for_admin(session, limit=200, txn_type=None, status=None):
        """Every wallet row across ALL investors, newest first, joined to the
        owning user account so the finance admin can see who moved the money.
        Read-only monitoring — no approval workflow is attached here.

        Runs on a caller-supplied session so the name join happens in the same
        query rather than a second round-trip.
        """
        from app.entity.models.investor import Investor
        from app.entity.models.useraccount import UserAccount

        q = (
            session.query(WalletTransaction, UserAccount)
            .join(Investor, WalletTransaction.investor_id == Investor.investor_id)
            .join(UserAccount, Investor.user_id == UserAccount.user_id)
        )
        if txn_type:
            q = q.filter(WalletTransaction.txn_type == txn_type)
        if status:
            q = q.filter(WalletTransaction.status == status)
        rows = q.order_by(
            WalletTransaction.created_at.desc()).limit(limit).all()

        return [
            {
                "wallet_txn_id": txn.wallet_txn_id,
                "txn_type": txn.txn_type,
                "amount": txn.amount,
                "balance_after": txn.balance_after,
                "status": txn.status,
                "description": txn.description,
                "reference_id": txn.reference_id,
                "bank_name": txn.bank_name,
                "account_number_masked": txn.account_number_masked,
                "user_name": user.full_name or user.username or "—",
                "email_address": user.email_address,
                "created_at": txn.created_at.isoformat() if txn.created_at else None,
            }
            for txn, user in rows
        ]

    @staticmethod
    def get_platform_totals(large_threshold=1000.0):
        """Platform-wide magnitudes per txn_type plus the counts behind them,
        for the Payment Transactions summary cards. `large_cash_out` flags how
        many withdrawals cleared the anti-money-laundering review threshold."""
        with get_session() as session:
            rows = session.query(
                WalletTransaction.txn_type,
                func.coalesce(func.sum(func.abs(WalletTransaction.amount)), 0.0),
                func.count(WalletTransaction.wallet_txn_id),
            ).filter(
                WalletTransaction.status == "completed",
            ).group_by(WalletTransaction.txn_type).all()

            by_type = {t: {"total": round(float(v or 0), 2), "count": int(c)}
                       for t, v, c in rows}

            def _pick(kind):
                return by_type.get(kind, {"total": 0.0, "count": 0})

            large_cash_out = session.query(
                func.count(WalletTransaction.wallet_txn_id)
            ).filter(
                WalletTransaction.txn_type == TXN_CASH_OUT,
                WalletTransaction.status == "completed",
                func.abs(WalletTransaction.amount) >= large_threshold,
            ).scalar() or 0

            pending = session.query(
                func.count(WalletTransaction.wallet_txn_id)
            ).filter(WalletTransaction.status != "completed").scalar() or 0

            cash_in = _pick(TXN_CASH_IN)
            cash_out = _pick(TXN_CASH_OUT)

            return {
                "cash_in": cash_in,
                "cash_out": cash_out,
                "gift_sent": _pick(TXN_GIFT_SENT),
                "gift_received": _pick(TXN_GIFT_RECEIVED),
                "platform_fee": _pick(TXN_PLATFORM_FEE),
                "compensation": _pick(TXN_COMPENSATION),
                "net_flow": round(cash_in["total"] - cash_out["total"], 2),
                "large_cash_out": int(large_cash_out),
                "large_threshold": large_threshold,
                "pending": int(pending),
            }

    @staticmethod
    def get_totals(investor_id):
        """{cash_in, cash_out, fees_paid, gifts_sent, gifts_received,
        compensation} as positive magnitudes, for summary cards."""
        with get_session() as session:
            rows = session.query(
                WalletTransaction.txn_type,
                func.coalesce(func.sum(WalletTransaction.amount), 0.0),
            ).filter(
                WalletTransaction.investor_id == investor_id,
                WalletTransaction.status == "completed",
            ).group_by(WalletTransaction.txn_type).all()

            by_type = {t: abs(float(v or 0)) for t, v in rows}
            return {
                "cash_in": round(by_type.get(TXN_CASH_IN, 0.0), 2),
                "cash_out": round(by_type.get(TXN_CASH_OUT, 0.0), 2),
                "fees_paid": round(by_type.get(TXN_PLATFORM_FEE, 0.0), 2),
                "gifts_sent": round(by_type.get(TXN_GIFT_SENT, 0.0), 2),
                "gifts_received": round(by_type.get(TXN_GIFT_RECEIVED, 0.0), 2),
                "compensation": round(by_type.get(TXN_COMPENSATION, 0.0), 2),
            }


class PlatformRevenue(Base):
    __tablename__ = "platform_revenue"

    revenue_id = Column(String(50), primary_key=True,
                        default=lambda: f"rev_{uuid4()}")
    source = Column(String(30), nullable=False)      # see REVENUE_SOURCES
    amount = Column(Float, nullable=False)           # always positive, dollars
    # Who generated it — the paying investor / gift sender / trader.
    user_id = Column(String(50), nullable=True)
    # Idempotency + audit key. Unique per source in practice (sub_id, order_id,
    # gift_id) so replays don't double-count; enforced in code, not by the DB,
    # because the same reference can legitimately appear under two sources.
    reference_id = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)

    # ── writes ───────────────────────────────────────────────────────────

    @staticmethod
    def record(session, source, amount, *, user_id=None, reference_id=None,
               description=None):
        """Book revenue on an ALREADY-OPEN session. Ignores non-positive
        amounts so callers don't have to guard every call site."""
        amount = round(float(amount), 2)
        if amount <= 0:
            return None
        row = PlatformRevenue(
            source=source,
            amount=amount,
            user_id=user_id,
            reference_id=reference_id,
            description=description,
        )
        session.add(row)
        session.flush()
        return row.revenue_id

    @staticmethod
    def record_once(session, source, amount, *, reference_id, user_id=None,
                    description=None):
        """record(), but a no-op if this (source, reference_id) pair is
        already booked. Used by the subscription backfill and anywhere a
        retry could fire twice."""
        if reference_id:
            exists = session.query(PlatformRevenue.revenue_id).filter(
                PlatformRevenue.source == source,
                PlatformRevenue.reference_id == reference_id,
            ).first()
            if exists:
                return None
        return PlatformRevenue.record(
            session, source, amount, user_id=user_id,
            reference_id=reference_id, description=description,
        )

    # ── reads ────────────────────────────────────────────────────────────

    @staticmethod
    def get_totals_by_source(start=None, end=None):
        """{source: total} for every known source, zero-filled."""
        with get_session() as session:
            q = session.query(
                PlatformRevenue.source,
                func.coalesce(func.sum(PlatformRevenue.amount), 0.0),
            )
            if start:
                q = q.filter(PlatformRevenue.created_at >= start)
            if end:
                q = q.filter(PlatformRevenue.created_at < end)
            rows = q.group_by(PlatformRevenue.source).all()

            totals = {source: 0.0 for source in REVENUE_SOURCES}
            for source, value in rows:
                totals[source] = round(float(value or 0), 2)
            totals["total"] = round(sum(
                v for k, v in totals.items() if k in REVENUE_SOURCES), 2)
            return totals

    @staticmethod
    def get_monthly_series(months=6):
        """[{month: 'YYYY-MM', subscription, trade_fee, gift_commission,
        total}] oldest-first, with empty months zero-filled."""
        now = datetime.now(TZ)
        start_month = _add_months(_month_start(now), -(months - 1))

        with get_session() as session:
            rows = session.query(
                func.date_format(PlatformRevenue.created_at, "%Y-%m"),
                PlatformRevenue.source,
                func.coalesce(func.sum(PlatformRevenue.amount), 0.0),
            ).filter(
                PlatformRevenue.created_at >= start_month
            ).group_by(
                func.date_format(PlatformRevenue.created_at, "%Y-%m"),
                PlatformRevenue.source,
            ).all()

        buckets = {}
        for key, source, value in rows:
            buckets.setdefault(key, {})[source] = round(float(value or 0), 2)

        series = []
        cursor = start_month
        for _ in range(months):
            key = cursor.strftime("%Y-%m")
            found = buckets.get(key, {})
            point = {"month": key}
            for source in REVENUE_SOURCES:
                point[source] = found.get(source, 0.0)
            point["total"] = round(
                sum(point[s] for s in REVENUE_SOURCES), 2)
            series.append(point)
            cursor = _add_months(cursor, 1)
        return series

    @staticmethod
    def get_recent(limit=100, source=None):
        with get_session() as session:
            q = session.query(PlatformRevenue)
            if source:
                q = q.filter(PlatformRevenue.source == source)
            rows = q.order_by(
                PlatformRevenue.created_at.desc()).limit(limit).all()
            return [
                {
                    "revenue_id": r.revenue_id,
                    "source": r.source,
                    "source_label": REVENUE_SOURCE_LABELS.get(r.source, r.source),
                    "amount": r.amount,
                    "user_id": r.user_id,
                    "reference_id": r.reference_id,
                    "description": r.description,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]


# ── month helpers (shared with expertcompensation.py) ────────────────────

def _month_start(dt):
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_months(dt, months=1):
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    return dt.replace(year=year, month=month)


# ── one-time migration of pre-existing subscription revenue ──────────────

def backfill_subscription_revenue():
    """Copy any Subscription rows that predate PlatformRevenue into the
    revenue book so the finance dashboard shows real historical numbers.

    Idempotent via record_once(reference_id=sub_id) — runs on every startup
    and does nothing once caught up.
    """
    from app.entity.models.subscription import Subscription
    from app.entity.models.investor import Investor

    with get_session() as session:
        rows = session.query(Subscription, Investor).outerjoin(
            Investor, Subscription.investor_id == Investor.investor_id
        ).filter(Subscription.amount > 0).all()

        inserted = 0
        for subscription, investor in rows:
            created = PlatformRevenue.record_once(
                session,
                REV_SUBSCRIPTION,
                # subscription.amount is in CENTS
                round((subscription.amount or 0) / 100.0, 2),
                reference_id=subscription.sub_id,
                user_id=investor.user_id if investor else None,
                description=f"{(subscription.plan_type or 'premium').capitalize()} subscription",
            )
            if created:
                inserted += 1

        if inserted:
            print(f"[REVENUE] Backfilled {inserted} subscription revenue rows")
        return inserted
