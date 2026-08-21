"""
Seed enough distinct-stock trades and realized profit for an account to pass
the expert-application eligibility check (see Investor.getExpertEligibility
and POST /expert/apply in expertb.py).

Usage:
    python seed_expert_eligibility.py <email> [min_stocks] [min_margin_pct]

Defaults match the live thresholds (30 distinct stocks, 200% profit margin).
Only adds what's missing — safe to re-run on an account that's already
partway there (or already eligible, in which case it's a no-op).
"""
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.entity.database.session import get_session
from app.entity.models.useraccount import UserAccount
from app.entity.models.investor import Investor
from app.entity.models.transaction import Transaction
from app.entity.models.wallet import WalletTransaction

TZ = ZoneInfo("Asia/Singapore")

# Pool of distinct tickers to draw new trades from — comfortably larger than
# the default 30-stock requirement so there's headroom even if the account
# already holds several of these.
TICKER_POOL = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NFLX", "AMD", "INTC", "ORCL",
    "CRM", "ADBE", "PYPL", "CSCO", "QCOM", "TXN", "AVGO", "IBM", "UBER", "SHOP",
    "SQ", "SPOT", "SBUX", "NKE", "DIS", "KO", "PEP", "WMT", "COST", "JPM",
    "BAC", "V", "MA", "XOM", "CVX", "HD", "MCD", "PLTR", "MU", "T",
]

BUFFER = 1.1  # push slightly past the raw threshold so rounding never leaves it short


def seed(email: str, min_stocks: int = 30, min_margin_pct: float = 200.0):
    email = email.strip().lower()

    with get_session() as session:
        user = session.query(UserAccount).filter(
            UserAccount.email_address == email).first()
        if not user:
            print(f"[ERROR] No account found for {email}")
            return False
        user_id = user.user_id

        investor = session.query(Investor).filter(
            Investor.user_id == user_id).first()
        if not investor:
            print(f"[ERROR] {email} has no investor row")
            return False
        investor_id = investor.investor_id

    before = Investor.getExpertEligibility(user_id, min_stocks, min_margin_pct)
    print(f"[INFO] Before: {before['distinct_stocks']}/{before['required_stocks']} stocks, "
          f"{before['profit_margin']:.1f}%/{before['required_profit_margin']:.0f}% margin")
    if before["eligible"]:
        print(f"[OK] {email} is already eligible — nothing to do.")
        return True

    with get_session() as session:
        used_symbols = {
            s for (s,) in session.query(Transaction.symbol)
            .filter(Transaction.investor_id == investor_id).distinct()
        }
        totals = WalletTransaction.get_totals(investor_id)
        capital_in = round(totals["cash_in"] - totals["cash_out"], 2)

        # Profit margin is undefined (treated as 0%) with no capital deployed,
        # so make sure there's a capital base to measure the margin against.
        if capital_in <= 0:
            top_up = 10_000.0
            WalletTransaction.record(
                session, investor_id, "cash_in", top_up,
                description="Seed script: capital base for expert eligibility",
            )
            capital_in = round(capital_in + top_up, 2)
            print(f"[OK] Topped up capital base to ${capital_in:,.2f}")

        stocks_needed = max(0, min_stocks - len(used_symbols))
        new_symbols = [t for t in TICKER_POOL if t not in used_symbols][:max(stocks_needed, 1)]
        if len(new_symbols) < stocks_needed:
            print(f"[ERROR] Ticker pool exhausted — need {stocks_needed} new symbols, "
                  f"only {len(new_symbols)} available. Add more to TICKER_POOL.")
            return False

        target_profit = round(capital_in * (min_margin_pct / 100.0) * BUFFER, 2)
        current_profit = Transaction.getRealizedPnl(investor_id)
        profit_needed = max(0.0, target_profit - current_profit)
        per_trade_profit = round(profit_needed / len(new_symbols), 2) if new_symbols else 0.0

        now = datetime.now(TZ)
        for i, sym in enumerate(new_symbols):
            qty = 100
            buy_price = 50.0
            sell_price = round(buy_price + per_trade_profit / qty, 2)
            realized = round((sell_price - buy_price) * qty, 2)
            d = now - timedelta(days=len(new_symbols) - i)

            session.add(Transaction(
                investor_id=investor_id, symbol=sym, transaction_type="buy",
                quantity=qty, price=buy_price, total_amount=round(buy_price * qty, 2),
                transaction_date=d,
            ))
            session.add(Transaction(
                investor_id=investor_id, symbol=sym, transaction_type="sell",
                quantity=qty, price=sell_price, total_amount=round(sell_price * qty, 2),
                transaction_date=d + timedelta(hours=1),
                realized_pnl=realized,
            ))
        session.flush()
        print(f"[OK] Added {len(new_symbols)} buy/sell pairs "
              f"(~${profit_needed:,.2f} additional profit): {', '.join(new_symbols)}")

    after = Investor.getExpertEligibility(user_id, min_stocks, min_margin_pct)
    print(f"[INFO] After: {after['distinct_stocks']}/{after['required_stocks']} stocks, "
          f"{after['profit_margin']:.1f}%/{after['required_profit_margin']:.0f}% margin")
    print(f"\n{'[OK] Eligible' if after['eligible'] else '[WARN] Still not eligible'} "
          f"— {email} can now {'apply' if after['eligible'] else 'NOT yet apply'} via POST /expert/apply.")
    return after["eligible"]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    email_arg = sys.argv[1]
    stocks_arg = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    margin_arg = float(sys.argv[3]) if len(sys.argv) > 3 else 200.0
    sys.exit(0 if seed(email_arg, stocks_arg, margin_arg) else 1)
