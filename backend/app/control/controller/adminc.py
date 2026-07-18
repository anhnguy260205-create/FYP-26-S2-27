from datetime import timedelta
from zoneinfo import ZoneInfo
from datetime import datetime as dt
from sqlalchemy import func
from app.entity.database.session import get_session
from app.entity.models.useraccount import UserAccount
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.subscription import Subscription


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
                if expert:
                    user_role = "Expert"
                    subscription_tier = ""
                elif investor:
                    user_role = "Investor"
                    subscription_tier = "Premium" if investor.investor_subscription_status == "premium" else "Basic"
                else:
                    user_role = "Admin"
                    subscription_tier = ""

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

            if expert:
                user_role = "Expert"
                subscription_tier = ""
            elif investor:
                user_role = "Investor"
                subscription_tier = "Premium" if investor.investor_subscription_status == "premium" else "Basic"
            else:
                user_role = "Admin"
                subscription_tier = ""

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
                return False

            user.account_status = "suspended"
            user.is_active = False

            session.commit()
            return True

    def activateUserAccount(self, user_id):
        with get_session() as session:
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()

            if not user:
                return False

            user.account_status = "active"
            user.is_active = True

            session.commit()
            return True

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
            total_experts = session.query(Expert).count()
            return {
                "total_users": total_users,
                "total_premium": total_premium,
                "total_experts": total_experts,
            }

    def getRevenueStats(self):
        with get_session() as session:
            total_cents = session.query(func.sum(Subscription.amount)).scalar() or 0
            return {"total_revenue": round(total_cents / 100, 2)}

    def getRevenueByMonth(self, months=6):
        months = max(1, min(months, 24))
        with get_session() as session:
            rows = (
                session.query(Subscription.sub_date, Subscription.amount)
                .filter(Subscription.sub_date != None)
                .all()
            )

            monthly_cents = {}
            for sub_date, amount in rows:
                key = sub_date.strftime("%Y-%m")
                monthly_cents[key] = monthly_cents.get(key, 0) + (amount or 0)

            today = dt.now(ZoneInfo("Asia/Singapore")).date().replace(day=1)
            series = []
            for i in range(months - 1, -1, -1):
                year = today.year
                month = today.month - i
                while month <= 0:
                    month += 12
                    year -= 1
                key = f"{year:04d}-{month:02d}"
                series.append({
                    "month": key,
                    "revenue": round(monthly_cents.get(key, 0) / 100, 2),
                })

            return {
                "months": months,
                "total": round(sum(point["revenue"] for point in series), 2),
                "series": series,
            }

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
