"""
Hybrid Trading Engine
---------------------
1. Validate investor funds / shares.
2. Save order to order_book.
3. Match against existing counterpart orders (Price-Time Priority).
4. Market Maker fills any remaining quantity at the current live price.
5. Update both investors' portfolios, balances, holdings, and transaction history.
6. Return a structured execution report.
"""

from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo
from sqlalchemy import text

from app.entity.database.session import get_session
from app.entity.models.order_book import OrderBook
from app.entity.models.investor import Investor
from app.entity.models.holding import Holding
from app.entity.models.wallet import (
    WalletTransaction, PlatformRevenue, TXN_PLATFORM_FEE, REV_TRADE_FEE,
)
from app.boundary.stock_ws import get_live_price

_SGT = ZoneInfo("Asia/Singapore")


# ── Platform commission ───────────────────────────────────────────────────────
#
# Charged on the executed value of an order: whichever is GREATER of a flat
# minimum and a percentage. So a $1,000 trade pays the $4 floor; a $10,000
# trade pays 0.1% = $10.
#
# NOTE: PLATFORM_FEE_RATE is 0.1% (0.001). If the intent was 1%, change this
# single constant to 0.01 — nothing else needs to move.
PLATFORM_FEE_MIN = 4.00
PLATFORM_FEE_RATE = 0.001


def calculate_platform_fee(trade_value: float) -> float:
    """Commission on `trade_value` dollars. Zero for a zero-value trade so
    unfilled orders aren't charged."""
    if not trade_value or trade_value <= 0:
        return 0.0
    return round(max(PLATFORM_FEE_MIN, trade_value * PLATFORM_FEE_RATE), 2)


def _charge_platform_fee(session, investor_id: str, user_id: str | None,
                         trade_value: float, symbol: str, order_type: str,
                         order_id: str) -> float:
    """Debit the commission from assets and book it as revenue.

    Returns the fee actually charged. If the investor can't cover the full
    fee (possible on a sell that barely moved, or after a partial fill), we
    take what's there rather than pushing the balance negative — the shortfall
    is dropped, not carried as debt.
    """
    fee = calculate_platform_fee(trade_value)
    if fee <= 0:
        return 0.0

    row = session.execute(
        text("SELECT assets FROM investor WHERE investor_id=:iid"),
        {"iid": investor_id},
    ).fetchone()
    if not row:
        return 0.0

    fee = min(fee, round(float(row.assets), 2))
    if fee <= 0:
        return 0.0

    session.execute(
        text("UPDATE investor SET assets=assets-:f WHERE investor_id=:iid"),
        {"f": fee, "iid": investor_id},
    )
    balance_after = round(float(row.assets) - fee, 2)

    WalletTransaction.record(
        session, investor_id, TXN_PLATFORM_FEE, -fee,
        description=f"Platform fee — {order_type} {symbol}",
        reference_id=order_id,
        balance_after=balance_after,
    )
    PlatformRevenue.record(
        session, REV_TRADE_FEE, fee,
        user_id=user_id,
        reference_id=order_id,
        description=f"{order_type.capitalize()} {symbol} — ${trade_value:,.2f} executed",
    )
    return fee


# ── low-level helpers (all accept an open SQLAlchemy session) ──────────────────

def _buy_shares(session, investor_id: str, symbol: str, qty: int, price: float) -> bool:
    total = round(price * qty, 2)
    row = session.execute(
        text("SELECT assets FROM investor WHERE investor_id=:iid"),
        {"iid": investor_id},
    ).fetchone()
    if not row or row.assets < total:
        return False
    session.execute(
        text("UPDATE investor SET assets=assets-:t, used_amount=used_amount+:t WHERE investor_id=:iid"),
        {"t": total, "iid": investor_id},
    )
    _upsert_holding_buy(session, investor_id, symbol, qty, price)
    return True


def _sell_shares(session, investor_id: str, symbol: str, qty: int, price: float):
    """Returns realized_pnl float, or None on failure."""
    row = session.execute(
        text("SELECT holding_id, quantity, average_cost FROM holding WHERE investor_id=:iid AND symbol=:sym"),
        {"iid": investor_id, "sym": symbol},
    ).fetchone()
    if not row or row.quantity < qty:
        return None
    pnl = round((price - row.average_cost) * qty, 2)
    total = round(price * qty, 2)
    cost_basis = round(row.average_cost * qty, 2)
    new_qty = row.quantity - qty
    session.execute(
        text("UPDATE holding SET quantity=:q, average_cost=CASE WHEN :q=0 THEN 0 ELSE average_cost END WHERE holding_id=:hid"),
        {"q": new_qty, "hid": row.holding_id},
    )
    session.execute(
        text("UPDATE investor SET assets=assets+:t, used_amount=GREATEST(0, used_amount-:c) WHERE investor_id=:iid"),
        {"t": total, "c": cost_basis, "iid": investor_id},
    )
    return pnl


