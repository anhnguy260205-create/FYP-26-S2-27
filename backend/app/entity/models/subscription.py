from sqlalchemy import Column, ForeignKey, String, DateTime, Boolean, Integer
from app.entity.models.investor import Investor
from app.entity.database.base import Base
from datetime import datetime, timedelta
from app.entity.database.session import get_session
from zoneinfo import ZoneInfo
from uuid import uuid4

# Revenue credited per plan, in cents — internal bookkeeping only, independent
# of what Stripe actually charges (PLAN_CONFIG in payment_service.py).
PLAN_REVENUE_CENTS = {"basic": 0, "premium": 2099}


class Subscription(Base):
    __tablename__ = "subscription"
    sub_id = Column(String(50), primary_key=True,
                    default=lambda: f"sub_{uuid4()}")
    transaction_id = Column(String(200), unique=True, nullable=False)
    plan_type = Column(String(20), default='basic')  # e.g., "basic", "premium"
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    sub_date = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))
    sub_status = Column(String(20), default="active")
    sub_renewal_date = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")), nullable=True)
    renewal_reminder_sent = Column(Boolean, default=False, nullable=False)
    amount = Column(Integer, default=0, nullable=False)  # revenue credited, in cents

    @staticmethod
    def createSubscription(transaction_id, plan_type, investor_id):
        with get_session() as session:
            if session.query(Subscription).filter(
                Subscription.transaction_id == transaction_id
            ).first():
                print("DUPLICATE TRANSACTION — already processed")
                return False

            if session.query(Subscription).filter(
                Subscription.investor_id == investor_id,
                Subscription.plan_type == plan_type,
                Subscription.sub_status == "active"
            ).first():
                print(f"ACTIVE {plan_type.upper()} SUBSCRIPTION EXISTS")
                return False

            renewal_date = (
                datetime.now(ZoneInfo("Asia/Singapore")) + timedelta(days=30)
                if plan_type == "premium"
                else None
            )

            subscription = Subscription(
                transaction_id=transaction_id,
                plan_type=plan_type,
                investor_id=investor_id,
                sub_status="active",
                sub_renewal_date=renewal_date,
                amount=PLAN_REVENUE_CENTS.get(plan_type, 0),
            )
            session.add(subscription)

            investor = session.query(Investor).filter(
                Investor.investor_id == investor_id
            ).first()
            if investor:
                investor.investor_subscription_status = plan_type

            session.flush()

            # Book the subscription into the platform revenue ledger so the
            # finance dashboard reads from ONE table instead of stitching
            # subscriptions and everything else together. Amount is stored in
            # cents here but revenue is kept in dollars.
            from app.entity.models.wallet import PlatformRevenue, REV_SUBSCRIPTION
            PlatformRevenue.record_once(
                session,
                REV_SUBSCRIPTION,
                round((subscription.amount or 0) / 100.0, 2),
                reference_id=subscription.sub_id,
                user_id=investor.user_id if investor else None,
                description=f"{plan_type.capitalize()} subscription",
            )

            print("SUBSCRIPTION CREATED")
            return subscription.sub_id

    @staticmethod
    def getLatestByInvestorId(investor_id):
        with get_session() as session:
            row = (
                session.query(Subscription)
                .filter(Subscription.investor_id == investor_id)
                .order_by(Subscription.sub_date.desc())
                .first()
            )
            if not row:
                return None
            return {
                "plan_type": row.plan_type,
                "sub_status": row.sub_status,
                "sub_date": row.sub_date.isoformat() if row.sub_date else None,
                "sub_renewal_date": row.sub_renewal_date.isoformat() if row.sub_renewal_date else None,
            }

    @staticmethod
    def getAllByInvestorId(investor_id):
        with get_session() as session:
            rows = (
                session.query(Subscription)
                .filter(Subscription.investor_id == investor_id)
                .order_by(Subscription.sub_date.desc())
                .all()
            )
            return [
                {
                    "plan_type": r.plan_type,
                    "sub_status": r.sub_status,
                    "sub_date": r.sub_date.isoformat() if r.sub_date else None,
                    "sub_renewal_date": r.sub_renewal_date.isoformat() if r.sub_renewal_date else None,
                }
                for r in rows
            ]

    @staticmethod
    def getExpiringPremium(days: int = 3):
        """Return premium subscriptions expiring within `days` days that haven't been reminded yet."""
        from app.entity.models.useraccount import UserAccount
        now = datetime.now(ZoneInfo("Asia/Singapore")).replace(tzinfo=None)
        cutoff = now + timedelta(days=days)
        with get_session() as session:
            rows = (
                session.query(Subscription, Investor, UserAccount)
                .join(Investor, Investor.investor_id == Subscription.investor_id)
                .join(UserAccount, UserAccount.user_id == Investor.user_id)
                .filter(
                    Subscription.plan_type == "premium",
                    Subscription.sub_status == "active",
                    Subscription.renewal_reminder_sent == False,
                    Subscription.sub_renewal_date != None,
                    Subscription.sub_renewal_date <= cutoff,
                )
                .all()
            )
            return [
                {
                    "sub_id": sub.sub_id,
                    "sub_renewal_date": sub.sub_renewal_date.isoformat() if sub.sub_renewal_date else None,
                    "email_address": user.email_address,
                    "username": user.username,
                }
                for sub, inv, user in rows
            ]

    @staticmethod
    def markReminderSent(sub_id: str):
        with get_session() as session:
            sub = session.query(Subscription).filter(Subscription.sub_id == sub_id).first()
            if sub:
                sub.renewal_reminder_sent = True

    @staticmethod
    def cancelSubscription(investor_id: str):
        """Cancel the active subscription. Premium cannot be cancelled — only basic."""
        with get_session() as session:
            sub = (
                session.query(Subscription)
                .filter(
                    Subscription.investor_id == investor_id,
                    Subscription.sub_status == "active",
                )
                .order_by(Subscription.sub_date.desc())
                .first()
            )
            if not sub:
                return False
            if sub.plan_type == "premium":
                return "premium_locked"

            sub.sub_status = "cancelled"
            investor = session.query(Investor).filter(
                Investor.investor_id == investor_id
            ).first()
            if investor:
                investor.investor_subscription_status = "inactive"
            return sub.plan_type
