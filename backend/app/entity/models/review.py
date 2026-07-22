from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.entity.database.base import Base
from app.entity.database.session import get_session

try:
    from zoneinfo import ZoneInfo
    def _now():
        return datetime.now(ZoneInfo("Asia/Singapore"))
except Exception:
    def _now():
        return datetime.now()


# ── Models ────────────────────────────────────────────────────────────────────

class Review(Base):
    """A platform review left by any non-admin user (basic / premium / expert)."""
    __tablename__ = "review"
    __table_args__ = (UniqueConstraint("user_id", name="uq_review_user"),)

    review_id     = Column(String(50), primary_key=True, default=lambda: f"review_{uuid4()}")
    user_id       = Column(String(50), nullable=False)
    author_name   = Column(String(100), default="RocketTrade User")
    # Snapshot of the tier at time of posting: "basic" | "premium" | "expert"
    author_role   = Column(String(20), default="basic")
    rating        = Column(Integer, nullable=False)   # 1–5
    title         = Column(String(150), nullable=True)
    comment       = Column(Text, nullable=False)
    helpful_count = Column(Integer, default=0)
    is_edited     = Column(Integer, default=0)
    created_at    = Column(DateTime, default=_now)
    updated_at    = Column(DateTime, default=_now)

    helpful_votes = relationship("ReviewHelpful", cascade="all, delete-orphan", lazy="dynamic", foreign_keys="[ReviewHelpful.review_id]")


