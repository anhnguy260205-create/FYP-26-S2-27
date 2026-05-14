from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Boolean
from app.entity.database.base import Base
from datetime import datetime
from uuid import uuid4

class UserProfile(Base):
    __tablename__ = "user_profiles"
    profile_id = Column(String(41), primary_key=True,  default= lambda: f"user_{uuid4()}")
    profile_name = Column(String(100), nullable=False)
    status = Column(String(20), default="active")
    description = Column(String(255), nullable=True)


