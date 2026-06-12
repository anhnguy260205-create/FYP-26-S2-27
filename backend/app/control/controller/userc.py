from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount


class CreateAccountController:
    def createAccount(self, role, username, full_name, email_address, password, phone_number, address, stock_level, experience_year, linked_in_url) -> bool:
        role = role.strip().lower()

        if role == "investor":
            if not stock_level:
                stock_level = "beginner"
            return Investor.createAccount(username, full_name, email_address, password, phone_number, address, stock_level)
        if role == "expert":
            if experience_year in (None, ""):
                return False
            experience_year = int(experience_year)
            return Expert.createAccount(username, full_name, email_address, password, phone_number, address, experience_year, linked_in_url)
        return False


class LoginController:
    def login(self, username, password):
        return UserAccount.login(username, password)


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
    def update_information(self, user_id, full_name, email_address, phone_number, address):
        return UserAccount.updateInformation(user_id, full_name, email_address, phone_number, address)


class DeleteInvestorController:
    def delete_account(self, user_id):
        return Investor.deleteInvestor(user_id)
