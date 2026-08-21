"""
Direct messaging for the Forum > Messages section (expert consultation).

Rules:
  - The Messages section is an expert-consultation channel: every
    conversation must involve an expert.
  - Any investor in a conversation must have a PREMIUM subscription.
    Basic investors get `premium_required` and the frontend shows the
    upgrade lock.
  - Experts (and admins) are never charged/limited.

Delivery: messages are written here (MySQL) and pushed to online users via
the /chat/ws websocket (see chatb.py). Offline users see them on next load.
"""
from sqlalchemy import Column, ForeignKey, String, DateTime, Text, or_, and_
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4

from app.entity.models.useraccount import UserAccount
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.expertverification import ExpertVerification


def _now():
    return datetime.now(ZoneInfo("Asia/Singapore"))


class Conversation(Base):
    __tablename__ = "chat_conversation"

    conv_id = Column(String(50), primary_key=True,
                     default=lambda: f"conv_{uuid4()}")
    # user_a_id < user_b_id (sorted pair) so each pair has exactly one row
    user_a_id = Column(String(50), ForeignKey("user_account.user_id"), nullable=False)
    user_b_id = Column(String(50), ForeignKey("user_account.user_id"), nullable=False)
    created_at = Column(DateTime, default=_now)
    last_message_at = Column(DateTime, default=_now)


