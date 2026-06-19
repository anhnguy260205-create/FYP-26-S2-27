from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.entity.database.base import Base

class ExpertPortfolio(Base):
    __tablename__ = "expert_portfolios"

    portfolio_id = Column(String(50), primary_key=True, default=lambda: f"port_{uuid4().hex}")
    user_id = Column(String(50), ForeignKey("user_accounts.user_id"), nullable=False, unique=True)
    bio = Column(Text, nullable=True)
    experience_years = Column(Integer, default=0)
    hourly_rate = Column(String(50), default="0 Credits")
    skills = Column(Text, nullable=True)  # Comma-separated tags
    covered_tickers = Column(String(255), nullable=True)  # Comma-separated stocks
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("UserAccount", backref="portfolio")

class ConsultationQuestion(Base):
    __tablename__ = "consultation_questions"

    question_id = Column(String(50), primary_key=True, default=lambda: f"q_{uuid4().hex}")
    investor_id = Column(String(50), ForeignKey("user_accounts.user_id"), nullable=False)
    expert_id = Column(String(50), ForeignKey("user_accounts.user_id"), nullable=False)
    title = Column(String(255), nullable=False)
    ticker = Column(String(20), nullable=True)
    content = Column(Text, nullable=False)
    status = Column(String(20), default="pending")  # pending, replied
    reply_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    replied_at = Column(DateTime, nullable=True)

    investor = relationship("UserAccount", foreign_keys=[investor_id])
    expert = relationship("UserAccount", foreign_keys=[expert_id])

class ForumPost(Base):
    __tablename__ = "forum_posts"

    post_id = Column(String(50), primary_key=True, default=lambda: f"post_{uuid4().hex}")
    user_id = Column(String(50), ForeignKey("user_accounts.user_id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # technical-analysis, ai-predictions, etc.
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("UserAccount", backref="forum_posts")
    comments = relationship("ForumComment", back_populates="post", cascade="all, delete-orphan")

class ForumComment(Base):
    __tablename__ = "forum_comments"

    comment_id = Column(String(50), primary_key=True, default=lambda: f"comm_{uuid4().hex}")
    post_id = Column(String(50), ForeignKey("forum_posts.post_id"), nullable=False)
    user_id = Column(String(50), ForeignKey("user_accounts.user_id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("ForumPost", back_populates="comments")
    author = relationship("UserAccount", backref="forum_comments")