from sqlalchemy import DECIMAL, BOOLEAN, Column, Integer, String, DateTime
from app.entity.database.base import Base
from zoneinfo import ZoneInfo
from datetime import datetime


class StockAlert(Base):
    __tablename__ = "stock_alert"

    alert_id = Column(Integer, primary_key=True)
    user_id = Column(String(50))
    stock_symbol = Column(String(10))

    price_above = Column(DECIMAL(10, 2))
    price_below = Column(DECIMAL(10, 2))

    increase_percent = Column(DECIMAL(5, 2))
    decrease_percent = Column(DECIMAL(5, 2))

    custom_message = Column(String(500))

    notification_email = Column(String(255))

    is_active = Column(BOOLEAN, default=True)
    is_triggered = Column(BOOLEAN, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")), nullable=True)
