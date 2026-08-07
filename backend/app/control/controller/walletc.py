"""
Cash in / cash out — SANDBOX ONLY.

No money actually moves. The user supplies a bank name, an account number and
an amount; we adjust assets immediately and write a WalletTransaction so
it appears in the Transaction Portal. There is no payment rail, no clearing
delay and no admin approval step.

Account numbers are masked before storage (last 4 digits only). Even in a
sandbox there's no reason to keep full numbers at rest.
"""
import re
from sqlalchemy import text

from app.entity.database.session import get_session
from app.entity.models.investor import Investor
from app.entity.models.wallet import (
    WalletTransaction, TXN_CASH_IN, TXN_CASH_OUT,
)
from app.control.controller.notificationc import create_notification

# Sandbox guard rails — keep demo data plausible and stop a typo from
# minting a fortune.
MIN_CASH_IN = 10.00
MAX_CASH_IN = 100_000.00
MIN_CASH_OUT = 10.00
MAX_CASH_OUT = 100_000.00

_ACCOUNT_RE = re.compile(r"^[0-9\- ]{6,24}$")


def _mask_account(account_number: str) -> str:
    digits = re.sub(r"\D", "", account_number or "")
    if len(digits) < 4:
        return "****"
    return f"****{digits[-4:]}"


def _validate(amount, bank_name, account_number, *, minimum, maximum, label):
    """Returns an error dict, or None when the input is acceptable."""
    try:
        amount = round(float(amount), 2)
    except (TypeError, ValueError):
        return {"success": False, "message": "Amount must be a number"}

    if amount <= 0:
        return {"success": False, "message": "Amount must be greater than zero"}
    if amount < minimum:
        return {"success": False,
                "message": f"Minimum {label} is ${minimum:,.2f}"}
    if amount > maximum:
        return {"success": False,
                "message": f"Maximum {label} is ${maximum:,.2f}"}
    if not (bank_name or "").strip():
        return {"success": False, "message": "Bank name is required"}
    if not _ACCOUNT_RE.match((account_number or "").strip()):
        return {"success": False,
                "message": "Account number must be 6–24 digits"}
    return None


class CashInController:
    def deposit(self, user_id, amount, bank_name, account_number) -> dict:
        error = _validate(amount, bank_name, account_number,
                          minimum=MIN_CASH_IN, maximum=MAX_CASH_IN,
                          label="deposit")
        if error:
            return error

        amount = round(float(amount), 2)
        investor = Investor.getInvestorByUserId(user_id)
        if not investor:
            return {"success": False, "message": "Investor not found"}

        investor_id = investor["investor_id"]
        masked = _mask_account(account_number)

        with get_session() as session:
            # Compute the new balance in Python and write that exact rounded
            # value back, rather than "assets = assets + :a" -- raw SQL
            # arithmetic on a Float column lets binary rounding error
            # compound across transactions until stray cents show up.
            row = session.execute(
                text("SELECT assets FROM investor WHERE investor_id = :iid"),
                {"iid": investor_id},
            ).fetchone()
            if not row:
                return {"success": False, "message": "Investor not found"}
            new_balance = round(float(row.assets) + amount, 2)
            session.execute(
                text("UPDATE investor SET assets = :bal WHERE investor_id = :iid"),
                {"bal": new_balance, "iid": investor_id},
            )

            txn_id = WalletTransaction.record(
                session, investor_id, TXN_CASH_IN, amount,
                description=f"Deposit from {bank_name.strip()}",
                bank_name=bank_name.strip(),
                account_number_masked=masked,
                balance_after=new_balance,
            )

        try:
            create_notification(
                user_id, "wallet", "Deposit successful",
                f"${amount:,.2f} has been added to your account.",
            )
        except Exception as e:
            print(f"[WALLET] deposit notification failed: {e}")

        return {
            "success": True,
            "message": f"${amount:,.2f} deposited successfully",
            "wallet_txn_id": txn_id,
            "amount": amount,
            "assets": new_balance,
        }


class CashOutController:
    def withdraw(self, user_id, amount, bank_name, account_number) -> dict:
        error = _validate(amount, bank_name, account_number,
                          minimum=MIN_CASH_OUT, maximum=MAX_CASH_OUT,
                          label="withdrawal")
        if error:
            return error

        amount = round(float(amount), 2)
        investor = Investor.getInvestorByUserId(user_id)
        if not investor:
            return {"success": False, "message": "Investor not found"}

        investor_id = investor["investor_id"]
        masked = _mask_account(account_number)

        with get_session() as session:
            # Re-read the balance inside the transaction — the value on the
            # `investor` dict above is already stale by the time we get here.
            row = session.execute(
                text("SELECT assets FROM investor WHERE investor_id = :iid"),
                {"iid": investor_id},
            ).fetchone()
            if not row:
                return {"success": False, "message": "Investor not found"}

            available = round(float(row.assets), 2)
            if available < amount:
                return {
                    "success": False,
                    "message": (
                        f"Insufficient balance — you have ${available:,.2f} "
                        f"available, requested ${amount:,.2f}"
                    ),
                }

            # Write the exact rounded value back -- see deposit() for why
            # "assets = assets - :a" isn't used here.
            new_balance = round(available - amount, 2)
            session.execute(
                text("UPDATE investor SET assets = :bal WHERE investor_id = :iid"),
                {"bal": new_balance, "iid": investor_id},
            )

            txn_id = WalletTransaction.record(
                session, investor_id, TXN_CASH_OUT, -amount,
                description=f"Withdrawal to {bank_name.strip()} {masked}",
                bank_name=bank_name.strip(),
                account_number_masked=masked,
                balance_after=new_balance,
            )

        try:
            create_notification(
                user_id, "wallet", "Withdrawal processed",
                f"${amount:,.2f} is on its way to {bank_name.strip()} {masked}.",
            )
        except Exception as e:
            print(f"[WALLET] withdrawal notification failed: {e}")

        return {
            "success": True,
            "message": f"${amount:,.2f} withdrawn successfully",
            "wallet_txn_id": txn_id,
            "amount": amount,
            "assets": new_balance,
        }


class GetWalletController:
    def get_overview(self, user_id) -> dict:
        investor = Investor.getInvestorByUserId(user_id)
        if not investor:
            return {"success": False, "message": "Investor not found"}

        investor_id = investor["investor_id"]
        return {
            "success": True,
            "assets": round(float(investor["assets"] or 0), 2),
            "totals": WalletTransaction.get_totals(investor_id),
            "transactions": WalletTransaction.get_for_investor(investor_id, limit=100),
            "limits": {
                "min_cash_in": MIN_CASH_IN,
                "max_cash_in": MAX_CASH_IN,
                "min_cash_out": MIN_CASH_OUT,
                "max_cash_out": MAX_CASH_OUT,
            },
        }
