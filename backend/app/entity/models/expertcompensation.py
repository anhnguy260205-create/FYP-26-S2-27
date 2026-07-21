"""
Expert compensation — paid monthly, per premium follower.

An expert earns RATE_PER_PREMIUM_FOLLOWER for each premium user following them,
but the payout only unlocks once ALL of these are true for the closed month:

  * verified (approved/active)
  * follower_count (total followers) >= FOLLOWER_COUNT_THRESHOLD
  * portfolio rating average >= RATING_THRESHOLD

There is no minimum on premium_follower_count itself — the amount earned is
simply premium_follower_count * RATE_PER_PREMIUM_FOLLOWER once unlocked (so
it can be $0 in a month where the expert qualifies but has no premium
followers yet).

Payout runs for the month that just closed. The daily poller in main.py calls
run_monthly_payout(), which:

  1. snapshots the expert's follower/premium-follower counts and rating for
     the closed month,
  2. writes a ledger row (the permanent record — it does NOT change later if
     someone unfollows or the rating moves),
  3. credits the expert's paper_money,
  4. writes a wallet_transaction so the payout appears in Transaction History
     the way a salary credit does on a bank statement.

Idempotency: the (expert_id, period_start) unique constraint plus a `paid`
flag mean the poller can run every day — and re-run after a crash — without
paying twice.

Only VERIFIED experts are paid. An expert who doesn't meet the bar still gets
a ledger row (amount 0) so the history shows why nothing arrived.
"""
from sqlalchemy import Column, ForeignKey, String, DateTime, Integer, Float, Boolean, UniqueConstraint
from sqlalchemy import text
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4

# $0.10 per premium follower, per month.
RATE_PER_PREMIUM_FOLLOWER = 0.10

# No minimum on premium followers specifically — kept as a named constant so
# the intent reads as deliberate rather than as a missing check. The real
# unlock gate is FOLLOWER_COUNT_THRESHOLD + RATING_THRESHOLD below.
FOLLOWER_THRESHOLD = 0

# Compensation unlock gate (in addition to being verified).
FOLLOWER_COUNT_THRESHOLD = 100
RATING_THRESHOLD = 4.5

TZ = ZoneInfo("Asia/Singapore")

_APPROVED_VERIFICATION = ("verified", "approved", "active")


def is_compensation_eligible(verified: bool, follower_count: int, rating_average: float) -> bool:
    """The shared unlock rule — verified + 100 followers + 4.5★ rating.
    Used by both the live summary endpoint and the monthly payout job so
    they can never disagree on who qualifies."""
    return bool(
        verified
        and follower_count >= FOLLOWER_COUNT_THRESHOLD
        and rating_average >= RATING_THRESHOLD
    )


def _month_start(dt):
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_month(dt, months=1):
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    return dt.replace(year=year, month=month)


def _previous_completed_month_bounds(now):
    """(period_start, period_end) for the most recently COMPLETED calendar
    month — e.g. any day in July returns [June 1, July 1)."""
    current_month_start = _month_start(now)
    return _add_month(current_month_start, -1), current_month_start


def calculate_compensation(premium_follower_count: int) -> float:
    return round(max(0, premium_follower_count) * RATE_PER_PREMIUM_FOLLOWER, 2)


