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
    username = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, nullable=False)
    address = Column(String(255), nullable=False)
    email_address = Column(String(255), unique=True, nullable=False)
    account_status = Column(String(20), default="active")
    join_date = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))
    last_login = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))
    password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False)
    profile = relationship("UserProfile", back_populates="users")

    @staticmethod
    def createAccount(username, full_name, email_address, password, phone_number, address, profile_name):
        with get_session() as session:
            existing_user = session.query(UserAccount).filter(
                (UserAccount.username == username) |
                (UserAccount.email_address == email_address)
            ).first()
            if existing_user:
                return False

            try:
                profile_id = UserProfile.get_or_create(profile_name)
                new_user = UserAccount(
                    username=username,
                    full_name=full_name,
                    email_address=email_address,
                    password=password,
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
    def login(username, password) -> dict:
        from app.entity.models.expert import Expert
        from app.entity.models.investor import Investor

        with get_session() as session:
            matching_account = session.query(UserAccount).options(
                joinedload(UserAccount.profile)
            ).filter(
                (UserAccount.username == username) &
                (UserAccount.password == password)
            ).first()

            if not matching_account:
                return {"success": False}

            # Update last login and active status
            matching_account.last_login = datetime.now(
                ZoneInfo("Asia/Singapore"))
            matching_account.is_active = True
            matching_account.account_status = "active"

            profile_name = matching_account.profile.profile_name if matching_account.profile else None

            investor = session.query(Investor).filter(
                Investor.user_id == matching_account.user_id).first()
            expert = session.query(Expert).filter(
                Expert.user_id == matching_account.user_id).first()

            # Determine role
            if investor:
                role = "investor"
            elif expert:
                role = "expert"
            elif profile_name == "admin":
                role = "admin"
            else:
                role = profile_name or "unknown"

            return {
                "success": True,
                "user": {
                    "user_id": matching_account.user_id,
                    "username": matching_account.username,
                    "full_name": matching_account.full_name,
                    "email": matching_account.email_address,
                    "role": role,
                    "subscription_status": investor.investor_subscription_status if investor else "inactive"
                }
            }

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
                "email": user.email_address,
                "phone_number": user.phone_number,
                "address": user.address,
                "join_date": user.join_date,
                "account_status": user.account_status,
                "password": user.password
            }

    @staticmethod
    def emailExists(email_address) -> bool:
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.email_address == email_address).first()
            return user is not None

    @staticmethod
    def resetPasswordByEmail(email_address, new_password) -> bool:
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.email_address == email_address).first()
            if not user:
                return False
            user.password = new_password
            return True

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
        username="admin",
        full_name="Admin User",
        email_address="admin@gmail.com",
        password="admin123",
        phone_number=1234567890,
        address="123 Admin Street",
        profile_name="admin"
    )


if __name__ == "__main__":
    seed_admin_account()
