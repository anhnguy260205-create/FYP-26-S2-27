from sqlalchemy import Column, String, DateTime, UniqueConstraint
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from app.entity.models.expert import Expert


class ExpertFollow(Base):
    """Who follows which expert. Any signed-in user (investor or expert) may
    follow an expert, except themselves — powers the expert's follower count
    used to gate compensation eligibility.
    """
    __tablename__ = "expert_follow"
    __table_args__ = (UniqueConstraint(
        "follower_user_id", "expert_user_id", name="uq_expert_follow_user"),)

    follow_id = Column(String(50), primary_key=True,
                       default=lambda: f"followexp_{uuid4()}")
    follower_user_id = Column(String(50), nullable=False)
    expert_user_id = Column(String(50), nullable=False)
    followed_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))

    @staticmethod
    def follow(user_id, expert_user_id) -> dict:
        if str(user_id) == str(expert_user_id):
            return {"success": False, "message": "You cannot follow yourself"}

        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == expert_user_id
            ).first()
            if not expert:
                return {"success": False, "message": "Expert not found"}

            existing = session.query(ExpertFollow).filter(
                ExpertFollow.follower_user_id == user_id,
                ExpertFollow.expert_user_id == expert_user_id,
            ).first()
            if not existing:
                session.add(ExpertFollow(
                    follower_user_id=user_id,
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
            session.query(ExpertFollow).filter(
                ExpertFollow.follower_user_id == user_id,
                ExpertFollow.expert_user_id == expert_user_id,
            ).delete()

            count = session.query(ExpertFollow).filter(
                ExpertFollow.expert_user_id == expert_user_id
            ).count()
            return {"success": True, "following": False, "follower_count": count}

    @staticmethod
    def is_following(user_id, expert_user_id) -> bool:
        with get_session() as session:
            return session.query(ExpertFollow).filter(
                ExpertFollow.follower_user_id == user_id,
                ExpertFollow.expert_user_id == expert_user_id,
            ).first() is not None

    @staticmethod
    def get_follower_count(expert_user_id) -> int:
        with get_session() as session:
            return session.query(ExpertFollow).filter(
                ExpertFollow.expert_user_id == expert_user_id
            ).count()
