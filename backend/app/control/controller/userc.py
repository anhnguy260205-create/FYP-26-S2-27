from app.entity.models.investor import Investor
from app.entity.models.expert import Expert

class CreateAccountController:
    def createAccount(role, username, full_name, email_address, password, phone_number, address, stock_level, experience_year, linked_in_url) -> bool:
        if role =="expert":
            return Investor.createAccount(username, full_name, email_address, password, phone_number, address, experience_year, linked_in_url)
        else: 
            return Expert.createAccount(username, full_name, email_address, password, phone_number, address, stock_level)
