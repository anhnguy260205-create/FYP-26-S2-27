from typing import Optional, Union
from pydantic import BaseModel
from fastapi import APIRouter

from app.control.controller.userc import CreateAccountController, InvestorInformationController, LoginController, LogoutController, InvestorInformationController, ExpertInformationController

router = APIRouter(prefix="/user", tags=["User"])


# Request body model
class CreateAccountRequest(BaseModel):
    role: str
    username: str
    full_name: str
    email_address: str
    password: str
    phone_number: str
    address: str
    stock_level: Optional[str] = "beginner"
    experience_year: Optional[Union[int, str]] = None
    linked_in_url: Optional[str] = None

# Create user account


class CreateAccountPage:
    def __init__(self):
        self.controller = CreateAccountController()

    def clickCreateAccount(self, role, username, full_name, email_address, password, phone_number, address, stock_level, experience_year, linked_in_url):

        return self.controller.createAccount(role, username, full_name, email_address, password, phone_number, address, stock_level, experience_year, linked_in_url)


@router.post("/create-account")
def create_account(data: CreateAccountRequest):

    boundary = CreateAccountPage()

    result = boundary.clickCreateAccount(
        data.role,
        data.username,
        data.full_name,
        data.email_address,
        data.password,
        data.phone_number,
        data.address,
        data.stock_level,
        data.experience_year,
        data.linked_in_url
    )

    if result == False:
        return {
            "success": False,
            "message": "Account already exists"
        }

    return {
        "success": True,
        "message": "Account created successfully",
        "user_id": result
    }

# Login


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginPage:
    def __init__(self):
        self.controller = LoginController()

    def login(self, username, password):
        return self.controller.login(username, password)


@router.post("/login")
def login(data: LoginRequest):

    boundary = LoginPage()

    result = boundary.login(
        data.username,
        data.password
    )

    if not result.get("success"):
        return {
            "success": False,
            "message": "Invalid username or password"
        }

    return {
        "success": True,
        "message": "Login successful",
        "user": result.get("user")
    }

# Logout


class LogoutRequest(BaseModel):
    user_id: str


class LogoutPage:
    def __init__(self):
        self.controller = LogoutController()

    def logout(self, user_id):
        return self.controller.logout(user_id)


@router.post("/logout")
def logout(data: LogoutRequest):

    boundary = LogoutPage()

    result = boundary.logout(data.user_id)
    if not result:
        return {
            "success": False,
            "message": "Logout failed"
        }
    return {
        "success": True,
        "message": "Logout successful"
    }


# Display user information (for both investor and expert)


class InvestorInformationPage:
    def __init__(self):
        self.controller = InvestorInformationController()

    def get_investor_information(self, user_id):
        return self.controller.get_investor_information(user_id)


@router.get("/investor-information/{user_id}")
def get_investor_information(user_id: str):
    boundary = InvestorInformationPage()

    result = boundary.get_investor_information(user_id)
    if not result:
        return {
            "success": False,
            "message": "Investor information not found"
        }
    return {
        "success": True,
        "message": "Investor information retrieved successfully",
        "investor_information": result
    }


class ExpertInformationPage:
    def __init__(self):
        self.controller = ExpertInformationController()

    def get_expert_information(self, user_id):
        return self.controller.get_expert_information(user_id)


@router.get("/expert-information/{user_id}")
def get_expert_information(user_id: str):
    boundary = ExpertInformationPage()

    result = boundary.get_expert_information(user_id)
    if not result:
        return {
            "success": False,
            "message": "Expert information not found"
        }
    return {
        "success": True,
        "message": "Expert information retrieved successfully",
        "expert_information": result
    }
