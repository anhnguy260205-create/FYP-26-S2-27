from app.entity.database.session import get_session
from app.entity.models.forumquestion import ForumQuestion, ForumReply
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount
from typing import Optional, List, Dict
from datetime import datetime
from zoneinfo import ZoneInfo


def _dt(value):
    return value.isoformat() if value else None


def _split_csv(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in str(value).split(",") if item.strip()]


def _join_csv(values) -> Optional[str]:
    if values is None:
        return None
    if isinstance(values, str):
        return values
    return ",".join(str(v).strip() for v in values if str(v).strip())


def _user_author(user: Optional[UserAccount], role: Optional[str] = None) -> Dict:
    name = user.full_name or user.username if user else "User"
    initials = "".join(part[0] for part in str(name).split() if part)[:2].upper() or "U"
    inferred_role = role or getattr(user, "profile_name", None) or "investor"
    return {
        "id": user.user_id if user else None,
        "name": name,
        "role": inferred_role,
        "title": "Expert" if inferred_role == "expert" else "Member",
        "avatar": initials,
        "verified": inferred_role == "expert",
        "posts": 0,
        "joined": "",
    }


def _question_to_list_dict(session, q: ForumQuestion) -> Dict:
    reply_count = session.query(ForumReply).filter(ForumReply.question_id == q.question_id).count()
    return {
        "question_id": q.question_id,
        "id": q.question_id,
        "user_id": q.user_id,
        "username": q.user.username if q.user else None,
        "author": _user_author(q.user),
        "title": q.title,
        "content": q.content,
        "preview": (q.content or "")[:180] + ("…" if q.content and len(q.content) > 180 else ""),
        "category": q.category or "general",
        "tags": _split_csv(getattr(q, "tags", None)),
        "image": getattr(q, "image_url", None),
        "image_url": getattr(q, "image_url", None),
        "status": q.status,
        "urgency": getattr(q, "urgency", "normal"),
        "tickers": _split_csv(getattr(q, "tickers", None)),
        "investment_goal": getattr(q, "investment_goal", None),
        "reply_count": reply_count,
        "replies": reply_count,  # list view must remain a number, not an array of reply objects
        "views": int(getattr(q, "views", 0) or 0),
        "likes": int(getattr(q, "likes", 0) or 0),
        "is_resolved": bool(q.is_resolved),
        "edited": bool(getattr(q, "edited", False)),
        "created_at": _dt(q.created_at),
        "updated_at": _dt(q.updated_at),
    }


def _reply_to_dict(session, reply: ForumReply) -> Dict:
    author = None
    if reply.is_expert_reply and reply.expert_id:
        expert = session.query(Expert).filter(Expert.expert_id == reply.expert_id).first()
        user = session.query(UserAccount).filter(UserAccount.user_id == expert.user_id).first() if expert else None
        author = _user_author(user, role="expert")
    elif reply.user_id:
        user = session.query(UserAccount).filter(UserAccount.user_id == reply.user_id).first()
        role = None
        if user:
            expert = session.query(Expert).filter(Expert.user_id == user.user_id).first()
            role = "expert" if expert else "investor"
        author = _user_author(user, role=role)
    else:
        author = {"id": None, "name": "User", "role": "investor", "title": "Member", "avatar": "U", "verified": False}

    return {
        "reply_id": reply.reply_id,
        "id": reply.reply_id,
        "content": reply.content,
        "author": author,
        "time": _dt(reply.created_at),
        "created_at": _dt(reply.created_at),
        "likes": int(getattr(reply, "likes", 0) or 0),
        "is_expert_reply": bool(reply.is_expert_reply),
    }


def _question_to_detail_dict(session, question: ForumQuestion) -> Dict:
    replies = session.query(ForumReply).filter(
        ForumReply.question_id == question.question_id
    ).order_by(ForumReply.created_at.asc()).all()
    data = _question_to_list_dict(session, question)
    data["replies"] = [_reply_to_dict(session, r) for r in replies]
    data["reply_count"] = len(data["replies"])
    return data