class ReviewHelpful(Base):
    """Tracks which users marked a review as helpful — one vote per user per review."""
    __tablename__ = "review_helpful"
    __table_args__ = (UniqueConstraint("review_id", "user_id", name="uq_review_helpful"),)

    id         = Column(String(50), primary_key=True, default=lambda: f"rh_{uuid4()}")
    review_id  = Column(String(50), ForeignKey("review.review_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ReviewFlag(Base):
    """Tracks user reports on reviews — one flag per user per review."""
    __tablename__ = "review_flag"
    __table_args__ = (UniqueConstraint("review_id", "user_id", name="uq_review_flag"),)

    id         = Column(String(50), primary_key=True, default=lambda: f"rf_{uuid4()}")
    review_id  = Column(String(50), ForeignKey("review.review_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    reason     = Column(String(200), default="Inappropriate content")
    created_at = Column(DateTime, default=_now)


class ReviewRemoval(Base):
    """
    Records an admin-removed review so the original author can still see why
    their review was taken down, even after the Review row itself is deleted.
    Kept separate from Review (no FK to it) since the review no longer exists
    by the time this is queried.
    """
    __tablename__ = "review_removal"

    id             = Column(String(50), primary_key=True, default=lambda: f"rr_{uuid4()}")
    user_id        = Column(String(50), nullable=False)  # original review author
    review_title   = Column(String(200), nullable=True)
    reason         = Column(String(300), nullable=False)
    removed_at     = Column(DateTime, default=_now)
    acknowledged   = Column(Boolean, default=False)  # user has seen/dismissed the notice


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_author(session, user_id):
    """Look up display name and tier (basic/premium/expert) for a user."""
    from app.entity.models.useraccount import UserAccount
    from app.entity.models.investor import Investor
    from app.entity.models.expert import Expert

    user = session.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    name = (user.full_name or user.username) if user else "RocketTrade User"

    expert = session.query(Expert).filter(Expert.user_id == user_id).first()
    if expert:
        return name, "expert"

    investor = session.query(Investor).filter(Investor.user_id == user_id).first()
    if investor and investor.investor_subscription_status == "premium":
        return name, "premium"

    return name, "basic"


def _safe_dt(value):
    return value.isoformat() if value else None


def _anonymous_label(author_role):
    return {
        "expert": "Anonymous Expert",
        "premium": "Anonymous Premium Investor",
    }.get(author_role, "Anonymous Investor")


def _serialise_review(review, user_id=None, session=None, reveal_author=False):
    """Platform reviews are anonymous to other users on the public Reviews
    page — only admins (moderation) and the author's own responses reveal
    the real name. Pass reveal_author=True for those cases."""
    helpful_by_me = False
    flagged_by_me = False
    flag_count = 0
    if session and user_id:
        helpful_by_me = session.query(ReviewHelpful).filter(
            ReviewHelpful.review_id == review.review_id,
            ReviewHelpful.user_id == user_id,
        ).first() is not None
        flagged_by_me = session.query(ReviewFlag).filter(
            ReviewFlag.review_id == review.review_id,
            ReviewFlag.user_id == str(user_id),
        ).first() is not None
    if session:
        flag_count = session.query(ReviewFlag).filter(
            ReviewFlag.review_id == review.review_id
        ).count()
    display_name = review.author_name if reveal_author else _anonymous_label(review.author_role)
    return {
        "id":             review.review_id,
        "review_id":      review.review_id,
        "user_id":        review.user_id,
        "author":         display_name,
        "author_name":    display_name,
        "author_role":    review.author_role,
        "rating":         review.rating,
        "title":          review.title or "",
        "comment":        review.comment,
        "helpful_count":  review.helpful_count,
        "helpful_by_me":  helpful_by_me,
        "flagged_by_me":  flagged_by_me,
        "flag_count":     flag_count,
        "is_edited":      bool(review.is_edited),
        "is_mine":        bool(user_id) and str(review.user_id) == str(user_id),
        "created_at":     _safe_dt(review.created_at),
        "updated_at":     _safe_dt(review.updated_at),
    }


# ── Repository ────────────────────────────────────────────────────────────────

class ReviewRepository:

    @staticmethod
    def get_stats():
        """Aggregate rating stats for the platform — average, total, star distribution."""
        with get_session() as session:
            reviews = session.query(Review).all()
            total = len(reviews)
            if total == 0:
                return {
                    "average": 0.0, "total": 0,
                    "distribution": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0},
                }
            distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
            total_stars = 0
            for r in reviews:
                bucket = str(max(1, min(5, int(r.rating))))
                distribution[bucket] += 1
                total_stars += r.rating
            return {
                "average": round(total_stars / total, 2),
                "total": total,
                "distribution": distribution,
            }

    @staticmethod
    def list_reviews(user_id=None, sort="latest", page=1, page_size=10, rating_filter=None):
        with get_session() as session:
            q = session.query(Review)
            if rating_filter:
                q = q.filter(Review.rating == int(rating_filter))

            if sort == "highest":
                q = q.order_by(Review.rating.desc(), Review.created_at.desc())
            elif sort == "lowest":
                q = q.order_by(Review.rating.asc(), Review.created_at.desc())
            elif sort == "helpful":
                q = q.order_by(Review.helpful_count.desc(), Review.created_at.desc())
            else:  # latest
                q = q.order_by(Review.created_at.desc())

            total = q.count()
            reviews = q.offset((page - 1) * page_size).limit(page_size).all()
            return {
                "reviews":     [_serialise_review(r, user_id=user_id, session=session) for r in reviews],
                "total":       total,
                "page":        page,
                "page_size":   page_size,
                "total_pages": max(1, -(-total // page_size)),
            }

    @staticmethod
    def get_my_review(user_id):
        if not user_id:
            return None
        with get_session() as session:
            review = session.query(Review).filter(Review.user_id == user_id).first()
            if not review:
                return None
            return _serialise_review(review, user_id=user_id, session=session, reveal_author=True)

    @staticmethod
    def create_review(user_id, rating, title, comment):
        if not user_id or not comment or not str(comment).strip():
            return None
        rating = max(1, min(5, int(rating)))

        with get_session() as session:
            existing = session.query(Review).filter(Review.user_id == user_id).first()
            if existing:
                # One review per user — signal caller to use update instead
                return "duplicate"

            author_name, author_role = _resolve_author(session, user_id)
            review = Review(
                review_id=f"review_{uuid4()}",
                user_id=user_id,
                author_name=author_name,
                author_role=author_role,
                rating=rating,
                title=(title or "").strip()[:150],
                comment=str(comment).strip(),
            )
            session.add(review)
            session.flush()
            return _serialise_review(review, user_id=user_id, session=session, reveal_author=True)

    @staticmethod
    def update_review(review_id, user_id, rating=None, title=None, comment=None):
        with get_session() as session:
            review = session.query(Review).filter(Review.review_id == review_id).first()
            if not review:
                return None
            if str(review.user_id) != str(user_id):
                return None  # only the author may edit
            if rating is not None:
                review.rating = max(1, min(5, int(rating)))
            if title is not None:
                review.title = str(title).strip()[:150]
            if comment is not None and str(comment).strip():
                review.comment = str(comment).strip()
            review.is_edited = 1
            review.updated_at = _now()
            session.flush()
            return _serialise_review(review, user_id=user_id, session=session, reveal_author=True)

    @staticmethod
    def delete_review(review_id, user_id=None, is_admin=False):
        with get_session() as session:
            review = session.query(Review).filter(Review.review_id == review_id).first()
            if not review:
                return False
            if not is_admin and str(review.user_id) != str(user_id):
                return False  # not the owner and not an admin
            session.query(ReviewHelpful).filter(
                ReviewHelpful.review_id == review_id
            ).delete(synchronize_session=False)
            session.query(ReviewFlag).filter(
                ReviewFlag.review_id == review_id
            ).delete(synchronize_session=False)
            session.delete(review)
            session.flush()
            return True

    @staticmethod
    def toggle_helpful(review_id, user_id):
        if not user_id:
            return None
        with get_session() as session:
            review = session.query(Review).filter(Review.review_id == review_id).first()
            if not review:
                return None
            existing = session.query(ReviewHelpful).filter(
                ReviewHelpful.review_id == review_id, ReviewHelpful.user_id == user_id
            ).first()
            if existing:
                session.delete(existing)
                review.helpful_count = max(0, int(review.helpful_count or 0) - 1)
            else:
                session.add(ReviewHelpful(review_id=review_id, user_id=user_id))
                review.helpful_count = int(review.helpful_count or 0) + 1
            session.flush()
            return _serialise_review(review, user_id=user_id, session=session)

    @staticmethod
    def flag_review(review_id, user_id, reason):
        """Toggle flag — if already flagged by this user, remove it."""
        if not user_id:
            return None
        with get_session() as session:
            review = session.query(Review).filter(Review.review_id == review_id).first()
            if not review:
                return None
            existing = session.query(ReviewFlag).filter(
                ReviewFlag.review_id == review_id,
                ReviewFlag.user_id == user_id,
            ).first()
            if existing:
                session.delete(existing)
                session.flush()
                return {"unflagged": True, "review_id": review_id}
            session.add(ReviewFlag(
                review_id=review_id,
                user_id=user_id,
                reason=reason or "Inappropriate content",
            ))
            session.flush()
            return {"flagged": True, "review_id": review_id, "reason": reason}

    # ── Admin moderation ────────────────────────────────────────────────────

    @staticmethod
    def create_removal_record(user_id, review_title, reason):
        """Log a review removal so the author can see why their review was taken down."""
        with get_session() as session:
            record = ReviewRemoval(
                user_id=user_id,
                review_title=review_title,
                reason=reason,
            )
            session.add(record)
            session.flush()
            return record.id

    @staticmethod
    def get_unacknowledged_removal(user_id):
        """Return the user's most recent un-dismissed removal notice, if any."""
        with get_session() as session:
            record = session.query(ReviewRemoval).filter(
                ReviewRemoval.user_id == user_id,
                ReviewRemoval.acknowledged == False,
            ).order_by(ReviewRemoval.removed_at.desc()).first()
            if not record:
                return None
            return {
                "id": record.id,
                "review_title": record.review_title,
                "reason": record.reason,
                "removed_at": _safe_dt(record.removed_at),
            }

    @staticmethod
    def acknowledge_removal(removal_id, user_id):
        """Mark a removal notice as seen/dismissed by the user."""
        with get_session() as session:
            record = session.query(ReviewRemoval).filter(
                ReviewRemoval.id == removal_id,
                ReviewRemoval.user_id == user_id,
            ).first()
            if not record:
                return False
            record.acknowledged = True
            return True

    @staticmethod
    def get_review_by_id(review_id):
        """Return serialised review dict — used before deletion to capture owner info."""
        with get_session() as session:
            review = session.query(Review).filter(Review.review_id == review_id).first()
            if not review:
                return None
            return _serialise_review(review, reveal_author=True)

    @staticmethod
    def admin_list_reviews():
        """All reviews, newest first — for the admin moderation queue."""
        with get_session() as session:
            reviews = session.query(Review).order_by(Review.created_at.desc()).all()
            return [_serialise_review(r, session=session, reveal_author=True) for r in reviews]

    @staticmethod
    def admin_flagged_reviews():
        """Reviews that have been flagged by at least one user, with flag details."""
        with get_session() as session:
            flags = session.query(ReviewFlag).order_by(ReviewFlag.created_at.desc()).all()
            # Group by review_id
            by_review = {}
            for flag in flags:
                if flag.review_id not in by_review:
                    by_review[flag.review_id] = []
                by_review[flag.review_id].append({
                    "user_id": flag.user_id,
                    "reason":  flag.reason,
                    "flagged_at": _safe_dt(flag.created_at),
                })
            result = []
            for review_id, flag_list in by_review.items():
                review = session.query(Review).filter(Review.review_id == review_id).first()
                if review:
                    data = _serialise_review(review, session=session, reveal_author=True)
                    data["flags"] = flag_list
                    data["flag_count"] = len(flag_list)
                    result.append(data)
            result.sort(key=lambda r: r["flag_count"], reverse=True)
            return result


# ── Seed data ─────────────────────────────────────────────────────────────────

def seed_reviews():
    """Seed a handful of realistic reviews on first run so the page isn't empty."""
    with get_session() as session:
        if session.query(Review).count() > 0:
            return

    seed_data = [
        {"review_id": "review_seed_001", "user_id": "seed_user_001", "author_name": "Marcus Rivera",  "author_role": "premium", "rating": 5, "title": "Genuinely helped me get started",
         "comment": "I was intimidated by investing before RocketTrade. The paper trading let me practice with real market data without any risk, and the AI predictions gave me a good starting point for research. Upgraded to Premium after two weeks — worth it.",
         "helpful_count": 24},
        {"review_id": "review_seed_002", "user_id": "seed_user_002", "author_name": "Sarah Chen",     "author_role": "basic",   "rating": 4, "title": "Great for learning, wish free tier had more predictions",
         "comment": "The community forum and educational content are excellent for a beginner. Only reason it's not 5 stars is the free tier's daily prediction limit felt a bit restrictive — but that's what Premium is for I suppose.",
         "helpful_count": 17},
        {"review_id": "review_seed_003", "user_id": "seed_user_003", "author_name": "Jordan Expert",  "author_role": "expert",  "rating": 5, "title": "Solid platform for connecting with investors",
         "comment": "As an expert consultant, the Q&A and portfolio-sharing tools make it easy to help investors without a ton of back-and-forth. The dashboard for tracking questions is clean and the notification system keeps me on top of things.",
         "helpful_count": 12},
        {"review_id": "review_seed_004", "user_id": "seed_user_004", "author_name": "Priya Nair",     "author_role": "premium", "rating": 4, "title": "Quant ratings are a nice touch",
         "comment": "The sector quant rating feature gives a quick gut-check on a stock before I dig deeper. Prediction accuracy has been decent on the large-cap names I've tracked. Customer support could reply a bit faster though.",
         "helpful_count": 9},
        {"review_id": "review_seed_005", "user_id": "seed_user_005", "author_name": "Wei Zhang",      "author_role": "basic",   "rating": 3, "title": "Good concept, some rough edges",
         "comment": "Like the idea a lot and the paper trading engine works well. Ran into a couple of UI glitches on mobile and the chatbot sometimes gives generic answers, but overall a useful tool for practicing before going live.",
         "helpful_count": 5},
    ]

    with get_session() as session:
        for data in seed_data:
            session.add(Review(
                review_id=data["review_id"],
                user_id=data["user_id"],
                author_name=data["author_name"],
                author_role=data["author_role"],
                rating=data["rating"],
                title=data["title"],
                comment=data["comment"],
                helpful_count=data["helpful_count"],
            ))
        session.flush()
        print(f"[REVIEWS] Seeded {len(seed_data)} platform reviews.")
