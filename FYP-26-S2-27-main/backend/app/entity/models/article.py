from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


CATEGORIES = ["Beginner", "Technical Analysis", "Fundamental", "Risk Management", "Market News", "Strategy"]


class Article(Base):
    __tablename__ = "article"

    article_id = Column(String(50), primary_key=True,
                        default=lambda: f"article_{uuid4()}")
    expert_id  = Column(String(50), ForeignKey("expert.expert_id"), nullable=False)
    title      = Column(String(255), nullable=False)
    summary    = Column(String(500), nullable=False)
    content    = Column(Text, nullable=False)
    category   = Column(String(50), nullable=False, default="Beginner")
    tags       = Column(String(255), nullable=True)   # comma-separated e.g. "AAPL,NVDA"
    status     = Column(String(20), default="published")   # published | draft
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    updated_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")),
                        onupdate=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _row_to_dict(a, author_name=None):
        return {
            "article_id": a.article_id,
            "expert_id":  a.expert_id,
            "author":     author_name or "Expert",
            "title":      a.title,
            "summary":    a.summary,
            "content":    a.content,
            "category":   a.category,
            "tags":       [t.strip() for t in (a.tags or "").split(",") if t.strip()],
            "status":     a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        }

    @staticmethod
    def _get_author_name(session, expert_id):
        from app.entity.models.expert import Expert
        from app.entity.models.useraccount import UserAccount
        expert = session.query(Expert).filter(Expert.expert_id == expert_id).first()
        if not expert:
            return "Expert"
        user = session.query(UserAccount).filter(UserAccount.user_id == expert.user_id).first()
        return user.full_name if user else "Expert"

    # ── CRUD ─────────────────────────────────────────────────────────────────

    @staticmethod
    def create(expert_id, title, summary, content, category, tags=""):
        with get_session() as session:
            article = Article(
                expert_id=expert_id,
                title=title.strip(),
                summary=summary.strip(),
                content=content.strip(),
                category=category,
                tags=tags.strip(),
                status="published",
            )
            session.add(article)
            session.flush()
            return article.article_id

    @staticmethod
    def update(article_id, expert_id, title=None, summary=None,
               content=None, category=None, tags=None, status=None):
        with get_session() as session:
            article = session.query(Article).filter(
                Article.article_id == article_id,
                Article.expert_id  == expert_id,      # only own articles
            ).first()
            if not article:
                return False
            if title    is not None: article.title    = title.strip()
            if summary  is not None: article.summary  = summary.strip()
            if content  is not None: article.content  = content.strip()
            if category is not None: article.category = category
            if tags     is not None: article.tags     = tags.strip()
            if status   is not None: article.status   = status
            article.updated_at = datetime.now(ZoneInfo("Asia/Singapore"))
            return True

    @staticmethod
    def delete(article_id, expert_id):
        with get_session() as session:
            article = session.query(Article).filter(
                Article.article_id == article_id,
                Article.expert_id  == expert_id,
            ).first()
            if not article:
                return False
            session.delete(article)
            return True

    # ── Queries ───────────────────────────────────────────────────────────────

    @staticmethod
    def getAll(category=None, tag=None, limit=50):
        with get_session() as session:
            q = session.query(Article).filter(Article.status == "published")
            if category:
                q = q.filter(Article.category == category)
            rows = q.order_by(Article.created_at.desc()).limit(limit).all()
            return [
                Article._row_to_dict(a, Article._get_author_name(session, a.expert_id))
                for a in rows
                if not tag or tag.upper() in (a.tags or "").upper()
            ]

    @staticmethod
    def getById(article_id):
        with get_session() as session:
            a = session.query(Article).filter(Article.article_id == article_id).first()
            if not a:
                return None
            return Article._row_to_dict(a, Article._get_author_name(session, a.expert_id))

    @staticmethod
    def getByExpert(expert_id):
        with get_session() as session:
            rows = session.query(Article).filter(
                Article.expert_id == expert_id
            ).order_by(Article.created_at.desc()).all()
            author = Article._get_author_name(session, expert_id)
            return [Article._row_to_dict(a, author) for a in rows]
