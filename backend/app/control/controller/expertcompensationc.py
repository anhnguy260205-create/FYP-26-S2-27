from datetime import datetime

from app.entity.models.expert import Expert
from app.entity.models.expertverification import ExpertVerification
from app.entity.models.expertfollow import ExpertFollow
from app.entity.models.gift import Gift
from app.entity.models.expertcompensation import (
    ExpertCompensationLedger,
    RATE_PER_PREMIUM_FOLLOWER,
    FOLLOWER_THRESHOLD,
    calculate_compensation,
    TZ,
    _month_start,
    _add_month,
)

_APPROVED = ("verified", "approved", "active")


class ExpertCompensationController:
    def get_summary(self, user_id) -> dict:
        expert_id = self._resolve_expert_id(user_id)
        if not expert_id:
            return {"success": False, "message": "Expert not found"}

        verification = ExpertVerification.get_for_expert(expert_id)
        verified = str(verification.get("verification_status", "")).lower() in _APPROVED

        follower_count = ExpertFollow.get_follower_count(user_id)
        premium_follower_count = ExpertFollow.get_premium_follower_count(user_id)

        eligible = verified and premium_follower_count > FOLLOWER_THRESHOLD
        # What the current month is worth SO FAR. The figure is snapshotted
        # when the month closes, so it moves as followers come and go until
        # then — it's a projection, not a promise.
        projected_payout = calculate_compensation(
            premium_follower_count) if eligible else 0.0

        now = datetime.now(TZ)
        next_payout_date = _add_month(_month_start(now), 1)

        gift_totals = Gift.get_received_total(user_id)

        return {
            "success": True,
            "verified": verified,
            "eligible": eligible,
            "follower_count": follower_count,
            "premium_follower_count": premium_follower_count,
            "rate_per_premium_follower": RATE_PER_PREMIUM_FOLLOWER,
            "follower_threshold": FOLLOWER_THRESHOLD,
            "projected_payout": projected_payout,
            # Kept under the old key so existing UI bindings keep working.
            "pending_payout": projected_payout,
            "total_earned": ExpertCompensationLedger.get_total_earned(expert_id),
            "next_payout_date": next_payout_date.date().isoformat(),
            "history": ExpertCompensationLedger.get_history(expert_id),
            "gift_count": gift_totals["gift_count"],
            "total_gifts_received": gift_totals["total_received"],
            "ineligible_reason": self._ineligible_reason(
                verified, premium_follower_count),
        }

    @staticmethod
    def _ineligible_reason(verified, premium_follower_count):
        if not verified:
            return "Your expert account is not verified yet."
        if premium_follower_count <= FOLLOWER_THRESHOLD:
            return "You have no premium followers yet."
        return None

    @staticmethod
    def _resolve_expert_id(user_id):
        from app.entity.database.session import get_session
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            return expert.expert_id if expert else None
