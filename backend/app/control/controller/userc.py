from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount


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
        return Investor.deleteInvestor(user_id)


class FirebaseLoginController:
    def login(self, email: str):
        return UserAccount.getProfileByEmail(email)
