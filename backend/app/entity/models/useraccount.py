from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Boolean
from app.entity.database.base import Base
from datetime import datetime
from uuid import uuid4

from zoneinfo import ZoneInfo
from sqlalchemy.orm import relationship

from app.entity.database.session import session
from app.entity.models.userprofile import UserProfile


class UserAccount(Base):
    __tablename__ = "user_account"
    user_id = Column(String(50), primary_key=True,
                     default=lambda: f"user_{uuid4()}")
    profile_id = Column(String(50), ForeignKey(
        "user_profiles.profile_id"), nullable=True)
    username = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(Integer, unique=True, nullable=False)
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

    # Create user account
    @staticmethod
    def createAccount(username, full_name, email_address, password, phone_number, address, profile_name):
        # Check duplication
        existing_user = session.query(UserAccount).filter(
            # Check if username, email or phone number already exists
            (UserAccount.username == username) |
            (UserAccount.email_address == email_address) |
            (UserAccount.phone_number == phone_number)
        ).first()
        if existing_user:
            return False

        try:
            profile = UserProfile.get_or_create(profile_name)
            new_user = UserAccount(
                username=username,
                full_name=full_name,
                email_address=email_address,
                password=password,
                phone_number=phone_number,
                address=address,
                profile_id=profile.profile_id,
                account_status="active",
                is_active=False
            )
            session.add(new_user)
            session.commit()
            return new_user.user_id
        except Exception as e:
            session.rollback()
            print("USER ACCOUNT ERROR:", e)
            return False

    @staticmethod
    def login(username, password) -> dict:
        # Local import to avoid circular import
        from app.entity.models.expert import Expert
        from app.entity.models.investor import Investor
        matching_account = session.query(UserAccount).filter(
            (UserAccount.username == username) &
            (UserAccount.password == password)
        ).first()

        if not matching_account:
            return {"success": False}

    # Update last login and active status
        matching_account.last_login = datetime.now(ZoneInfo("Asia/Singapore"))

        matching_account.is_active = True
        try:
            session.commit()
            session.refresh(matching_account)
        except:
            session.rollback()

    # Determine role from the connected user profile, then fall back to sub-tables.
        role = matching_account.profile.profile_name if matching_account.profile else "admin"
        investor = session.query(Investor).filter(
            Investor.user_id == matching_account.user_id).first()
        expert = session.query(Expert).filter(
            Expert.user_id == matching_account.user_id).first()
        if investor:
            role = "investor"
        elif expert:
            role = "expert"

        return {
            "success": True,
            "user": {
                "user_id": matching_account.user_id,
                "username": matching_account.username,
                "full_name": matching_account.full_name,
                "email": matching_account.email_address,
                "role": role,  # ← investor / expert / admin
                "subscription_status": investor.investor_subscription_status if investor else "inactive"
            }
        }

    @staticmethod
    def logout(user_id) -> bool:
        user = session.query(UserAccount).filter(
            UserAccount.user_id == user_id).first()
        if not user:
            return False
        # Update user status to inactive
        user.is_active = False
        try:
            session.commit()
        except:
            session.rollback()
            return False
        # For simplicity, we won't track active sessions in this example
        return True

    @staticmethod
    def get_user_information(user_id) -> dict:
        from app.entity.models.expert import Expert
        from app.entity.models.investor import Investor
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
        }
# auto generate the admin account


def seed_admin_account():
    admin_username = "admin"
    admin_email = "admin@gmail.com"
    admin_password = "admin123"
    admin_full_name = "Admin User"
    admin_phone_number = 1234567890
    admin_address = "123 Admin Street"

    # Create admin account
    user_id = UserAccount.createAccount(
        username=admin_username,
        full_name=admin_full_name,
        email_address=admin_email,
        password=admin_password,
        phone_number=admin_phone_number,
        address=admin_address,
        profile_name="admin"
    )


if __name__ == "__main__":
    seed_admin_account()
