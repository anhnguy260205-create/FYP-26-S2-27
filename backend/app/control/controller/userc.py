from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount
from app.control.controller.notificationc import create_notification
from app.control.services.firebase_admin_service import delete_firebase_user_by_email


class CreateAccountController:
    def createAccount(self, role, username, email_address) -> bool:
        role = role.strip().lower()

        if role == "investor":
            return Investor.createAccount(username=username, email_address=email_address)
        if role == "expert":
            return Expert.createAccount(username=username, email_address=email_address)
        return False


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


WELCOME_MESSAGE = {
    "investor": "👋 Welcome to RocketTrade! Explore the latest market trends, manage your portfolio, and discover new investment opportunities with AI-powered insights.",
    "expert": "👋 Welcome to RocketTrade! Share your market expertise, connect with investors, and help the community make informed investment decisions.",

}


class FirebaseLoginController:
    def login(self, email: str):
        profile = UserAccount.getProfileByEmail(email)
        if not profile:
            return None
        if profile.get("first_login") and profile["role"] in WELCOME_MESSAGE:
            create_notification(
                profile["user_id"],
                "welcome",
                "Welcome to RocketTrade!",
                WELCOME_MESSAGE[profile["role"]],
            )
        return profile
