from app.entity.models.investor import Investor
from app.entity.models.expert import Expert

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
