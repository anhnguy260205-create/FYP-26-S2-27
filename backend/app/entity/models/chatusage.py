from sqlalchemy import Column, ForeignKey, String, DateTime
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from app.entity.models.investor import Investor


class ChatUsage(Base):
    
    __tablename__ = "chat_usage"

    usage_id = Column(String(50), primary_key=True,
                      default=lambda: f"chatuse_{uuid4()}")
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    asked_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))

    BASIC_CHAT_LIMIT = 3

    @staticmethod
    def _investor_state(session, user_id):
        investor = session.query(Investor).filter(
            Investor.user_id == user_id).first()
        if not investor:
            return None, 0
        used = session.query(ChatUsage).filter(
            ChatUsage.investor_id == investor.investor_id).count()
        return investor, used

    @staticmethod
    def check(user_id):
        with get_session() as session:
            investor, used = ChatUsage._investor_state(session, user_id)
            if not investor or investor.investor_subscription_status == "premium":
                return {"allowed": True, "limit_reached": False,
                        "questions_used": None, "limit": None}
            limit = ChatUsage.BASIC_CHAT_LIMIT
            if used < limit:
                return {"allowed": True, "limit_reached": False,
                        "questions_used": used, "limit": limit}
            return {"allowed": False, "limit_reached": True,
                    "questions_used": used, "limit": limit}

    @staticmethod
    def record_question(user_id):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id).first()
            if not investor or investor.investor_subscription_status == "premium":
                return {"questions_used": None, "limit": None}
            session.add(ChatUsage(investor_id=investor.investor_id))
            session.flush()
            used = session.query(ChatUsage).filter(
                ChatUsage.investor_id == investor.investor_id).count()
            return {"questions_used": used, "limit": ChatUsage.BASIC_CHAT_LIMIT}

    @staticmethod
    def get_usage(user_id):
        with get_session() as session:
            investor, used = ChatUsage._investor_state(session, user_id)
            if not investor or investor.investor_subscription_status == "premium":
                return {"questions_used": None, "limit": None, "premium": True}
            return {"questions_used": used,
                    "limit": ChatUsage.BASIC_CHAT_LIMIT,
                    "premium": False}