class ExpertCompensationLedger(Base):
    """One row per expert per completed calendar month."""
    __tablename__ = "expert_compensation_ledger"
    __table_args__ = (UniqueConstraint(
        "expert_id", "period_start", name="uq_expert_compensation_period"),)

    ledger_id = Column(String(50), primary_key=True,
                       default=lambda: f"complog_{uuid4()}")
    expert_id = Column(String(50), ForeignKey(
        "expert.expert_id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    # Total followers — display/context only.
    follower_count = Column(Integer, nullable=False, default=0)
    # The figure the payout is actually computed from.
    premium_follower_count = Column(Integer, nullable=False, default=0)
    eligible = Column(Boolean, default=False)
    amount = Column(Float, default=0.0)
    # Payout tracking — `paid` guards against double-crediting.
    paid = Column(Boolean, default=False, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    wallet_txn_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(TZ))

    # ── payout ───────────────────────────────────────────────────────────

    @staticmethod
    def run_monthly_payout():
        """Materialize + pay the most recently completed month. Idempotent.

        Returns {"period", "created", "paid", "total"}.
        """
        from app.entity.models.expert import Expert
        from app.entity.models.expertfollow import ExpertFollow
        from app.entity.models.expertverification import ExpertVerification
        from app.entity.models.expertportfolioreview import ExpertPortfolioReview
        from app.entity.models.investor import Investor
        from app.entity.models.wallet import WalletTransaction, TXN_COMPENSATION

        now = datetime.now(TZ)
        period_start, period_end = _previous_completed_month_bounds(now)
        period_label = period_start.strftime("%B %Y")

        created = 0
        paid_count = 0
        total_paid = 0.0

        with get_session() as session:
            experts = session.query(Expert).all()

            for expert in experts:
                existing = session.query(ExpertCompensationLedger).filter(
                    ExpertCompensationLedger.expert_id == expert.expert_id,
                    ExpertCompensationLedger.period_start == period_start,
                ).first()
                if existing and existing.paid:
                    continue

                verification = session.query(ExpertVerification).filter(
                    ExpertVerification.expert_id == expert.expert_id
                ).first()
                verified = bool(verification) and (
                    verification.verification_status or ""
                ).lower() in _APPROVED_VERIFICATION

                follower_count = ExpertFollow.get_follower_count(expert.user_id)
                premium_count = ExpertFollow.get_premium_follower_count(
                    expert.user_id)
                rating_average = ExpertPortfolioReview._stats(
                    session, expert.user_id)["average"]

                eligible = is_compensation_eligible(
                    verified, follower_count, rating_average)
                amount = calculate_compensation(
                    premium_count) if eligible else 0.0

                entry = existing
                if entry is None:
                    entry = ExpertCompensationLedger(
                        expert_id=expert.expert_id,
                        period_start=period_start,
                        period_end=period_end,
                    )
                    session.add(entry)
                    created += 1

                entry.follower_count = follower_count
                entry.premium_follower_count = premium_count
                entry.eligible = eligible
                entry.amount = amount

                if amount <= 0:
                    # Nothing to pay, but mark it settled so a closed month
                    # isn't reconsidered every single day.
                    entry.paid = True
                    entry.paid_at = datetime.now(TZ)
                    session.flush()
                    continue

                investor = session.query(Investor).filter(
                    Investor.user_id == expert.user_id
                ).first()
                if not investor:
                    # No wallet to pay into — leave unpaid so it settles once
                    # the account is repaired.
                    session.flush()
                    continue

                session.execute(
                    text("UPDATE investor SET paper_money = paper_money + :a "
                         "WHERE investor_id = :iid"),
                    {"a": amount, "iid": investor.investor_id},
                )
                new_balance = round(
                    float(investor.paper_money or 0) + amount, 2)

                session.flush()  # entry.ledger_id must exist for the reference
                txn_id = WalletTransaction.record(
                    session, investor.investor_id, TXN_COMPENSATION, amount,
                    description=(
                        f"Expert compensation — {period_label} "
                        f"({premium_count} premium follower"
                        f"{'s' if premium_count != 1 else ''} × "
                        f"${RATE_PER_PREMIUM_FOLLOWER:.2f})"
                    ),
                    reference_id=entry.ledger_id,
                    balance_after=new_balance,
                )

                entry.paid = True
                entry.paid_at = datetime.now(TZ)
                entry.wallet_txn_id = txn_id
                session.flush()

                paid_count += 1
                total_paid = round(total_paid + amount, 2)

        if paid_count:
            print(f"[COMPENSATION] {period_label}: paid {paid_count} expert(s), "
                  f"${total_paid:,.2f} total")

        return {
            "period": period_label,
            "created": created,
            "paid": paid_count,
            "total": total_paid,
        }

    # Back-compat alias — the poller in main.py used to call this name.
    @staticmethod
    def materialize_completed_months():
        return ExpertCompensationLedger.run_monthly_payout()

    # ── reads ────────────────────────────────────────────────────────────

    @staticmethod
    def get_history(expert_id, limit=12) -> list:
        with get_session() as session:
            rows = session.query(ExpertCompensationLedger).filter(
                ExpertCompensationLedger.expert_id == expert_id
            ).order_by(
                ExpertCompensationLedger.period_start.desc()
            ).limit(limit).all()
            return [
                {
                    "ledger_id": r.ledger_id,
                    "period_start": r.period_start,
                    "period_end": r.period_end,
                    "period_label": r.period_start.strftime("%B %Y")
                    if r.period_start else None,
                    "follower_count": r.follower_count,
                    "premium_follower_count": r.premium_follower_count or 0,
                    "eligible": r.eligible,
                    "amount": r.amount,
                    "paid": bool(r.paid),
                    "paid_at": r.paid_at.isoformat() if r.paid_at else None,
                }
                for r in rows
            ]

    @staticmethod
    def get_total_earned(expert_id) -> float:
        with get_session() as session:
            rows = session.query(ExpertCompensationLedger).filter(
                ExpertCompensationLedger.expert_id == expert_id
            ).all()
            return round(sum(r.amount or 0 for r in rows), 2)


def ensure_compensation_schema():
    """Add the columns introduced by the per-follower rewrite to an existing
    expert_compensation_ledger table.

    create_all() only creates missing TABLES, never missing COLUMNS, so a
    database that already has this table from the old flat-$500 design would
    otherwise break on the new fields.
    """
    from app.entity.database.connection import engine

    additions = {
        "premium_follower_count": "INTEGER NOT NULL DEFAULT 0",
        "paid": "TINYINT(1) NOT NULL DEFAULT 0",
        "paid_at": "DATETIME NULL",
        "wallet_txn_id": "VARCHAR(50) NULL",
        "created_at": "DATETIME NULL",
    }

    with engine.begin() as conn:
        existing = {
            row[0] for row in conn.execute(text(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() "
                "AND TABLE_NAME = 'expert_compensation_ledger'"
            ))
        }
        if not existing:
            return  # table doesn't exist yet — create_all will build it

        for column, ddl in additions.items():
            if column not in existing:
                conn.execute(text(
                    f"ALTER TABLE expert_compensation_ledger "
                    f"ADD COLUMN {column} {ddl}"
                ))
                print(f"[SCHEMA] expert_compensation_ledger += {column}")
