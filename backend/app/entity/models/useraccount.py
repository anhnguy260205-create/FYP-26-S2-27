from sqlalchemy import Float, Column, ForeignKey, Integer, String, DateTime, Boolean, text
from app.entity.database.base import Base
from datetime import datetime
from uuid import uuid4
from app.entity.models.userprofile import UserProfile
from zoneinfo import ZoneInfo

datetime.now(ZoneInfo("Asia/Singapore"))

from app.entity.database.session import session


class UserAccount(Base):
    __tablename__ = "user_account"
    user_id = Column(String(50), primary_key=True, default= lambda: f"user_{uuid4()}")
    profile_id = Column(String(50), ForeignKey("user_profiles.profile_id"), nullable=True)
    username = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(Integer, unique=True, nullable=False)
    address = Column(String(255), nullable=False)
    email_address = Column(String(255), unique=True, nullable=False)
    account_status = Column(String(20), default="active")
    join_date = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    last_login = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    @staticmethod 
    def createAccount(username, full_name, email_address, password, phone_number, address)-> bool:
        # Check duplication 
        existing_user = session.query(UserAccount).filter(
            (UserAccount.username == username) | 
            (UserAccount.email_address == email_address) | 
            (UserAccount.phone_number == phone_number)
        ).first()
        if existing_user: 
            return False 
        new_user = UserAccount(
            username=username,
            full_name=full_name,
            email_address=email_address,
            password=password,
            phone_number=phone_number,
            address=address,
            account_status="active",
            is_active=True
        )
        session.add(new_user)
        session.commit()
        return new_user.user_id