def _upsert_holding_buy(session, investor_id: str, symbol: str, qty: int, price: float):
    row = session.execute(
        text("SELECT holding_id, quantity, average_cost FROM holding WHERE investor_id=:iid AND symbol=:sym"),
        {"iid": investor_id, "sym": symbol},
    ).fetchone()
    if row:
        new_qty = row.quantity + qty
        new_avg = (row.average_cost * row.quantity + price * qty) / new_qty
        session.execute(
            text("UPDATE holding SET quantity=:q, average_cost=:a WHERE holding_id=:hid"),
            {"q": new_qty, "a": round(new_avg, 6), "hid": row.holding_id},
        )
    else:
        session.execute(
            text("INSERT INTO holding (holding_id, investor_id, symbol, quantity, average_cost) VALUES (:hid, :iid, :sym, :q, :a)"),
            {"hid": f"holding_{uuid4()}", "iid": investor_id, "sym": symbol, "q": qty, "a": price},
        )


def _record_txn(session, investor_id: str, symbol: str, txn_type: str,
                qty: int, price: float, realized_pnl=None) -> str:
    txn_id = f"txn_{uuid4()}"
    session.execute(
        text(
            "INSERT INTO transaction "
            "(transaction_id, investor_id, symbol, transaction_type, quantity, price, total_amount, transaction_date, realized_pnl) "
            "VALUES (:tid, :iid, :sym, :type, :q, :p, :t, :dt, :pnl)"
        ),
        {
            "tid": txn_id, "iid": investor_id, "sym": symbol, "type": txn_type,
            "q": qty, "p": round(price, 4), "t": round(price * qty, 2),
            "dt": datetime.now(_SGT), "pnl": realized_pnl,
        },
    )
    return txn_id


def _advance_order(session, order_id: str, fill_qty: int):
    session.execute(
        text(
            "UPDATE order_book "
            "SET filled_quantity = filled_quantity + :fq, "
            "    status = CASE WHEN filled_quantity + :fq >= quantity THEN 'filled' ELSE 'partial' END "
            "WHERE order_id = :oid"
        ),
        {"fq": fill_qty, "oid": order_id},
    )


# ── public entry point ─────────────────────────────────────────────────────────

