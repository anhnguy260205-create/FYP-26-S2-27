from sqlalchemy import Column, ForeignKey, String, DateTime, Boolean
from sqlalchemy.orm import relationship, joinedload
from app.entity.database.base import Base
from datetime import datetime
from uuid import uuid4

from zoneinfo import ZoneInfo

from app.entity.database.session import get_session
from app.entity.models.userprofile import UserProfile


class UserAccount(Base):
    __tablename__ = "user_account"
    user_id = Column(String(50), primary_key=True,
                     default=lambda: f"user_{uuid4()}")
    profile_id = Column(String(50), ForeignKey(
        "user_profiles.profile_id"), nullable=True)
    username = Column(String(255), unique=True, nullable=True)
    full_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    email_address = Column(String(255), unique=True, nullable=False)
    account_status = Column(String(20), default="inactive")
    join_date = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))
    last_login = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))
    is_active = Column(Boolean, default=False)
    has_welcomed = Column(Boolean, default=False)
    profile = relationship("UserProfile", back_populates="users")

    @staticmethod
    def createAccount(email_address, profile_name, username=None, full_name=None, phone_number=None, address=None):
        with get_session() as session:
            duplicate = session.query(UserAccount).filter(
                (UserAccount.email_address == email_address) |
                (UserAccount.username == (username or email_address))
            ).first()
            if duplicate:
                if duplicate.email_address == email_address:
                    return "duplicate_email"
                return "duplicate_username"

            try:
                profile_id = UserProfile.get_or_create(profile_name)
                # auto-generate username from email if not provided
                derived_username = username or email_address
                new_user = UserAccount(
                    username=derived_username,
                    full_name=full_name,
                    email_address=email_address,
                    phone_number=phone_number,
                    address=address,
                    profile_id=profile_id,
                    account_status="active",
                    is_active=False
                )
                session.add(new_user)
                session.flush()
                return new_user.user_id
            except Exception as e:
                print("USER ACCOUNT ERROR:", e)
                raise

    @staticmethod
    def logout(user_id) -> bool:
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id).first()
            if not user:
                return False
            user.is_active = False
            user.account_status = "inactive"
            return True

    @staticmethod
    def get_user_information(user_id) -> dict:
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id).first()
            if not user:
                return None
            return {
                "user_id": user.user_id,
                "username": user.username,
                "full_name": user.full_name,
                "email_address": user.email_address,
                "phone_number": user.phone_number,
                "address": user.address,
                "join_date": user.join_date,
                "account_status": user.account_status,
            }

    @staticmethod
    def getProfileByEmail(email_address: str) -> dict:
        from app.entity.models.expert import Expert
        from app.entity.models.expertverification import ExpertVerification
        from app.entity.models.investor import Investor

        email_address = email_address.strip().lower()
        with get_session() as session:
            user = session.query(UserAccount).options(
                joinedload(UserAccount.profile)
            ).filter(UserAccount.email_address == email_address).first()

            if not user:
                return None

            user.last_login = datetime.now(ZoneInfo("Asia/Singapore"))
            user.is_active = True
            user.account_status = "active"

            first_login = not user.has_welcomed
            user.has_welcomed = True

            profile_name = user.profile.profile_name if user.profile else None
            investor = session.query(Investor).filter(
                Investor.user_id == user.user_id).first()
            expert = session.query(Expert).filter(
                Expert.user_id == user.user_id).first()

            # Merged roles: anyone with an investor OR expert row is an
            # "investor". Expert is an add-on flag (is_expert) — verified
            # experts automatically enjoy premium benefits.
            if investor or expert:
                role = "investor"
            elif profile_name == "admin":
                role = "admin"
            else:
                role = profile_name or "unknown"

            verification = (
                ExpertVerification.get_for_expert(expert.expert_id)
                if expert else None
            )
            verification_status = verification["verification_status"] if verification else None
            is_verified_expert = verification_status in ("approved", "active")

            subscription_status = investor.investor_subscription_status if investor else "inactive"
            if is_verified_expert:
                subscription_status = "premium"

            return {
                "user_id": user.user_id,
                "username": user.username,
                "full_name": user.full_name,
                "email_address": user.email_address,
                "role": role,
                # is_expert means VERIFIED expert, not merely "has applied" —
                # an Expert row exists from the moment someone applies, but
                # they must stay a plain investor (with an in-progress
                # application) until an admin approves it.
                "is_expert": is_verified_expert,
                "subscription_status": subscription_status,
                "interests": investor.interests if investor else None,
                "risk_tolerance": investor.risk_tolerance if investor else None,
                "verification_status": verification_status,
                "first_login": first_login,
            }

    @staticmethod
    def get_auth_profile(email: str) -> dict | None:
        """Lightweight lookup for auth middleware — no last_login side-effects.
        Also backs GET /user/session, which the frontend polls on every
        protected-route navigation to catch admin-side changes (e.g. an
        expert's verification being cancelled) that sessionStorage — only
        refreshed at login — would otherwise miss until the user logs out."""
        from app.entity.models.investor import Investor
        from app.entity.models.expert import Expert
        from app.entity.models.expertverification import ExpertVerification
        from sqlalchemy.orm import joinedload

        email = email.strip().lower()
        with get_session() as session:
            user = session.query(UserAccount).options(
                joinedload(UserAccount.profile)
            ).filter(UserAccount.email_address == email).first()

            if not user:
                return None

            profile_name = user.profile.profile_name if user.profile else None
            investor = session.query(Investor).filter(
                Investor.user_id == user.user_id
            ).first()
            expert = session.query(Expert).filter(
                Expert.user_id == user.user_id
            ).first()

            if investor or expert:
                role = "investor"
            elif profile_name == "admin":
                role = "admin"
            else:
                role = profile_name or "unknown"

            verification = (
                ExpertVerification.get_for_expert(expert.expert_id)
                if expert else None
            )
            verification_status = verification["verification_status"] if verification else None
            is_verified_expert = verification_status in ("approved", "active")

            subscription_status = investor.investor_subscription_status if investor else "inactive"
            if is_verified_expert:
                subscription_status = "premium"

            return {
                "user_id": user.user_id,
                "email": email,
                "role": role,
                # is_expert means VERIFIED expert — see login() above.
                "is_expert": is_verified_expert,
                "verification_status": verification_status,
                "subscription_status": subscription_status,
            }

    @staticmethod
    def emailExists(email_address) -> bool:
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.email_address == email_address).first()
            return user is not None

    @staticmethod
    def updateInformation(user_id, user_name, full_name, email_address, phone_number, address):
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id).first()
            if not user:
                return False
            if user_name:
                user.username = user_name
            if full_name:
                user.full_name = full_name
            if email_address:
                user.email_address = email_address
            if address:
                user.address = address
            if phone_number:
                user.phone_number = str(phone_number)
            return True


def seed_admin_account():
    UserAccount.createAccount(
        email_address="fyphd3009@gmail.com",
        profile_name="admin",
        username="admin",
        full_name="Admin User",
        phone_number="1234567890",
        address="123 Admin Street"
    )

def seed_hr_account():
    UserAccount.createAccount(
        email_address="fyphr123@gmail.com",
        profile_name="hr",
        username="finance_hr",
        full_name="Finance Admin User",
        phone_number="1234567890",
        address="Finance Operations Department",
    )


if __name__ == "__main__":
    seed_admin_account()
    seed_hr_account()
