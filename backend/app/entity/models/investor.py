from sqlalchemy import Column, ForeignKey, String, Float
from app.entity.models.useraccount import UserAccount
from app.entity.database.base import Base
from app.entity.database.session import get_session

from uuid import uuid4


class Investor(Base):
    __tablename__ = 'investor'

    user_id = Column(String(50), ForeignKey(
        "user_account.user_id"), nullable=False)
    investor_id = Column(String(50), primary_key=True,
                         default=lambda: f"investor_{uuid4()}")
    interests = Column(String(255), nullable=True)
    risk_tolerance = Column(String(30), nullable=True)
    paper_money = Column(Float, default=2000)
    used_amount = Column(Float, default=0)
    investor_subscription_status = Column(String(20), default="inactive")

    @staticmethod
    def createAccount(username, email_address) -> bool:
        user_id = UserAccount.createAccount(
            username=username,
            email_address=email_address,
            profile_name="investor"
        )
        if not user_id or isinstance(user_id, str) and user_id.startswith("duplicate"):
            return user_id
        try:
            with get_session() as session:
                investor = Investor(
                    user_id=user_id,

                )
                session.add(investor)
                # get_session() handles commit automatically
            print("INVESTOR CREATED")
            return user_id
        except Exception as e:
            print("INVESTOR ERROR:", e)
            return False

    @staticmethod
    def getInvestorByUserId(user_id):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return None
            return {
                "investor_id": investor.investor_id,
                "user_id": investor.user_id,
                "interests": investor.interests,
                "risk_tolerance": investor.risk_tolerance,
                "paper_money": investor.paper_money,
                "used_amount": investor.used_amount,
                "investor_subscription_status": investor.investor_subscription_status
            }

    @staticmethod
    def get_investor_information(user_id):
        user = UserAccount.get_user_information(user_id)
        if not user:
            return None
        investor = Investor.getInvestorByUserId(user_id)  # now returns dict
        if not investor:
            return None
        return {
            **user,
            "role": "investor",
            "investor_id": investor["investor_id"],
            "interests": investor["interests"],
            "risk_tolerance": investor["risk_tolerance"],
            "paper_money": investor["paper_money"],
            "used_amount": investor["used_amount"],
            "investor_subscription_status": investor["investor_subscription_status"]
        }

    @staticmethod
    def buyStock(user_id, symbol, quantity, price):
        """
        Deduct cost from paper_money, increase used_amount, add shares to holding,
        and record the transaction. Returns dict with success flag and message.
        """
        from app.entity.models.holding import Holding
        from app.entity.models.transaction import Transaction

        if quantity <= 0 or price <= 0:
            return {"success": False, "message": "Invalid quantity or price"}

        total_cost = round(price * quantity, 2)

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}

            if investor.paper_money < total_cost:
                return {"success": False, "message": "Insufficient paper funds"}

            investor.paper_money -= total_cost
            investor.used_amount += total_cost
            investor_id = investor.investor_id
            session.flush()

            new_balance = investor.paper_money

        Holding.addShares(investor_id, symbol, quantity, price)
        transaction_id = Transaction.createTransaction(
            investor_id, symbol, "buy", quantity, price, total_cost
        )

        return {
            "success": True,
            "message": "Buy order executed successfully",
            "transaction_id": transaction_id,
            "paper_money": new_balance,
            "total_amount": total_cost
        }

    @staticmethod
    def sellStock(user_id, symbol, quantity, price):
        """
        Remove shares from holding, credit proceeds to paper_money,
        decrease used_amount, and record the transaction.
        """
        from app.entity.models.holding import Holding
        from app.entity.models.transaction import Transaction

        if quantity <= 0 or price <= 0:
            return {"success": False, "message": "Invalid quantity or price"}

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}

            investor_id = investor.investor_id

        existing_holding = Holding.getHolding(investor_id, symbol)
        if not existing_holding or existing_holding["quantity"] < quantity:
            return {"success": False, "message": "Not enough shares to sell"}

        total_proceeds = round(price * quantity, 2)
        cost_basis = round(existing_holding["average_cost"] * quantity, 2)

        removed = Holding.removeShares(investor_id, symbol, quantity)
        if not removed:
            return {"success": False, "message": "Not enough shares to sell"}

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            investor.paper_money += total_proceeds
            investor.used_amount -= cost_basis
            if investor.used_amount < 0:
                investor.used_amount = 0
            session.flush()
            new_balance = investor.paper_money

        transaction_id = Transaction.createTransaction(
            investor_id, symbol, "sell", quantity, price, total_proceeds
        )

        return {
            "success": True,
            "message": "Sell order executed successfully",
            "transaction_id": transaction_id,
            "paper_money": new_balance,
            "total_amount": total_proceeds
        }

    @staticmethod
    def getPortfolio(user_id):
        from app.entity.models.holding import Holding

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return None
            investor_id = investor.investor_id
            paper_money = investor.paper_money
            used_amount = investor.used_amount

        holdings = Holding.getHoldingsByInvestor(investor_id)

        return {
            "paper_money": paper_money,
            "used_amount": used_amount,
            "holdings": holdings
        }

    @staticmethod
    def deleteInvestor(user_id):
        from app.entity.models.subscription import Subscription
        from app.entity.models.watchlist import Watchlist
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False

            # 1. Delete subscriptions (child of investor)
            session.query(Subscription).filter(
                Subscription.investor_id == investor.investor_id
            ).delete()
            # 2. Delete watchlist row
            session.query(Watchlist).filter(
                Watchlist.investor_id == investor.investor_id
            ).delete()

            # 3. Delete investor row (child of user_account)
            session.delete(investor)
            session.flush()

            # 4. Delete user_account row
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()
            if user:
                session.delete(user)
            return True

    @staticmethod
    def addPaperMoney(user_id, amount):
        MAX_BALANCE = 10000.0
        if amount <= 0:
            return {"success": False, "message": "Amount must be greater than 0"}
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}
            if investor.investor_subscription_status != "premium":
                return {"success": False, "message": "Premium subscription required"}
            new_balance = round(investor.paper_money + amount, 2)
            if new_balance > MAX_BALANCE:
                return {"success": False, "message": f"Balance cannot exceed ${MAX_BALANCE:,.0f}"}
            investor.paper_money = new_balance
            return {"success": True, "paper_money": new_balance}

    @staticmethod
    def update_investor_stock_level(user_id, stock_level):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            investor.stock_interest = stock_level
            return True

    @staticmethod
    def updateInterests(user_id, interests: str):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            investor.interests = interests
            return True

    @staticmethod
    def updateRiskTolerance(user_id, risk_tolerance: str):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            investor.risk_tolerance = risk_tolerance
            return True


def seed_investor_account():
    Investor.createAccount(
        username="Kim",
        email_address="kim@gmail.com",
    )