def submit_order(user_id: str, symbol: str, order_type: str, quantity: int, limit_price: float) -> dict:
    symbol = symbol.upper()

    # ── 1. Resolve investor ──────────────────────────────────────────────────
    investor = Investor.getInvestorByUserId(user_id)
    if not investor:
        return {"success": False, "message": "Investor not found"}
    investor_id = investor["investor_id"]

    # ── 2. Pre-flight validation ─────────────────────────────────────────────
    if order_type == "buy":
        gross = round(limit_price * quantity, 2)
        # The commission is charged on top of the buy, so the investor must be
        # able to cover both — otherwise the fill succeeds and the fee then
        # can't be collected.
        est_fee = calculate_platform_fee(gross)
        needed = round(gross + est_fee, 2)
        if investor["assets"] < needed:
            return {
                "success": False,
                "message": (
                    f"Insufficient funds — need ${needed:,.2f} "
                    f"(${gross:,.2f} + ${est_fee:,.2f} platform fee), "
                    f"have ${investor['assets']:,.2f}"
                ),
            }
    else:
        holding = Holding.getHolding(investor_id, symbol)
        have = holding["quantity"] if holding else 0
        if have < quantity:
            return {
                "success": False,
                "message": f"Insufficient shares — need {quantity}, have {have}",
            }

    # ── 3. Persist order ─────────────────────────────────────────────────────
    order_id = OrderBook.create(investor_id, symbol, order_type, quantity, limit_price)

    fills = []
    remaining = quantity
    counterpart_type = "sell" if order_type == "buy" else "buy"
    # Every investor whose holdings/realized P&L changed in this call — each
    # gets an expert-eligibility check after the order settles (buys can push
    # distinct-stock count over the line, sells can push profit margin over it).
    affected_investor_ids = {investor_id}

    # ── 4. Price-Time Priority matching ──────────────────────────────────────
    counterparts = OrderBook.get_counterpart_orders(symbol, counterpart_type, limit_price)

    for cp in counterparts:
        if remaining == 0:
            break
        if cp["investor_id"] == investor_id:
            continue                               # skip self-match

        fill_qty = min(remaining, cp["remaining"])
        fill_price = cp["price"]                  # maker's price

        with get_session() as session:
            if order_type == "buy":
                ok = _buy_shares(session, investor_id, symbol, fill_qty, fill_price)
                if not ok:
                    break
                _record_txn(session, investor_id, symbol, "buy", fill_qty, fill_price)

                pnl = _sell_shares(session, cp["investor_id"], symbol, fill_qty, fill_price)
                if pnl is not None:
                    _record_txn(session, cp["investor_id"], symbol, "sell", fill_qty, fill_price, pnl)
            else:
                pnl = _sell_shares(session, investor_id, symbol, fill_qty, fill_price)
                if pnl is None:
                    break
                _record_txn(session, investor_id, symbol, "sell", fill_qty, fill_price, pnl)

                ok = _buy_shares(session, cp["investor_id"], symbol, fill_qty, fill_price)
                if ok:
                    _record_txn(session, cp["investor_id"], symbol, "buy", fill_qty, fill_price)

            _advance_order(session, order_id, fill_qty)
            _advance_order(session, cp["order_id"], fill_qty)

        fills.append({
            "source": "investor_match",
            "qty": fill_qty,
            "price": fill_price,
            "matched_order": cp["order_id"],
        })
        affected_investor_ids.add(cp["investor_id"])
        remaining -= fill_qty

    # ── 5. Market Maker fills remainder ──────────────────────────────────────
    if remaining > 0:
        live_price = get_live_price(symbol)
        if live_price:
            fill_price = round(live_price, 4)
            with get_session() as session:
                if order_type == "buy":
                    ok = _buy_shares(session, investor_id, symbol, remaining, fill_price)
                    if ok:
                        _record_txn(session, investor_id, symbol, "buy", remaining, fill_price)
                        _advance_order(session, order_id, remaining)
                        fills.append({"source": "market_maker", "qty": remaining, "price": fill_price})
                        remaining = 0
                else:
                    pnl = _sell_shares(session, investor_id, symbol, remaining, fill_price)
                    if pnl is not None:
                        _record_txn(session, investor_id, symbol, "sell", remaining, fill_price, pnl)
                        _advance_order(session, order_id, remaining)
                        fills.append({"source": "market_maker", "qty": remaining, "price": fill_price})
                        remaining = 0

    # ── 6. Platform commission ───────────────────────────────────────────────
    # Charged ONCE per order on the total executed value, not per fill —
    # otherwise an order broken into three fills would pay the $4 minimum
    # three times. Only the order initiator is charged; a resting order that
    # gets hit is not separately commissioned.
    total_filled = quantity - remaining
    executed_value = round(sum(f["qty"] * f["price"] for f in fills), 2)
    platform_fee = 0.0
    if executed_value > 0:
        with get_session() as session:
            platform_fee = _charge_platform_fee(
                session, investor_id, user_id, executed_value,
                symbol, order_type, order_id,
            )

    # ── 7. Build summary ─────────────────────────────────────────────────────
    avg_price = (
        round(sum(f["qty"] * f["price"] for f in fills) / total_filled, 4)
        if total_filled > 0 else None
    )
    final_status = "filled" if remaining == 0 else ("partial" if total_filled > 0 else "pending")

    updated = Investor.getInvestorByUserId(user_id)

    if avg_price:
        message = (
            f"{total_filled}/{quantity} shares {order_type} filled @ avg "
            f"${avg_price:.2f} — platform fee ${platform_fee:,.2f}"
        )
    else:
        message = "Order pending"

    # ── 8. Expert-eligibility notification ───────────────────────────────────
    # Best-effort — must never fail the trade itself.
    if total_filled > 0:
        try:
            for affected_id in affected_investor_ids:
                affected_user_id = (
                    user_id if affected_id == investor_id
                    else Investor.getUserIdByInvestorId(affected_id)
                )
                if affected_user_id:
                    Investor.check_and_notify_expert_eligibility(affected_user_id)
        except Exception as e:
            print(f"[EXPERT-ELIGIBILITY] Notification check failed: {e}")

    return {
        "success": True,
        "order_id": order_id,
        "status": final_status,
        "symbol": symbol,
        "order_type": order_type,
        "quantity": quantity,
        "filled": total_filled,
        "remaining": remaining,
        "avg_fill_price": avg_price,
        "fills": fills,
        "executed_value": executed_value,
        "platform_fee": platform_fee,
        # What actually left (buy) or landed in (sell) the account, fee included.
        "net_amount": round(
            executed_value + platform_fee if order_type == "buy"
            else executed_value - platform_fee, 2),
        "assets": updated["assets"] if updated else None,
        "message": message,
    }
