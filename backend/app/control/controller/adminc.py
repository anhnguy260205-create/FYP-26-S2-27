from datetime import timedelta
from zoneinfo import ZoneInfo
from datetime import datetime as dt
from sqlalchemy import func
from app.entity.database.session import get_session
from app.entity.models.useraccount import UserAccount
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.subscription import Subscription
from app.entity.models.expertverification import ExpertVerification
from app.entity.models.wallet import (
    PlatformRevenue, REVENUE_SOURCES, REVENUE_SOURCE_LABELS,
)

# Verification states that make someone an actual Expert rather than an investor who merely applied.
_APPROVED_VERIFICATION = {"approved", "active", "verified"}


def _classify_user(session, investor, expert):
    approved_expert = False
    if expert:
        verification = session.query(ExpertVerification).filter(
            ExpertVerification.expert_id == expert.expert_id
        ).first()
        status = (verification.verification_status or "").lower() if verification else ""
        approved_expert = status in _APPROVED_VERIFICATION

    if investor:
        tier = "Premium" if investor.investor_subscription_status == "premium" else "Basic"
    else:
        tier = ""

    if approved_expert:
        # Verified experts get complimentary premium benefits, so show that rather than whatever they last paid for.
        return "Expert", tier or "Premium"
    if investor or expert:
        return "Investor", tier
    return "Admin", ""


