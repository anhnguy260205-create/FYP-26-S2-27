from sqlalchemy import Column, ForeignKey, String, DateTime
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from app.entity.models.investor import Investor


class ExpertProfileView(Base):
    """Which expert profiles a basic investor has viewed.

    Basic plan: lifetime limit of BASIC_PROFILE_VIEW_LIMIT distinct experts
    (re-viewing an already-unlocked expert is free — one row per
    investor+expert). Premium investors, experts and admins are unlimited.
    """
    __tablename__ = "expert_profile_view"

    view_id = Column(String(50), primary_key=True,
                     default=lambda: f"profview_{uuid4()}")
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    expert_user_id = Column(String(50), nullable=False)
    first_viewed_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))

    BASIC_PROFILE_VIEW_LIMIT = 3

    @staticmethod
    def check_and_consume(user_id, expert_user_id):
        """Gate for viewing an expert profile. Viewing IS the action, so a
        new distinct expert consumes quota immediately.

        Returns {allowed, limit_reached, views_used, limit, premium}."""
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id).first()

            # Experts/admins (no investor row) and premium investors: unlimited
            if not investor or investor.investor_subscription_status == "premium":
                return {"allowed": True, "limit_reached": False,
                        "views_used": None, "limit": None, "premium": True}

            rows = session.query(ExpertProfileView).filter(
                ExpertProfileView.investor_id == investor.investor_id
            ).all()
            viewed = {r.expert_user_id for r in rows}
            limit = ExpertProfileView.BASIC_PROFILE_VIEW_LIMIT

            if expert_user_id in viewed:
                return {"allowed": True, "limit_reached": False,
                        "views_used": len(viewed), "limit": limit, "premium": False}

            if len(viewed) >= limit:
                return {"allowed": False, "limit_reached": True,
                        "views_used": len(viewed), "limit": limit, "premium": False}

            session.add(ExpertProfileView(
                investor_id=investor.investor_id,
                expert_user_id=expert_user_id))
            session.flush()
            return {"allowed": True, "limit_reached": False,
                    "views_used": len(viewed) + 1, "limit": limit, "premium": False}
