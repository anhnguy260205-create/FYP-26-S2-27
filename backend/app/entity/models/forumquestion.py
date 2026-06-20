
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.entity.database.base import Base
from app.entity.database.session import get_session
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount

try:
    from zoneinfo import ZoneInfo
    def _now():
        return datetime.now(ZoneInfo("Asia/Singapore"))
except Exception:
    def _now():
        return datetime.now()


class ForumPost(Base):
    __tablename__ = "forum_post"

    post_id = Column(String(50), primary_key=True, default=lambda: f"post_{uuid4()}")
    user_id = Column(String(50), nullable=True)
    author_name = Column(String(100), default="RocketTrade User")
    author_role = Column(String(30), default="investor")
    title = Column(String(180), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(80), default="General")
    tags = Column(String(255), default="")
    likes_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    is_pinned = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now)

    replies = relationship("ForumReply", cascade="all, delete-orphan", back_populates="post", lazy="joined")


class ForumReply(Base):
    __tablename__ = "forum_reply"

    reply_id = Column(String(50), primary_key=True, default=lambda: f"reply_{uuid4()}")
    post_id = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id = Column(String(50), nullable=True)
    author_name = Column(String(100), default="RocketTrade User")
    author_role = Column(String(30), default="investor")
    content = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)

    post = relationship("ForumPost", back_populates="replies")


class ForumPostLike(Base):
    __tablename__ = "forum_post_like"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_forum_post_like"),)

    like_id = Column(String(50), primary_key=True, default=lambda: f"like_{uuid4()}")
    post_id = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ForumPostSave(Base):
    __tablename__ = "forum_post_save"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_forum_post_save"),)

    save_id = Column(String(50), primary_key=True, default=lambda: f"save_{uuid4()}")
    post_id = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ExpertQuestion(Base):
    __tablename__ = "expert_question"

    question_id = Column(String(50), primary_key=True, default=lambda: f"question_{uuid4()}")
    expert_id = Column(String(50), ForeignKey("expert.expert_id"), nullable=True)
    investor_name = Column(String(100), default="Premium Investor")
    investor_email = Column(String(140), nullable=True)
    title = Column(String(180), nullable=False)
    question_type = Column(String(80), default="Portfolio Review")
    tickers = Column(String(180), default="")
    urgency = Column(String(30), default="Medium")
    status = Column(String(30), default="Pending")
    investment_goal = Column(String(180), default="Long-term growth")
    risk_profile = Column(String(80), default="Moderate")
    portfolio_value = Column(Float, default=0.0)
    content = Column(Text, nullable=False)
    reply_text = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=_now)
    answered_at = Column(DateTime, nullable=True)


def _resolve_user_name(session, user_id):
    if not user_id:
        return "RocketTrade User", "investor"
    user = session.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    if not user:
        return "RocketTrade User", "investor"
    role = user.profile.profile_name if getattr(user, "profile", None) else "user"
    return user.full_name or user.username, role or "user"


def _resolve_expert_id(session, user_id=None):
    expert = None
    if user_id:
        expert = session.query(Expert).filter(Expert.user_id == user_id).first()
    if not expert:
        expert = session.query(Expert).first()
    return expert.expert_id if expert else None


def _safe_dt(value):
    return value.isoformat() if value else None



def _can_modify_reply(session, reply, user_id):
    if not reply or not user_id:
        return False
    if reply.user_id and str(reply.user_id) == str(user_id):
        return True
    # Legacy/local-demo replies may have no user_id. Allow if the logged-in user's display name matches the stored author name.
    author_name, _role = _resolve_user_name(session, user_id)
    if author_name and reply.author_name and str(author_name).strip().lower() == str(reply.author_name).strip().lower():
        return True
    return False

def _serialise_reply(reply):
    return {
        "id": reply.reply_id,
        "reply_id": reply.reply_id,
        "user_id": reply.user_id,
        "author": reply.author_name,
        "author_name": reply.author_name,
        "author_role": reply.author_role,
        "content": reply.content,
        "likes": reply.likes_count,
        "created_at": _safe_dt(reply.created_at),
        "time": _safe_dt(reply.created_at),
    }


def _serialise_post(session, post, user_id=None, include_replies=True):
    liked = False
    saved = False
    if user_id:
        liked = session.query(ForumPostLike).filter(ForumPostLike.post_id == post.post_id, ForumPostLike.user_id == user_id).first() is not None
        saved = session.query(ForumPostSave).filter(ForumPostSave.post_id == post.post_id, ForumPostSave.user_id == user_id).first() is not None
    replies = list(post.replies or [])
    return {
        "id": post.post_id,
        "post_id": post.post_id,
        "user_id": post.user_id,
        "title": post.title,
        "content": post.content,
        "preview": post.content[:180] + ("..." if len(post.content) > 180 else ""),
        "category": post.category,
        "tags": [t.strip() for t in (post.tags or "").split(",") if t.strip()],
        "author": post.author_name,
        "author_name": post.author_name,
        "author_role": post.author_role,
        "likes": post.likes_count,
        "views": post.views_count,
        "reply_count": len(replies),
        "replies": [_serialise_reply(r) for r in replies] if include_replies else [],
        "liked_by_me": liked,
        "saved_by_me": saved,
        "created_at": _safe_dt(post.created_at),
        "updated_at": _safe_dt(post.updated_at),
        "time": _safe_dt(post.created_at),
    }


