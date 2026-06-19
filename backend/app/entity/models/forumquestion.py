from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.entity.database.base import Base
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


def sgt_now():
    return datetime.now(ZoneInfo("Asia/Singapore"))


class ForumQuestion(Base):
    __tablename__ = "forum_questions"

    question_id = Column(String(50), primary_key=True, default=lambda: f"q_{uuid4()}")
    user_id = Column(String(50), ForeignKey("user_account.user_id"), nullable=False)
    expert_id = Column(String(50), ForeignKey("expert.expert_id"), nullable=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)
    tags = Column(Text, nullable=True)  # comma-separated tags for forum UI
    image_url = Column(String(500), nullable=True)
    urgency = Column(String(30), default="normal")
    tickers = Column(Text, nullable=True)  # comma-separated stock tickers for submitted consultation questions
    investment_goal = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, in_progress, answered, closed
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=sgt_now)
    updated_at = Column(DateTime, default=sgt_now, onupdate=sgt_now)
    is_resolved = Column(Boolean, default=False)
    edited = Column(Boolean, default=False)

    user = relationship("UserAccount", backref="forum_questions")
    expert = relationship("Expert", backref="forum_questions")
    replies = relationship("ForumReply", backref="question", cascade="all, delete-orphan")


class ForumReply(Base):
    __tablename__ = "forum_replies"

    reply_id = Column(String(50), primary_key=True, default=lambda: f"r_{uuid4()}")
    question_id = Column(String(50), ForeignKey("forum_questions.question_id"), nullable=False)
    expert_id = Column(String(50), ForeignKey("expert.expert_id"), nullable=True)
    user_id = Column(String(50), ForeignKey("user_account.user_id"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=sgt_now)
    likes = Column(Integer, default=0)
    is_expert_reply = Column(Boolean, default=False)

    expert = relationship("Expert", backref="forum_replies")
    user = relationship("UserAccount", backref="forum_replies")