class AdminUserAccountController:
    def getUserAccounts(self, keyword=None, role=None, status=None, tier=None):
        with get_session() as session:
            query = (
                session.query(UserAccount, Investor, Expert)
                .outerjoin(Investor, UserAccount.user_id == Investor.user_id)
                .outerjoin(Expert, UserAccount.user_id == Expert.user_id)
            )

            if keyword:
                search = f"%{keyword}%"
                query = query.filter(
                    (UserAccount.username.like(search)) |
                    (UserAccount.full_name.like(search)) |
                    (UserAccount.email_address.like(search)) |
                    (UserAccount.phone_number.like(search)) |
                    (UserAccount.user_id.like(search))
                )

            if status:
                query = query.filter(UserAccount.account_status == status)

            results = query.all()

            users = []

            for user_account, investor, expert in results:
                user_role, subscription_tier = _classify_user(
                    session, investor, expert)

                if user_role == "Admin":
                    continue

                if role and user_role.lower() != role.lower():
                    continue

                if tier and subscription_tier.lower() != tier.lower():
                    continue

                users.append({
                    "initials": self.makeInitials(user_account.full_name),
                    "user_id": user_account.user_id,
                    "username": user_account.username,
                    "full_name": user_account.full_name,
                    "email_address": user_account.email_address,
                    "phone_number": str(user_account.phone_number),
                    "address": user_account.address,
                    "role": user_role,
                    "subscription_tier": subscription_tier,
                    "account_status": user_account.account_status,
                    "join_date": user_account.join_date.strftime("%Y-%m-%d") if user_account.join_date else None,
                    "last_login": user_account.last_login.strftime("%Y-%m-%d") if user_account.last_login else None,
                    "is_active": user_account.is_active,
                })

            return users

    def makeInitials(self, full_name):
        if not full_name:
            return "NA"

        parts = full_name.split()

        if len(parts) == 1:
            return parts[0][:2].upper()

        return (parts[0][0] + parts[-1][0]).upper()

    def getUserAccountById(self, user_id):
        with get_session() as session:
            result = (
                session.query(UserAccount, Investor, Expert)
                .outerjoin(Investor, UserAccount.user_id == Investor.user_id)
                .outerjoin(Expert, UserAccount.user_id == Expert.user_id)
                .filter(UserAccount.user_id == user_id)
                .first()
            )

            if not result:
                return None

            user_account, investor, expert = result

            user_role, subscription_tier = _classify_user(
                session, investor, expert)

            return {
                "initials": self.makeInitials(user_account.full_name),
                "user_id": user_account.user_id,
                "username": user_account.username,
                "full_name": user_account.full_name,
                "email_address": user_account.email_address,
                "phone_number": str(user_account.phone_number),
                "address": user_account.address,
                "role": user_role,
                "subscription_tier": subscription_tier,
                "account_status": user_account.account_status,
                "join_date": user_account.join_date.strftime("%Y-%m-%d") if user_account.join_date else None,
                "last_login": user_account.last_login.strftime("%Y-%m-%d") if user_account.last_login else None,
                "is_active": user_account.is_active,
            }

    def suspendUserAccount(self, user_id):
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()

            if not user:
                return None

            user.account_status = "suspended"
            user.is_active = False

            session.commit()
            return user.email_address

    def activateUserAccount(self, user_id):
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()

            if not user:
                return None

            user.account_status = "active"
            user.is_active = True

            session.commit()
            return user.email_address

    def getDashboardStats(self):
        with get_session() as session:
            total_users = (
                session.query(UserAccount)
                .join(Investor, UserAccount.user_id == Investor.user_id, isouter=True)
                .join(Expert, UserAccount.user_id == Expert.user_id, isouter=True)
                .filter((Investor.investor_id != None) | (Expert.expert_id != None))
                .count()
            )
            total_premium = session.query(Investor).filter(
                Investor.investor_subscription_status == "premium"
            ).count()
            total_investors = session.query(Investor).count()
            total_basic = total_investors - total_premium
            total_experts = session.query(Expert).count()
            return {
                "total_users": total_users,
                "total_basic": total_basic,
                "total_premium": total_premium,
                "total_experts": total_experts,
            }

    # ── Revenue ──────────────────────────────────────────────────────────
    #
    # These read the platform_revenue ledger, NOT the subscription table.
    # Every earning event — subscriptions, trading commission, and the
    # platform's cut of chat gifts — is booked there as it happens, so the
    # admin panel reports one total that actually covers the whole platform.
    # Historic subscriptions are backfilled into the ledger at startup
    # (see wallet.backfill_subscription_revenue), so nothing is lost.

    def getRevenueStats(self):
        totals = PlatformRevenue.get_totals_by_source()
        return {
            "total_revenue": totals["total"],
            "by_source": {
                source: totals[source] for source in REVENUE_SOURCES
            },
            "source_labels": REVENUE_SOURCE_LABELS,
        }

    def getRevenueByMonth(self, months=6):
        months = max(1, min(months, 24))
        series = PlatformRevenue.get_monthly_series(months)

        # RevenueBarChart reads point.revenue, so keep that key as the monthly
        # TOTAL and carry the per-source split alongside it.
        for point in series:
            point["revenue"] = point["total"]

        totals = PlatformRevenue.get_totals_by_source()
        window_by_source = {
            source: round(sum(p[source] for p in series), 2)
            for source in REVENUE_SOURCES
        }

        return {
            "months": months,
            "total": round(sum(point["revenue"] for point in series), 2),
            "series": series,
            # Totals for the selected window, and all-time for context.
            "by_source": window_by_source,
            "all_time": totals,
            "source_labels": REVENUE_SOURCE_LABELS,
        }

    def getRevenueLedger(self, source=None, limit=100):
        """Line-by-line revenue for the admin drill-down."""
        if source and source not in REVENUE_SOURCES:
            return {"success": False,
                    "message": f"Unknown revenue source: {source}"}

        rows = PlatformRevenue.get_recent(limit=limit, source=source)

        # The ledger stores only user_id — resolve display names in one query.
        user_ids = {r["user_id"] for r in rows if r["user_id"]}
        names = {}
        if user_ids:
            with get_session() as session:
                names = {
                    uid: (full_name or username or "—")
                    for uid, full_name, username in session.query(
                        UserAccount.user_id,
                        UserAccount.full_name,
                        UserAccount.username,
                    ).filter(UserAccount.user_id.in_(list(user_ids))).all()
                }
        for row in rows:
            row["user_name"] = names.get(row["user_id"], "—")

        return {
            "success": True,
            "transactions": rows,
            "count": len(rows),
            "source_labels": REVENUE_SOURCE_LABELS,
        }

    # ── Payment transactions (read-only monitoring) ─────────────────────
    #
    # These read the wallet_transaction ledger — every cash-in, cash-out,
    # gift and payout across all investors. The finance admin only WATCHES
    # here; there is no approve/reject action wired to these endpoints.

    def getWalletTransactions(self, txn_type=None, status=None, limit=200):
        from app.entity.models.wallet import WalletTransaction
        limit = max(1, min(limit, 500))
        with get_session() as session:
            return WalletTransaction.get_all_for_admin(
                session, limit=limit, txn_type=txn_type, status=status)

    def getPaymentSummary(self):
        from app.entity.models.wallet import WalletTransaction
        return WalletTransaction.get_platform_totals()

    def getUserTypeBreakdown(self):
        with get_session() as session:
            total_premium = session.query(Investor).filter(
                Investor.investor_subscription_status == "premium"
            ).count()
            total_investors = session.query(Investor).count()
            total_basic = total_investors - total_premium
            total_experts = session.query(Expert).count()

            breakdown = [
                {"type": "Basic Investor", "count": total_basic},
                {"type": "Premium Investor", "count": total_premium},
                {"type": "Expert", "count": total_experts},
            ]

            return {
                "total": total_basic + total_premium + total_experts,
                "breakdown": breakdown,
            }

    def getSignupStats(self, days=30):
        days = max(1, min(days, 90))
        with get_session() as session:
            today = dt.now(ZoneInfo("Asia/Singapore")).date()
            start_date = today - timedelta(days=days - 1)

            rows = (
                session.query(UserAccount.join_date)
                .join(Investor, UserAccount.user_id == Investor.user_id, isouter=True)
                .join(Expert, UserAccount.user_id == Expert.user_id, isouter=True)
                .filter((Investor.investor_id != None) | (Expert.expert_id != None))
                .filter(UserAccount.join_date != None)
                .all()
            )

            counts = {}
            for (join_date,) in rows:
                signup_day = join_date.date()
                if start_date <= signup_day <= today:
                    counts[signup_day] = counts.get(signup_day, 0) + 1

            series = []
            day = start_date
            while day <= today:
                series.append({"date": day.strftime("%Y-%m-%d"), "count": counts.get(day, 0)})
                day += timedelta(days=1)

            return {
                "days": days,
                "total": sum(point["count"] for point in series),
                "series": series,
            }

    def getAllExperts(self):
        return Expert.get_all_for_admin()

    def setExpertVerificationStatus(self, expert_id, status):
        return Expert.set_verification_status(expert_id, status)

    def getSubscriptions(self):
        with get_session() as session:
            rows = (
                session.query(Subscription, Investor, UserAccount)
                .join(Investor, Subscription.investor_id == Investor.investor_id)
                .join(UserAccount, Investor.user_id == UserAccount.user_id)
                .order_by(Subscription.sub_date.desc())
                .all()
            )
            return [
                {
                    "sub_id": sub.sub_id,
                    "full_name": user.full_name,
                    "email_address": user.email_address,
                    "username": user.username,
                    "plan_type": sub.plan_type,
                    "sub_status": sub.sub_status,
                    "sub_date": sub.sub_date.strftime("%Y-%m-%d") if sub.sub_date else None,
                    "sub_renewal_date": sub.sub_renewal_date.strftime("%Y-%m-%d") if sub.sub_renewal_date else None,
                }
                for sub, investor, user in rows
            ]
