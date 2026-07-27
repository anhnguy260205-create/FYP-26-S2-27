from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount
from app.control.controller.notificationc import create_notification, get_welcome_notification
from app.control.services.firebase_admin_service import delete_firebase_user_by_email


class CreateAccountController:
    def createAccount(self, role, username, email_address) -> bool:
        # Roles were merged: every new signup is an investor. Users can later
        # upgrade to expert (trade 30 stocks + 200% profit margin, then submit
        # documents for review) — see /expert/eligibility and /expert/apply.
        return Investor.createAccount(username=username, email_address=email_address)


class LogoutController:
    def logout(self, user_id):
        return UserAccount.logout(user_id)


class InvestorInformationController:
    def get_investor_information(self, user_id):
        return Investor.get_investor_information(user_id)


class ExpertInformationController:
    def get_expert_information(self, user_id):
        return Expert.get_expert_information(user_id)


class UpdateInformationController:
    def update_information(self, user_id, user_name, full_name, email_address, phone_number, address):
        return UserAccount.updateInformation(user_id, user_name, full_name, email_address, phone_number, address)


class DeleteInvestorController:
    def delete_account(self, user_id):
        info = UserAccount.get_user_information(user_id)
        deleted = Investor.deleteInvestor(user_id)
        if deleted and info:
            delete_firebase_user_by_email(info["email_address"])
        return deleted


class DeleteExpertController:
    def delete_account(self, user_id):
        info = UserAccount.get_user_information(user_id)
        deleted = Expert.deleteExpert(user_id)
        if deleted and info:
            delete_firebase_user_by_email(info["email_address"])
        return deleted



class FirebaseLoginController:
    def login(self, email: str):
        profile = UserAccount.getProfileByEmail(email)
        if not profile:
            return None
        if profile.get("first_login") and profile["role"] in ("investor", "expert"):
            welcome_role = "expert" if profile.get("is_expert") else profile["role"]
            title, message = get_welcome_notification(welcome_role)
            create_notification(
                profile["user_id"],
                "welcome",
                title,
                message,
            )
        return profile
