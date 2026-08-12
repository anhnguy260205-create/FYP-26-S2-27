import sys

from app.entity.database.session import get_session
from app.entity.models.useraccount import UserAccount
from app.entity.models.investor import Investor

BASIC_LOT = [
    ("AAPL", 3, 180.0), ("MSFT", 2, 400.0), ("NVDA", 4, 120.0),
    ("TSLA", 2, 250.0), ("GOOGL", 3, 170.0), ("KO", 10, 60.0),
    ("AMZN", 2, 190.0),
]

EXTRA_LOT = [
    ("META", 1, 480.0), ("NFLX", 1, 600.0), ("AMD", 3, 160.0),
    ("ORCL", 2, 140.0), ("CRM", 1, 270.0), ("ADBE", 1, 500.0),
    ("QCOM", 2, 170.0), ("AVGO", 1, 170.0), ("MU", 3, 100.0),
    ("PLTR", 5, 25.0), ("DIS", 2, 100.0), ("NKE", 2, 90.0),
    ("MCD", 1, 290.0), ("HD", 1, 350.0), ("JPM", 1, 200.0),
    ("BAC", 4, 40.0), ("V", 1, 280.0), ("MA", 1, 450.0),
    ("XOM", 2, 110.0), ("CVX", 1, 150.0), ("COP", 1, 110.0),
    ("AMT", 1, 190.0), ("PLD", 1, 110.0), ("O", 2, 55.0),
]


def seed(email: str, all30: bool = False):
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

    lots = BASIC_LOT + (EXTRA_LOT if all30 else [])
    total_cost = sum(q * p for _, q, p in lots)

    # Top up paper money so every buy succeeds (bypasses the premium top-up
    # gate on purpose — this is a dev seeding script).
    with get_session() as session:
        investor = session.query(Investor).filter(
            Investor.user_id == user_id).first()
        needed = total_cost + 500  # keep some cash after buying
        if investor.assets < needed:
            investor.assets = needed
            print(f"[OK] Assets topped up to ${needed:,.2f}")

    bought = 0
    for symbol, qty, price in lots:
        result = Investor.buyStock(user_id, symbol, qty, price)
        if result.get("success"):
            bought += 1
            print(f"[OK] Bought {qty} x {symbol} @ ${price:.2f}")
        else:
            print(f"[SKIP] {symbol}: {result.get('message')}")

    print(f"\nDone — {bought}/{len(lots)} holdings created for {email}.")
    print("Open Portfolio Overview to see them (and publish, if expert).")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    all30 = len(sys.argv) > 2 and sys.argv[2].lower() == "all30"
    sys.exit(0 if seed(sys.argv[1], all30) else 1)
