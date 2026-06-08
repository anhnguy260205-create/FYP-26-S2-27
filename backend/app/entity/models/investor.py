from sqlalchemy import Column, ForeignKey,  String
from app.entity.models.useraccount import UserAccount
from app.entity.database.base import Base
from app.entity.database.session import session

from uuid import uuid4


class Investor(Base):
    __tablename__ = 'investor'
    super
    # Additional fields specific to Investor can be added here
    user_id = Column(String(50), ForeignKey(
        "user_account.user_id"), nullable=False)
    investor_id = Column(String(50), primary_key=True,
                         default=lambda: f"investor_{uuid4()}")
    # order_id = Column(String(50), ForeignKey("orders.order_id"), nullable=True)
    stock_level = Column(String(20), default="beginner")
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
            investor = Investor(
                user_id=user_id,
                stock_level=stock_level,
            )
            session.add(investor)
            session.commit()
            print("INVESTOR CREATED")
            return user_id
        except Exception as e:
            session.rollback()
            print("INVESTOR ERROR:", e)
            return False

    @staticmethod
    def getInvestorByUserId(user_id):
        return session.query(Investor).filter(
            Investor.user_id == user_id
        ).first()

    @staticmethod
    def get_investor_information(user_id):
        user = UserAccount.get_user_information(user_id)
        investor_id = Investor.getInvestorByUserId(user_id)
        if not investor_id:
            return None
        investor = session.query(Investor).filter(
            Investor.investor_id == investor_id.investor_id).first()
        return {
            **user,
            "investor_id": investor.investor_id,
            "stock_level": investor.stock_level,
            "investor_subscription_status": investor.investor_subscription_status
        }
