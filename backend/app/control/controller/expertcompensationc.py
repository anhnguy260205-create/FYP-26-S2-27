from datetime import datetime

from app.entity.models.expert import Expert
from app.entity.models.expertverification import ExpertVerification
from app.entity.models.expertfollow import ExpertFollow
from app.entity.models.expertcompensation import (
    ExpertCompensationLedger,
    FOLLOWER_THRESHOLD,
    EXPERT_MONTHLY_COMPENSATION_AMOUNT,
    TZ,
    _month_start,
    _add_month,
)


class ExpertCompensationController:
    def get_summary(self, user_id) -> dict:
        expert_id = self._resolve_expert_id(user_id)
        if not expert_id:
            return {"success": False, "message": "Expert not found"}

        verification = ExpertVerification.get_for_expert(expert_id)
        verified = str(verification.get("verification_status", "")).lower() in (
            "verified", "approved")
        follower_count = ExpertFollow.get_follower_count(user_id)
        eligible = verified and follower_count > FOLLOWER_THRESHOLD
        pending_payout = EXPERT_MONTHLY_COMPENSATION_AMOUNT if eligible else 0.0

        now = datetime.now(TZ)
        next_payout_date = _add_month(_month_start(now), 1)

        return {
            "success": True,
            "verified": verified,
            "eligible": eligible,
            "follower_count": follower_count,
            "follower_threshold": FOLLOWER_THRESHOLD,
            "flat_monthly_amount": EXPERT_MONTHLY_COMPENSATION_AMOUNT,
            "pending_payout": pending_payout,
            "total_earned": ExpertCompensationLedger.get_total_earned(expert_id),
            "next_payout_date": next_payout_date.date().isoformat(),
            "history": ExpertCompensationLedger.get_history(expert_id),
        }

    @staticmethod
    def _resolve_expert_id(user_id):
        from app.entity.database.session import get_session
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            return expert.expert_id if expert else None
