from datetime import datetime

from sqlalchemy import text, func

from app.entity.database.session import get_session
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.expertverification import ExpertVerification
from app.entity.models.gift import (
    Gift, split_gift, MIN_GIFT_AMOUNT, MAX_GIFT_AMOUNT, GIFT_PRESETS,
    GIFT_EXPERT_SHARE, GIFT_PLATFORM_SHARE, TZ,
)
from app.entity.models.wallet import (
    WalletTransaction, PlatformRevenue,
    TXN_GIFT_SENT, TXN_GIFT_RECEIVED, REV_GIFT_COMMISSION,
)
from app.entity.models.useraccount import UserAccount
from app.control.controller.notificationc import create_notification

_APPROVED = {"approved", "active", "verified"}


def _is_premium(session, user_id) -> bool:
    # Determine if a user is premium, either as a premium investor or a verified expert. This is used to enforce the rule that only premium users can send gifts.
    investor = session.query(Investor).filter(
        Investor.user_id == user_id).first()
    if investor and investor.investor_subscription_status == "premium":
        return True

    expert = session.query(Expert).filter(Expert.user_id == user_id).first()
    if expert:
        verification = session.query(ExpertVerification).filter(
            ExpertVerification.expert_id == expert.expert_id).first()
        if verification and (verification.verification_status or "").lower() in _APPROVED:
            return True
    return False


class SendGiftController:
    def send(self, sender_user_id, expert_user_id, amount, message=None) -> dict:
        if str(sender_user_id) == str(expert_user_id):
            return {"success": False, "message": "You cannot gift yourself"}

        try:
            amount = round(float(amount), 2)
        except (TypeError, ValueError):
            return {"success": False, "message": "Amount must be a number"}

        if amount < MIN_GIFT_AMOUNT:
            return {"success": False,
                    "message": f"Minimum gift is ${MIN_GIFT_AMOUNT:,.2f}"}
        if amount > MAX_GIFT_AMOUNT:
            return {"success": False,
                    "message": f"Maximum gift is ${MAX_GIFT_AMOUNT:,.2f}"}

        expert_share, platform_share = split_gift(amount)

        with get_session() as session:
            # daily limit check — the platform caps how much a user can send in gifts per day, to prevent abuse and encourage moderation.
            today_start = datetime.now(TZ).replace(
                hour=0, minute=0, second=0, microsecond=0)
            sent_today = session.query(
                func.coalesce(func.sum(Gift.amount), 0.0)
            ).filter(
                Gift.sender_user_id == sender_user_id,
                Gift.created_at >= today_start,
            ).scalar()
            sent_today = round(float(sent_today or 0), 2)
            if sent_today + amount > MAX_GIFT_AMOUNT:
                remaining = max(round(MAX_GIFT_AMOUNT - sent_today, 2), 0)
                return {
                    "success": False,
                    "message": (
                        f"Daily gift limit is ${MAX_GIFT_AMOUNT:,.2f} — "
                        f"you've already sent ${sent_today:,.2f} today "
                        f"(${remaining:,.2f} remaining)"
                    ),
                }

            #  recipient must be an expert 
            expert = session.query(Expert).filter(
                Expert.user_id == expert_user_id).first()
            if not expert:
                return {"success": False,
                        "message": "Gifts can only be sent to experts"}

            #  sender must be premium 
            if not _is_premium(session, sender_user_id):
                return {
                    "success": False,
                    "premium_required": True,
                    "message": "Only premium members can send gifts",
                }

            sender_investor = session.query(Investor).filter(
                Investor.user_id == sender_user_id).first()
            if not sender_investor:
                return {"success": False, "message": "Sender account not found"}

            recipient_investor = session.query(Investor).filter(
                Investor.user_id == expert_user_id).first()
            if not recipient_investor:
                # Under merged roles every expert also has an investor row;
                # without one there's no balance to credit.
                return {"success": False,
                        "message": "Expert has no wallet to receive gifts"}

            #  funds check 
            balance = round(float(sender_investor.assets or 0), 2)
            if balance < amount:
                return {
                    "success": False,
                    "message": (
                        f"Insufficient balance — you have ${balance:,.2f}, "
                        f"gift is ${amount:,.2f}"
                    ),
                }

            sender_id = sender_investor.investor_id
            recipient_id = recipient_investor.investor_id
            recipient_balance = round(
                float(recipient_investor.assets or 0), 2)

            #  move the money 
            session.execute(
                text("UPDATE investor SET assets = assets - :a "
                     "WHERE investor_id = :iid"),
                {"a": amount, "iid": sender_id},
            )
            session.execute(
                text("UPDATE investor SET assets = assets + :a "
                     "WHERE investor_id = :iid"),
                {"a": expert_share, "iid": recipient_id},
            )

            sender_balance_after = round(balance - amount, 2)
            recipient_balance_after = round(
                recipient_balance + expert_share, 2)

            gift_id = Gift.record(
                session, sender_user_id, expert_user_id, amount,
                expert_share, platform_share, message,
            )

            sender_name = self._display_name(session, sender_user_id)
            expert_name = self._display_name(session, expert_user_id)

            WalletTransaction.record(
                session, sender_id, TXN_GIFT_SENT, -amount,
                description=f"Gift to {expert_name}",
                reference_id=gift_id,
                balance_after=sender_balance_after,
            )
            WalletTransaction.record(
                session, recipient_id, TXN_GIFT_RECEIVED, expert_share,
                description=(
                    f"Gift from {sender_name} "
                    f"(${amount:,.2f} less {GIFT_PLATFORM_SHARE:.0%} platform fee)"
                ),
                reference_id=gift_id,
                balance_after=recipient_balance_after,
            )
            PlatformRevenue.record(
                session, REV_GIFT_COMMISSION, platform_share,
                user_id=sender_user_id,
                reference_id=gift_id,
                description=(
                    f"{GIFT_PLATFORM_SHARE:.0%} commission on ${amount:,.2f} "
                    f"gift from {sender_name} to {expert_name}"
                ),
            )

        try:
            create_notification(
                expert_user_id, "gift", "You received a gift",
                f"{sender_name} sent you ${amount:,.2f} — "
                f"${expert_share:,.2f} credited after the platform fee.",
            )
        except Exception as e:
            print(f"[GIFT] notification failed: {e}")

        return {
            "success": True,
            "message": f"Gift of ${amount:,.2f} sent to {expert_name}",
            "gift_id": gift_id,
            "amount": amount,
            "expert_share": expert_share,
            "platform_share": platform_share,
            "assets": sender_balance_after,
        }

    @staticmethod
    def _display_name(session, user_id):
        user = session.query(UserAccount).filter(
            UserAccount.user_id == user_id).first()
        if not user:
            return "Unknown"
        return user.full_name or user.username or "Unknown"


class GetGiftController:
    def get_between(self, user_id, other_user_id) -> dict:
        return {
            "success": True,
            "gifts": Gift.get_between(user_id, other_user_id),
            "presets": GIFT_PRESETS,
            "min_amount": MIN_GIFT_AMOUNT,
            "max_amount": MAX_GIFT_AMOUNT,
            "expert_share_percent": round(GIFT_EXPERT_SHARE * 100),
            "platform_share_percent": round(GIFT_PLATFORM_SHARE * 100),
        }

    def get_received(self, user_id) -> dict:
        return {
            "success": True,
            "gifts": Gift.get_received(user_id),
            **Gift.get_received_total(user_id),
        }