class ChatMessage(Base):
    __tablename__ = "chat_message"

    message_id = Column(String(50), primary_key=True,
                        default=lambda: f"msg_{uuid4()}")
    conv_id = Column(String(50), ForeignKey("chat_conversation.conv_id"), nullable=False)
    sender_id = Column(String(50), ForeignKey("user_account.user_id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)
    read_at = Column(DateTime, nullable=True)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _profile(session, user_id):
    """Lightweight {user_id, username, full_name, role, premium} or None."""
    user = session.query(UserAccount).filter(
        UserAccount.user_id == user_id).first()
    if not user:
        return None
    investor = session.query(Investor).filter(
        Investor.user_id == user_id).first()
    expert = session.query(Expert).filter(Expert.user_id == user_id).first()
 
    is_verified_expert = False
    if expert:
        verification = ExpertVerification.get_for_expert(expert.expert_id)
        is_verified_expert = verification["verification_status"] in ("approved", "active")
    # Merged roles: experts also have an investor row, but for the expert-
    # consultation channel their verified expert identity takes precedence.
    role = "expert" if is_verified_expert else "investor" if investor else "admin"
    premium = bool(investor) and investor.investor_subscription_status == "premium"
    return {
        "user_id": user.user_id,
        "username": user.username,
        "full_name": user.full_name,
        "role": role,
        "premium": premium,
        "chat_available": bool(expert.chat_available) if (expert and is_verified_expert) else True,
    }


def _can_chat(sender, recipient):
    """Messages section rules: strictly one investor talking to one expert —
    not investor-investor, and not expert-expert. Any investor involved must
    be premium."""
    roles = {sender["role"], recipient["role"]}
    if roles != {"investor", "expert"}:
        return False  # expert-consultation channel: investor <-> expert only
    for p in (sender, recipient):
        if p["role"] == "investor" and not p["premium"]:
            return False
    return True


def _msg_dict(m):
    return {
        "message_id": m.message_id,
        "conv_id": m.conv_id,
        "sender_id": m.sender_id,
        "content": m.content,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "read_at": m.read_at.isoformat() if m.read_at else None,
    }


# ── Public API ───────────────────────────────────────────────────────────────

class ChatController:

    @staticmethod
    def send_message(sender_id, recipient_id, content):
        """Create/reuse the conversation and store one message.
        Returns {success, premium_required?, message?, data?}."""
        content = (content or "").strip()
        if not content:
            return {"success": False, "message": "Message is empty"}
        if len(content) > 2000:
            return {"success": False, "message": "Message too long (max 2000 chars)"}
        if sender_id == recipient_id:
            return {"success": False, "message": "You can't message yourself"}

        with get_session() as session:
            sender = _profile(session, sender_id)
            recipient = _profile(session, recipient_id)
            if not sender or not recipient:
                return {"success": False, "message": "User not found"}

            if not _can_chat(sender, recipient):
                return {
                    "success": False,
                    "premium_required": True,
                    "message": "Chatting with experts is a Premium feature. Upgrade to start the conversation.",
                }

            # The expert side may have turned off chat — blocks sending into
            # both new AND existing conversations with them (until they turn
            # it back on). The expert themselves can always still send.
            expert_side = sender if sender["role"] == "expert" else recipient if recipient["role"] == "expert" else None
            if expert_side and not expert_side["chat_available"] and sender_id != expert_side["user_id"]:
                return {
                    "success": False,
                    "chat_unavailable": True,
                    "message": f"{expert_side['full_name'] or expert_side['username']} isn't accepting chat messages right now.",
                }

            a, b = sorted([sender_id, recipient_id])
            conv = session.query(Conversation).filter(
                Conversation.user_a_id == a, Conversation.user_b_id == b
            ).first()

            if not conv:
                conv = Conversation(user_a_id=a, user_b_id=b)
                session.add(conv)
                session.flush()

            msg = ChatMessage(conv_id=conv.conv_id,
                              sender_id=sender_id, content=content)
            session.add(msg)
            conv.last_message_at = _now()
            session.flush()

            return {
                "success": True,
                "data": {**_msg_dict(msg), "recipient_id": recipient_id},
            }

    @staticmethod
    def list_conversations(user_id):
        """Inbox: every conversation with the other user's info, last message
        and unread count, newest first."""
        with get_session() as session:
            convs = session.query(Conversation).filter(
                or_(Conversation.user_a_id == user_id,
                    Conversation.user_b_id == user_id)
            ).order_by(Conversation.last_message_at.desc()).all()

            me = _profile(session, user_id)
            out = []
            for c in convs:
                other_id = c.user_b_id if c.user_a_id == user_id else c.user_a_id
                other = _profile(session, other_id)
                if not other:
                    continue
                last = session.query(ChatMessage).filter(
                    ChatMessage.conv_id == c.conv_id
                ).order_by(ChatMessage.created_at.desc()).first()
                unread = session.query(ChatMessage).filter(
                    ChatMessage.conv_id == c.conv_id,
                    ChatMessage.sender_id != user_id,
                    ChatMessage.read_at.is_(None),
                ).count()
                out.append({
                    "conv_id": c.conv_id,
                    "other": {k: other[k] for k in ("user_id", "username", "full_name", "role", "chat_available")},
                    "locked": me is not None and not _can_chat(me, other),
                    "last_message": _msg_dict(last) if last else None,
                    "unread": unread,
                })
            return out

    @staticmethod
    def purge_conversations_with_experts(user_id):
        """Delete this user's conversations (and messages) with anyone who is
        a verified expert. Called when the user themselves becomes a verified
        expert — expert<->expert chat isn't allowed, so any investor<->expert
        history they built up before verification is no longer valid."""
        with get_session() as session:
            convs = session.query(Conversation).filter(
                or_(Conversation.user_a_id == user_id,
                    Conversation.user_b_id == user_id)
            ).all()
            for c in convs:
                other_id = c.user_b_id if c.user_a_id == user_id else c.user_a_id
                other = _profile(session, other_id)
                if other and other["role"] == "expert":
                    session.query(ChatMessage).filter(
                        ChatMessage.conv_id == c.conv_id).delete()
                    session.delete(c)

    @staticmethod
    def get_messages(conv_id, user_id, limit=50):
        """Thread history (oldest→newest). Marks the other side's messages read."""
        with get_session() as session:
            conv = session.query(Conversation).filter(
                Conversation.conv_id == conv_id).first()
            if not conv or user_id not in (conv.user_a_id, conv.user_b_id):
                return None
            msgs = session.query(ChatMessage).filter(
                ChatMessage.conv_id == conv_id
            ).order_by(ChatMessage.created_at.desc()).limit(limit).all()

            now = _now()
            session.query(ChatMessage).filter(
                ChatMessage.conv_id == conv_id,
                ChatMessage.sender_id != user_id,
                ChatMessage.read_at.is_(None),
            ).update({ChatMessage.read_at: now}, synchronize_session=False)

            return [_msg_dict(m) for m in reversed(msgs)]

    @staticmethod
    def unread_total(user_id):
        with get_session() as session:
            convs = session.query(Conversation.conv_id).filter(
                or_(Conversation.user_a_id == user_id,
                    Conversation.user_b_id == user_id)
            ).all()
            ids = [c[0] for c in convs]
            if not ids:
                return 0
            return session.query(ChatMessage).filter(
                ChatMessage.conv_id.in_(ids),
                ChatMessage.sender_id != user_id,
                ChatMessage.read_at.is_(None),
            ).count()

    @staticmethod
    def search_users(query, me_id, limit=10):
        """Find people to chat with by username / full name (excludes admins).
        `locked` marks experts a basic user must subscribe to unlock."""
        q = (query or "").strip()
        if len(q) < 2:
            return []
        with get_session() as session:
            me = _profile(session, me_id)
            users = session.query(UserAccount).filter(
                and_(
                    UserAccount.user_id != me_id,
                    or_(UserAccount.username.ilike(f"%{q}%"),
                        UserAccount.full_name.ilike(f"%{q}%")),
                )
            ).limit(limit * 2).all()
            out = []
            for u in users:
                p = _profile(session, u.user_id)
                if not p or p["role"] == "admin":
                    continue
                # Messages is an expert-consultation channel: experts are
                # listed for investors (locked for basic ones, as an upsell)
                # but never for other experts — expert-expert chat is a hard
                # rule, not a premium paywall, so it shouldn't show a
                # misleading "upgrade to unlock" lock icon. Investors appear
                # only to people allowed to chat with them.
                if p["role"] == "expert" and me is not None and me["role"] == "expert":
                    continue
                chatable = me is not None and _can_chat(me, p)
                if p["role"] != "expert" and not chatable:
                    continue
                out.append({
                    **{k: p[k] for k in ("user_id", "username", "full_name", "role")},
                    "locked": not chatable,
                    "chat_available": p["chat_available"],
                })
                if len(out) >= limit:
                    break
            return out
