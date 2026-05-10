from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Boolean
from app.entity.database.base import Base
from datetime import datetime
from uuid import uuid4


class User(Base):
    __tablename__ = "UserAccount"
    user_id = Column(String, primary_key=True)
    profile_id = Column(String, ForeignKey("user_profiles.profile_id"), nullable=False)
    username = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone_number = Column(Integer, unique=True, nullable=False)
    address = Column(String, nullable=False)
    email_address = Column(String, unique=True, nullable=False)
    account_status = Column(String, default="active")
    joined_date = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
    password = Column(String, nullable=False)
    user_role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    @staticmethod 
    def createAccount(profile_id, username, full_name, email_address, password, phone_number, address, user_role):
        new_user = User(
            user_id=str(uuid4()),
            profile_id=profile_id,
            username=username,
            full_name=full_name,
            email_address=email_address,
            password=password,
            phone_number=phone_number,
            address=address,
            user_role=user_role
        )
        return new_user

