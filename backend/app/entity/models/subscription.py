from sqlalchemy import Column, ForeignKey, String, DateTime
from app.entity.models.investor import Investor
from app.entity.database.base import Base
from datetime import datetime, timedelta
from app.entity.database.session import get_session
from zoneinfo import ZoneInfo
from uuid import uuid4


class Subscription(Base):
    __tablename__ = "subscription"
    sub_id = Column(String(50), primary_key=True,
                    default=lambda: f"sub_{uuid4()}")
    transaction_id = Column(String(50), unique=True, nullable=False)
    plan_type = Column(String(20), default='basic')  # e.g., "basic", "premium"
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    sub_date = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))
    sub_status = Column(String(20), default="active")
    sub_renewal_date = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")), nullable=True)

    @staticmethod
    def createSubscription(transaction_id, plan_type, investor_id):
        with get_session() as session:
            if plan_type == "basic":
                if session.query(Subscription).filter(
                    Subscription.investor_id == investor_id,
                    Subscription.sub_status == "active"
                ).first():
                    print("ACTIVE SUBSCRIPTION EXISTS")
                    return False

            renewal_date = (
                datetime.now(ZoneInfo("Asia/Singapore")) + timedelta(days=30)
                if plan_type == "premium"
                else None
            )

            subscription = Subscription(
                transaction_id=f"trans_{uuid4()}",
                plan_type=plan_type,
                investor_id=investor_id,
                sub_status="active",
                sub_renewal_date=renewal_date
            )

            investor = session.query(Investor).filter(
                Investor.investor_id == investor_id
            ).first()
            if investor:
                investor.investor_subscription_status = plan_type

            session.add(subscription)
            session.flush()  # get sub_id before commit
            print("SUBSCRIPTION CREATED")
            return subscription.sub_id
