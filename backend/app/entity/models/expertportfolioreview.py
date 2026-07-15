from sqlalchemy import Column, String, Integer, Text, DateTime, UniqueConstraint
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount


def _now():
    return datetime.now(ZoneInfo("Asia/Singapore"))


class ExpertPortfolioReview(Base):
    """A rating + written review left on a specific expert's portfolio.

    Any signed-in user (investor or expert) may review another expert's
    portfolio, except their own. One review per reviewer per expert —
    resubmitting updates the existing row rather than creating a new one.
    """
    __tablename__ = "expert_portfolio_review"
    __table_args__ = (UniqueConstraint(
        "reviewer_user_id", "expert_user_id", name="uq_portfolio_review"),)

    review_id = Column(String(50), primary_key=True,
                       default=lambda: f"pfreview_{uuid4()}")
    reviewer_user_id = Column(String(50), nullable=False)
    expert_user_id = Column(String(50), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now)

    @staticmethod
    def _reviewer_name(session, user_id):
        user = session.query(UserAccount).filter(UserAccount.user_id == user_id).first()
        return (user.full_name or user.username) if user else "RocketTrade User"

    @staticmethod
    def _serialise(review, reviewer_name=None):
        return {
            "review_id": review.review_id,
            "reviewer_user_id": review.reviewer_user_id,
            "reviewer_name": reviewer_name,
            "expert_user_id": review.expert_user_id,
            "rating": review.rating,
            "comment": review.comment or "",
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "updated_at": review.updated_at.isoformat() if review.updated_at else None,
        }

    @staticmethod
    def _stats(session, expert_user_id):
        reviews = session.query(ExpertPortfolioReview).filter(
            ExpertPortfolioReview.expert_user_id == expert_user_id
        ).all()
        total = len(reviews)
        average = round(sum(r.rating for r in reviews) / total, 2) if total else 0.0
        return {"average": average, "total": total}

    @staticmethod
    def get_stats(expert_user_id) -> dict:
        with get_session() as session:
            return ExpertPortfolioReview._stats(session, expert_user_id)

    @staticmethod
    def create_or_update(user_id, expert_user_id, rating, comment) -> dict:
        if str(user_id) == str(expert_user_id):
            return {"success": False, "message": "You cannot review your own portfolio"}

        rating = max(1, min(5, int(rating)))

        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == expert_user_id
            ).first()
            if not expert:
                return {"success": False, "message": "Expert not found"}

            review = session.query(ExpertPortfolioReview).filter(
                ExpertPortfolioReview.reviewer_user_id == user_id,
                ExpertPortfolioReview.expert_user_id == expert_user_id,
            ).first()
            if review:
                review.rating = rating
                review.comment = (comment or "").strip()[:1000]
                review.updated_at = _now()
            else:
                review = ExpertPortfolioReview(
                    reviewer_user_id=user_id,
                    expert_user_id=expert_user_id,
                    rating=rating,
                    comment=(comment or "").strip()[:1000],
                )
                session.add(review)
            session.flush()

            stats = ExpertPortfolioReview._stats(session, expert_user_id)
            return {
                "success": True,
                "review": ExpertPortfolioReview._serialise(
                    review, ExpertPortfolioReview._reviewer_name(session, user_id)),
                "stats": stats,
            }

    @staticmethod
    def delete(user_id, expert_user_id) -> dict:
        with get_session() as session:
            review = session.query(ExpertPortfolioReview).filter(
                ExpertPortfolioReview.reviewer_user_id == user_id,
                ExpertPortfolioReview.expert_user_id == expert_user_id,
            ).first()
            if not review:
                return {"success": False, "message": "Review not found"}
            session.delete(review)
            session.flush()

            stats = ExpertPortfolioReview._stats(session, expert_user_id)
            return {"success": True, "stats": stats}

    @staticmethod
    def list_for_expert(expert_user_id, viewer_user_id=None, page=1, page_size=10) -> dict:
        with get_session() as session:
            q = session.query(ExpertPortfolioReview).filter(
                ExpertPortfolioReview.expert_user_id == expert_user_id
            ).order_by(ExpertPortfolioReview.updated_at.desc())

            total = q.count()
            rows = q.offset((page - 1) * page_size).limit(page_size).all()
            reviews = [
                ExpertPortfolioReview._serialise(
                    r, ExpertPortfolioReview._reviewer_name(session, r.reviewer_user_id))
                for r in rows
            ]

            my_review = None
            if viewer_user_id:
                mine = session.query(ExpertPortfolioReview).filter(
                    ExpertPortfolioReview.reviewer_user_id == viewer_user_id,
                    ExpertPortfolioReview.expert_user_id == expert_user_id,
                ).first()
                if mine:
                    my_review = ExpertPortfolioReview._serialise(
                        mine, ExpertPortfolioReview._reviewer_name(session, viewer_user_id))

            stats = ExpertPortfolioReview._stats(session, expert_user_id)
            return {
                "success": True,
                "reviews": reviews,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": max(1, -(-total // page_size)),
                "stats": stats,
                "my_review": my_review,
            }
