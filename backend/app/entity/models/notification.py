from sqlalchemy import BOOLEAN, Column, Integer, String, DateTime
from app.entity.database.base import Base
from zoneinfo import ZoneInfo
from datetime import datetime


class Notification(Base):
    __tablename__ = "notification"

    notification_id = Column(Integer, primary_key=True)
    user_id = Column(String(50), nullable=False, index=True)

    type = Column(String(30), nullable=False, default="general")
    title = Column(String(200), nullable=False)
    message = Column(String(500), nullable=False)

    is_unread = Column(BOOLEAN, default=True)
    broadcast_id = Column(Integer, nullable=True, index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")), nullable=True)


class NotificationBroadcast(Base):
    """Log of admin broadcast actions — one row per Send, regardless of recipient count."""
    __tablename__ = "notification_broadcast"

    broadcast_id = Column(Integer, primary_key=True)
    sent_by = Column(String(50), nullable=True)
    audience = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(String(500), nullable=False)
    recipient_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")), nullable=True)
