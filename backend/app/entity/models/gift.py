"""
Chat gifts ("red packets") sent from a premium user to an expert.

The sender picks an amount; it splits 70 / 30 between the expert and the
platform. Both legs land in assets and in the wallet ledger, so a gift
shows up in Transaction History like any other money movement.

This table is the record of the gift itself (who, to whom, how much, the
note). The resulting balance changes live in wallet_transaction and the
platform's cut lives in platform_revenue.
"""
from sqlalchemy import Column, String, Float, DateTime, Text, or_, and_, func
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4

TZ = ZoneInfo("Asia/Singapore")

# Split of every gift. Must sum to 1.0 — asserted at import so a bad edit
# fails loudly at startup instead of quietly losing money.
GIFT_EXPERT_SHARE = 0.70
GIFT_PLATFORM_SHARE = 0.30
assert abs((GIFT_EXPERT_SHARE + GIFT_PLATFORM_SHARE) - 1.0) < 1e-9, \
    "Gift shares must sum to 1.0"

MIN_GIFT_AMOUNT = 1.00
MAX_GIFT_AMOUNT = 10_000.00

# Quick-pick amounts offered in the chat gift dialog.
GIFT_PRESETS = [5, 10, 20, 50, 100, 200]


def split_gift(amount: float) -> tuple[float, float]:
    """(expert_share, platform_share) in dollars.

    The platform takes the remainder rather than its own rounded percentage,
    so the two legs always add back to exactly `amount` — no stray cent
    created or destroyed by double rounding.
    """
    amount = round(float(amount), 2)
    expert_share = round(amount * GIFT_EXPERT_SHARE, 2)
    platform_share = round(amount - expert_share, 2)
    return expert_share, platform_share


class Gift(Base):
    __tablename__ = "chat_gift"

    gift_id = Column(String(50), primary_key=True,
                     default=lambda: f"gift_{uuid4()}")
    sender_user_id = Column(String(50), nullable=False)
    recipient_user_id = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    expert_share = Column(Float, nullable=False)
    platform_share = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(TZ))

    @staticmethod
    def record(session, sender_user_id, recipient_user_id, amount,
               expert_share, platform_share, message=None):
        row = Gift(
            sender_user_id=sender_user_id,
            recipient_user_id=recipient_user_id,
            amount=round(float(amount), 2),
            expert_share=round(float(expert_share), 2),
            platform_share=round(float(platform_share), 2),
            message=(message or "").strip()[:500] or None,
        )
        session.add(row)
        session.flush()
        return row.gift_id

    @staticmethod
    def _serialize(row):
        return {
            "gift_id": row.gift_id,
            "sender_user_id": row.sender_user_id,
            "recipient_user_id": row.recipient_user_id,
            "amount": row.amount,
            "expert_share": row.expert_share,
            "platform_share": row.platform_share,
            "message": row.message,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }

    @staticmethod
    def get_between(user_a, user_b, limit=100):
        """Every gift in either direction between two users, oldest first so
        the chat can merge them into the message timeline."""
        with get_session() as session:
            rows = session.query(Gift).filter(
                or_(
                    and_(Gift.sender_user_id == user_a,
                         Gift.recipient_user_id == user_b),
                    and_(Gift.sender_user_id == user_b,
                         Gift.recipient_user_id == user_a),
                )
            ).order_by(Gift.created_at.asc()).limit(limit).all()
            return [Gift._serialize(r) for r in rows]

    @staticmethod
    def get_received(recipient_user_id, limit=100):
        with get_session() as session:
            rows = session.query(Gift).filter(
                Gift.recipient_user_id == recipient_user_id
            ).order_by(Gift.created_at.desc()).limit(limit).all()
            return [Gift._serialize(r) for r in rows]

    @staticmethod
    def get_received_total(recipient_user_id) -> dict:
        with get_session() as session:
            row = session.query(
                func.count(Gift.gift_id),
                func.coalesce(func.sum(Gift.expert_share), 0.0),
            ).filter(Gift.recipient_user_id == recipient_user_id).first()
            return {
                "gift_count": int(row[0] or 0),
                "total_received": round(float(row[1] or 0), 2),
            }
