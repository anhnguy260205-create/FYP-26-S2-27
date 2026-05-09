from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Boolean
from app.entity.database.base import Base
from datetime import datetime

class UserProfile(Base):
    __tablename__ = "user_profiles"
    profile_id = Column(String, primary_key=True, index=True)
    profile_name = Column(String, nullable=False)
    status= Column(String, default="active")
    description = Column(String, nullable=True)