def _serialise_question(question):
    return {
        "question_id": question.question_id,
        "id": question.question_id,
        "investor_name": question.investor_name,
        "investor_email": question.investor_email,
        "title": question.title,
        "question_type": question.question_type,
        "tickers": [t.strip() for t in (question.tickers or "").split(",") if t.strip()],
        "urgency": question.urgency,
        "status": question.status,
        "investment_goal": question.investment_goal,
        "risk_profile": question.risk_profile,
        "portfolio_value": question.portfolio_value,
        "content": question.content,
        "reply_text": question.reply_text,
        "submitted_at": _safe_dt(question.submitted_at),
        "answered_at": _safe_dt(question.answered_at),
    }


class ForumRepository:
    @staticmethod
    def seed_posts():
        with get_session() as session:
            if session.query(ForumPost).count() > 0:
                return True
            posts = [
                ForumPost(post_id="post_demo_aapl", author_name="Miko Tanaka", author_role="expert", title="AAPL double-bottom setup — breakout watch", category="Technical Analysis", tags="AAPL,Technical Analysis,Breakout", likes_count=34, views_count=820, is_pinned=0, content="Apple has been forming a potential double-bottom near the recent support zone. I am watching for a confirmed close above neckline resistance with stronger volume before treating it as a valid bullish setup."),
                ForumPost(post_id="post_demo_ai", author_name="Wei Zhang", author_role="premium", title="How should we use AI prediction signals responsibly?", category="AI Predictions", tags="AI,Signals,Risk Management", likes_count=58, views_count=1240, content="I have been comparing AI signals with my own technical analysis. My view is that the AI output is useful as a screening layer, but every trade still needs position sizing and risk controls."),
                ForumPost(post_id="post_demo_portfolio", author_name="Dr. Raymond Lee", author_role="consultant", title="Building a balanced portfolio for volatile markets", category="Portfolio Strategy", tags="Portfolio,Risk,Defensive", likes_count=76, views_count=1680, content="In uncertain markets, I prefer combining quality growth, defensive sectors and some cash flexibility. The key is to avoid overconcentration in one theme even when momentum looks attractive."),
            ]
            for post in posts:
                post.replies = [ForumReply(reply_id=f"reply_{post.post_id}", author_name="Sarah Chen", author_role="premium", content="Helpful breakdown, thanks for sharing this with the community.", likes_count=5)]
                session.add(post)
            return True

    @staticmethod
    def list_posts(user_id=None):
        ForumRepository.seed_posts()
        with get_session() as session:
            posts = session.query(ForumPost).order_by(ForumPost.created_at.desc()).all()
            return [_serialise_post(session, p, user_id=user_id, include_replies=False) for p in posts]

    @staticmethod
    def get_post(post_id, user_id=None):
        ForumRepository.seed_posts()
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            post.views_count = int(post.views_count or 0) + 1
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def create_post(user_id, title, content, category="General", tags=None):
        with get_session() as session:
            author_name, author_role = _resolve_user_name(session, user_id)
            post = ForumPost(
                post_id=f"post_{uuid4()}", user_id=user_id, author_name=author_name, author_role=author_role,
                title=title, content=content, category=category or "General", tags=",".join(tags or []),
            )
            session.add(post)
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def add_reply(post_id, user_id, content):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            author_name, author_role = _resolve_user_name(session, user_id)
            reply = ForumReply(reply_id=f"reply_{uuid4()}", post_id=post_id, user_id=user_id, author_name=author_name, author_role=author_role, content=content)
            post.updated_at = _now()
            session.add(reply)
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def toggle_like(post_id, user_id):
        if not user_id:
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            existing = session.query(ForumPostLike).filter(ForumPostLike.post_id == post_id, ForumPostLike.user_id == user_id).first()
            if existing:
                session.delete(existing)
                post.likes_count = max(0, int(post.likes_count or 0) - 1)
            else:
                session.add(ForumPostLike(like_id=f"like_{uuid4()}", post_id=post_id, user_id=user_id))
                post.likes_count = int(post.likes_count or 0) + 1
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def toggle_save(post_id, user_id):
        if not user_id:
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            existing = session.query(ForumPostSave).filter(ForumPostSave.post_id == post_id, ForumPostSave.user_id == user_id).first()
            if existing:
                session.delete(existing)
            else:
                session.add(ForumPostSave(save_id=f"save_{uuid4()}", post_id=post_id, user_id=user_id))
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def delete_post(post_id, user_id=None):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return False
            session.query(ForumPostLike).filter(ForumPostLike.post_id == post_id).delete(synchronize_session=False)
            session.query(ForumPostSave).filter(ForumPostSave.post_id == post_id).delete(synchronize_session=False)
            session.delete(post)
            session.flush()
            return True

    @staticmethod
    def update_reply(post_id, reply_id, user_id=None, content=""):
        if not content or not str(content).strip():
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            reply = session.query(ForumReply).filter(ForumReply.post_id == post_id, ForumReply.reply_id == reply_id).first()
            if not reply:
                return None
            # Only the user who wrote the comment can edit it.
            # For older replies without user_id, allow editing if the logged-in display name matches the reply author.
            if not _can_modify_reply(session, reply, user_id):
                return None
            reply.content = str(content).strip()
            if not reply.user_id and user_id:
                reply.user_id = user_id
            post.updated_at = _now()
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def delete_reply(post_id, reply_id, user_id=None):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            reply = session.query(ForumReply).filter(ForumReply.post_id == post_id, ForumReply.reply_id == reply_id).first()
            if not reply:
                return None
            # Only the user who wrote the comment can delete it.
            # For older replies without user_id, allow deletion if the logged-in display name matches the reply author.
            if not _can_modify_reply(session, reply, user_id):
                return None
            session.delete(reply)
            post.updated_at = _now()
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)


