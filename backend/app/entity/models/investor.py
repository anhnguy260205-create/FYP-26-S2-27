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
    def deleteInvestor(user_id):
        from app.entity.models.subscription import Subscription
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

            # 2. Delete investor row (child of user_account)
            session.delete(investor)
            session.flush()

            # 3. Delete user_account row
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