class ForumController:
    def get_all_questions(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        with get_session() as session:
            questions = session.query(ForumQuestion).order_by(ForumQuestion.created_at.desc()).offset(offset).limit(limit).all()
            return [_question_to_list_dict(session, q) for q in questions]

    def get_question_by_id(self, question_id: str, increment_views: bool = False) -> Optional[Dict]:
        with get_session() as session:
            question = session.query(ForumQuestion).filter(ForumQuestion.question_id == question_id).first()
            if not question:
                return None
            if increment_views:
                question.views = int(getattr(question, "views", 0) or 0) + 1
                session.commit()
                session.refresh(question)
            return _question_to_detail_dict(session, question)

    def create_question(
        self,
        user_id: str,
        title: str,
        content: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        image_url: Optional[str] = None,
        urgency: Optional[str] = None,
        tickers: Optional[List[str]] = None,
        investment_goal: Optional[str] = None,
    ) -> str:
        with get_session() as session:
            question = ForumQuestion(
                user_id=user_id,
                title=title,
                content=content,
                category=category or "general",
                tags=_join_csv(tags),
                image_url=image_url,
                urgency=urgency or "normal",
                tickers=_join_csv(tickers),
                investment_goal=investment_goal,
                status="pending",
                views=0,
                likes=0,
            )
            session.add(question)
            session.commit()
            return question.question_id

    def update_question(
        self,
        question_id: str,
        user_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        image_url: Optional[str] = None,
    ) -> Optional[Dict]:
        with get_session() as session:
            question = session.query(ForumQuestion).filter(
                ForumQuestion.question_id == question_id,
                ForumQuestion.user_id == user_id,
            ).first()
            if not question:
                return None
            if title is not None:
                question.title = title
            if content is not None:
                question.content = content
            if category is not None:
                question.category = category
            if tags is not None:
                question.tags = _join_csv(tags)
            if image_url is not None:
                question.image_url = image_url
            question.edited = True
            question.updated_at = datetime.now(ZoneInfo("Asia/Singapore"))
            session.commit()
            session.refresh(question)
            return _question_to_detail_dict(session, question)

    def create_reply(
        self,
        question_id: str,
        content: str,
        expert_id: Optional[str] = None,
        user_id: Optional[str] = None,
        is_expert_reply: bool = False,
    ) -> str:
        with get_session() as session:
            reply = ForumReply(
                question_id=question_id,
                expert_id=expert_id,
                user_id=user_id,
                content=content,
                is_expert_reply=is_expert_reply,
                likes=0,
            )
            session.add(reply)
            question = session.query(ForumQuestion).filter(ForumQuestion.question_id == question_id).first()
            if question:
                question.status = "answered" if is_expert_reply else question.status
                question.updated_at = datetime.now(ZoneInfo("Asia/Singapore"))
            session.commit()
            return reply.reply_id

    def get_reply_by_id(self, reply_id: str) -> Optional[Dict]:
        with get_session() as session:
            reply = session.query(ForumReply).filter(ForumReply.reply_id == reply_id).first()
            if not reply:
                return None
            return _reply_to_dict(session, reply)

    def get_questions_by_expert(self, expert_id: str) -> List[Dict]:
        """Centralised submitted question dashboard for consultants.
        Shows questions assigned to this expert and unassigned questions they can pick up.
        """
        with get_session() as session:
            questions = session.query(ForumQuestion).filter(
                (ForumQuestion.expert_id == expert_id) | (ForumQuestion.expert_id.is_(None))
            ).order_by(ForumQuestion.created_at.desc()).all()
            return [_question_to_list_dict(session, q) for q in questions]

    def assign_question_to_expert(self, question_id: str, expert_id: str) -> bool:
        with get_session() as session:
            question = session.query(ForumQuestion).filter(ForumQuestion.question_id == question_id).first()
            if not question:
                return False
            question.expert_id = expert_id
            question.status = "in_progress"
            question.updated_at = datetime.now(ZoneInfo("Asia/Singapore"))
            session.commit()
            return True

    def mark_question_resolved(self, question_id: str, user_id: str) -> bool:
        with get_session() as session:
            question = session.query(ForumQuestion).filter(
                ForumQuestion.question_id == question_id,
                ForumQuestion.user_id == user_id,
            ).first()
            if not question:
                return False
            question.is_resolved = True
            question.status = "closed"
            question.updated_at = datetime.now(ZoneInfo("Asia/Singapore"))
            session.commit()
            return True
