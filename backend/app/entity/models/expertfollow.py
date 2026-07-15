from sqlalchemy import Column, ForeignKey, String, DateTime, UniqueConstraint
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from app.entity.models.investor import Investor


class ExpertFollow(Base):
    """Which experts an investor follows. One row per investor+expert pair —
    powers the expert's follower count used to gate compensation eligibility.
    """
    __tablename__ = "expert_follow"
    __table_args__ = (UniqueConstraint(
        "investor_id", "expert_user_id", name="uq_expert_follow"),)

    follow_id = Column(String(50), primary_key=True,
                       default=lambda: f"followexp_{uuid4()}")
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    expert_user_id = Column(String(50), nullable=False)
    followed_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))

    @staticmethod
    def follow(user_id, expert_user_id) -> dict:
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Only investors can follow experts"}

            existing = session.query(ExpertFollow).filter(
                ExpertFollow.investor_id == investor.investor_id,
                ExpertFollow.expert_user_id == expert_user_id,
            ).first()
            if not existing:
                session.add(ExpertFollow(
                    investor_id=investor.investor_id,
                    expert_user_id=expert_user_id,
                ))
                session.flush()

            count = session.query(ExpertFollow).filter(
                ExpertFollow.expert_user_id == expert_user_id
            ).count()
            return {"success": True, "following": True, "follower_count": count}

    @staticmethod
    def unfollow(user_id, expert_user_id) -> dict:
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Only investors can unfollow experts"}

            session.query(ExpertFollow).filter(
                ExpertFollow.investor_id == investor.investor_id,
                ExpertFollow.expert_user_id == expert_user_id,
            ).delete()

            count = session.query(ExpertFollow).filter(
                ExpertFollow.expert_user_id == expert_user_id
            ).count()
            return {"success": True, "following": False, "follower_count": count}

    @staticmethod
    def is_following(user_id, expert_user_id) -> bool:
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            return session.query(ExpertFollow).filter(
                ExpertFollow.investor_id == investor.investor_id,
                ExpertFollow.expert_user_id == expert_user_id,
            ).first() is not None

    @staticmethod
    def get_follower_count(expert_user_id) -> int:
        with get_session() as session:
            return session.query(ExpertFollow).filter(
                ExpertFollow.expert_user_id == expert_user_id
            ).count()
