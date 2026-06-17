from sqlalchemy import Column, String, Text, DateTime
from app.entity.database.base import Base
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


class InvestmentArticle(Base):
    __tablename__ = "investment_articles"

    article_id = Column(String(50), primary_key=True, default=lambda: f"article_{uuid4()}")
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(20), default="draft")
    author = Column(String(100), default="Admin")
    date_published = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))