class ExpertQuestionRepository:
    @staticmethod
    def seed_for_expert(user_id=None):
        with get_session() as session:
            expert_id = _resolve_expert_id(session, user_id)
            if not expert_id:
                return []
            existing = session.query(ExpertQuestion).filter(ExpertQuestion.expert_id == expert_id).count()
            if existing > 0:
                questions = session.query(ExpertQuestion).filter(ExpertQuestion.expert_id == expert_id).order_by(ExpertQuestion.submitted_at.desc()).all()
                return [_serialise_question(q) for q in questions]

            demo = [
                ExpertQuestion(question_id="question_demo_nvda", expert_id=expert_id, investor_name="Sarah Chen", investor_email="sarah.chen@email.com", title="Should I rebalance my NVDA-heavy portfolio?", question_type="Portfolio Review", tickers="NVDA,MSFT,AAPL", urgency="High", status="Pending", investment_goal="Long-term growth", risk_profile="Moderate-Aggressive", portfolio_value=52000, content="My portfolio is now heavily concentrated in NVDA after the recent rally. Should I trim some gains and rebalance into other technology or defensive stocks?"),
                ExpertQuestion(question_id="question_demo_dbs", expert_id=expert_id, investor_name="Marcus Rivera", investor_email="marcus.rivera@email.com", title="DBS entry price and dividend strategy", question_type="Stock Analysis", tickers="DBS.SI,UOB.SI", urgency="Medium", status="Pending", investment_goal="Dividend income", risk_profile="Moderate", portfolio_value=30000, content="I am considering DBS for dividend income. Is the current price still attractive, or should I wait for a pullback before entering?"),
                ExpertQuestion(question_id="question_demo_defensive", expert_id=expert_id, investor_name="Priya Nair", investor_email="priya.nair@email.com", title="How do I make my portfolio less volatile?", question_type="Risk Management", tickers="AAPL,KO,JNJ", urgency="Low", status="Pending", investment_goal="Capital preservation", risk_profile="Conservative", portfolio_value=18000, content="I am worried about market volatility. What type of defensive allocation should I add so my portfolio moves less aggressively?"),
            ]
            for q in demo:
                session.add(q)
            session.flush()
            return [_serialise_question(q) for q in demo]

    @staticmethod
    def list_for_expert(user_id=None):
        return ExpertQuestionRepository.seed_for_expert(user_id)

    @staticmethod
    def get(question_id):
        with get_session() as session:
            question = session.query(ExpertQuestion).filter(ExpertQuestion.question_id == question_id).first()
            return _serialise_question(question) if question else None

    @staticmethod
    def reply(question_id, reply_text):
        with get_session() as session:
            question = session.query(ExpertQuestion).filter(ExpertQuestion.question_id == question_id).first()
            if not question:
                return None
            question.reply_text = reply_text
            question.status = "Answered"
            question.answered_at = _now()
            session.flush()
            return _serialise_question(question)

    @staticmethod
    def delete_reply(question_id):
        with get_session() as session:
            question = session.query(ExpertQuestion).filter(ExpertQuestion.question_id == question_id).first()
            if not question:
                return None
            question.reply_text = None
            question.status = "Pending"
            question.answered_at = None
            session.flush()
            return _serialise_question(question)
