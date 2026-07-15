from sqlalchemy import Column, ForeignKey, String, DateTime, Integer, Float, Boolean, UniqueConstraint
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4

# Gate + flat payout amount for the expert compensation program.
# EXPERT_MONTHLY_COMPENSATION_AMOUNT is a placeholder — confirm the real
# figure with product before this is treated as final.
FOLLOWER_THRESHOLD = 1000
EXPERT_MONTHLY_COMPENSATION_AMOUNT = 500.0

TZ = ZoneInfo("Asia/Singapore")


def _month_start(dt):
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_month(dt, months=1):
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    return dt.replace(year=year, month=month)


def _previous_completed_month_bounds(now):
    """Returns (period_start, period_end) for the most recently COMPLETED
    calendar month relative to `now` — e.g. if now is any day in July, this
    is [June 1, July 1)."""
    current_month_start = _month_start(now)
    period_start = _add_month(current_month_start, -1)
    period_end = current_month_start
    return period_start, period_end


class ExpertCompensationLedger(Base):
    """One row per expert per completed calendar month. Materialized lazily
    by a daily poller (see main.py) rather than computed on read, so payout
    history is real and doesn't retroactively change if the expert's
    follower count changes later (e.g. after an unfollow).

    Calculated/displayed only — no real money moves for this feature.
    """
    __tablename__ = "expert_compensation_ledger"
    __table_args__ = (UniqueConstraint(
        "expert_id", "period_start", name="uq_expert_compensation_period"),)

    ledger_id = Column(String(50), primary_key=True,
                       default=lambda: f"complog_{uuid4()}")
    expert_id = Column(String(50), ForeignKey(
        "expert.expert_id"), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    follower_count = Column(Integer, nullable=False, default=0)
    eligible = Column(Boolean, default=False)
    amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(TZ))

    @staticmethod
    def materialize_completed_months():
        """Called by the daily poller. For every expert, if the most
        recently completed calendar month has no ledger row yet, snapshot
        their current follower count + verification status and insert one.
        Idempotent — safe to call repeatedly (unique constraint + existence
        check)."""
        from app.entity.models.expert import Expert
        from app.entity.models.expertfollow import ExpertFollow
        from app.entity.models.expertverification import ExpertVerification

        now = datetime.now(TZ)
        period_start, period_end = _previous_completed_month_bounds(now)

        with get_session() as session:
            experts = session.query(Expert).all()
            for expert in experts:
                exists = session.query(ExpertCompensationLedger).filter(
                    ExpertCompensationLedger.expert_id == expert.expert_id,
                    ExpertCompensationLedger.period_start == period_start,
                ).first()
                if exists:
                    continue

                verification = ExpertVerification.get_for_expert(expert.expert_id)
                verified = str(verification.get("verification_status", "")).lower() in (
                    "verified", "approved")
                follower_count = ExpertFollow.get_follower_count(expert.user_id)
                eligible = verified and follower_count > FOLLOWER_THRESHOLD
                amount = EXPERT_MONTHLY_COMPENSATION_AMOUNT if eligible else 0.0

                session.add(ExpertCompensationLedger(
                    expert_id=expert.expert_id,
                    period_start=period_start,
                    period_end=period_end,
                    follower_count=follower_count,
                    eligible=eligible,
                    amount=amount,
                ))
            session.flush()

    @staticmethod
    def get_history(expert_id, limit=12) -> list:
        with get_session() as session:
            rows = session.query(ExpertCompensationLedger).filter(
                ExpertCompensationLedger.expert_id == expert_id
            ).order_by(ExpertCompensationLedger.period_start.desc()).limit(limit).all()
            return [
                {
                    "period_start": r.period_start,
                    "period_end": r.period_end,
                    "follower_count": r.follower_count,
                    "eligible": r.eligible,
                    "amount": r.amount,
                }
                for r in rows
            ]

    @staticmethod
    def get_total_earned(expert_id) -> float:
        with get_session() as session:
            rows = session.query(ExpertCompensationLedger).filter(
                ExpertCompensationLedger.expert_id == expert_id
            ).all()
            return sum(r.amount for r in rows)
