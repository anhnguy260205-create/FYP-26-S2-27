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
    stock_level = Column(String(20), default="beginner")
    paper_money = Column(Float, default=2000)
    used_amount = Column(Float, default=0)
    investor_subscription_status = Column(String(20), default="inactive")

    @staticmethod
    def createAccount(username, full_name, email_address, password, phone_number, address, stock_level) -> bool:
        user_id = UserAccount.createAccount(
            username=username,
            full_name=full_name,
            email_address=email_address,
            password=password,
            phone_number=phone_number,
            address=address,
            profile_name="investor"
        )
        if user_id == False:
            return False
        try:
            with get_session() as session:
                investor = Investor(
                    user_id=user_id,
                    stock_level=stock_level,
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
                "stock_level": investor.stock_level,
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
            "investor_id": investor["investor_id"],
            "stock_level": investor["stock_level"],
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
    def update_investor_stock_level(user_id, stock_level):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            investor.stock_level = stock_level
            return True


def seed_investor_account():
    Investor.createAccount(
        username="Kim",
        full_name="Nguy Kim Anh",
        email_address="kim@gmail.com",
        password="password",
        phone_number=12343243,
        address="123 Kim Street",
        stock_level="Basic"
    )


def seed_premium_investor_account():
    """Create/upgrade a demo Premium investor account for dashboard testing.

    Login:
      username: premium
      password: premium123
    """
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo
    from uuid import uuid4
    from app.entity.models.subscription import Subscription
    from app.entity.models.userprofile import UserProfile

    with get_session() as session:
        user = session.query(UserAccount).filter(
            (UserAccount.username == "premium") |
            (UserAccount.email_address == "premium@gmail.com")
        ).first()

        if not user:
            profile_id = UserProfile.get_or_create("investor")
            user = UserAccount(
                username="premium",
                full_name="Premium Investor",
                email_address="premium@gmail.com",
                password="premium123",
                phone_number="99999999",
                address="123 Premium Street",
                profile_id=profile_id,
                account_status="active",
                is_active=False,
            )
            session.add(user)
            session.flush()

        investor = session.query(Investor).filter(Investor.user_id == user.user_id).first()
        if not investor:
            investor = Investor(
                user_id=user.user_id,
                stock_level="Advanced",
                paper_money=100000,
                used_amount=0,
                investor_subscription_status="premium",
            )
            session.add(investor)
            session.flush()
        else:
            investor.stock_level = investor.stock_level or "Advanced"
            investor.investor_subscription_status = "premium"
            investor.paper_money = max(float(investor.paper_money or 0), 100000)
            session.flush()

        active_sub = session.query(Subscription).filter(
            Subscription.investor_id == investor.investor_id,
            Subscription.sub_status == "active",
        ).first()

        if active_sub:
            active_sub.plan_type = "premium"
            active_sub.sub_renewal_date = datetime.now(ZoneInfo("Asia/Singapore")) + timedelta(days=365)
        else:
            session.add(Subscription(
                transaction_id=f"seed_premium_{uuid4()}",
                plan_type="premium",
                investor_id=investor.investor_id,
                sub_status="active",
                sub_renewal_date=datetime.now(ZoneInfo("Asia/Singapore")) + timedelta(days=365),
            ))

        print("PREMIUM INVESTOR READY: username=premium password=premium123")
        return user.user_id
