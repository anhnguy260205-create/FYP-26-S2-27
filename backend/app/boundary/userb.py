from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter

from app.control.controller.userc import CreateAccountController, InvestorInformationController, LogoutController, ExpertInformationController, UpdateInformationController, DeleteInvestorController, FirebaseLoginController
from app.control.controller.investorc import UpdateStockLevel, AddStockToWatchlist, RemoveStockFromWatchlist, GetWatchlist

router = APIRouter(prefix="/user", tags=["User"])


# Request body model
class CreateAccountRequest(BaseModel):
    role: str
    username: str
    email_address: str

# Create user account


class CreateAccountPage:
    def __init__(self):
        self.controller = CreateAccountController()

    def clickCreateAccount(self, role, username, email_address):
        return self.controller.createAccount(role, username, email_address)


@router.post("/create-account")
def create_account(data: CreateAccountRequest):

    boundary = CreateAccountPage()

    result = boundary.clickCreateAccount(
        data.role,
        data.username,
        data.email_address,
    )

    if result == "duplicate_email":
        return {"success": False, "message": "This email is already registered."}
    if result == "duplicate_username":
        return {"success": False, "message": "This username is already taken. Please choose another."}
    if not result:
        return {"success": False, "message": "Account already exists"}

    return {
        "success": True,
        "message": "Account created successfully",
        "user_id": result
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

# Update user information


class UpdateInformationRequest(BaseModel):
    user_id: str
    user_name: Optional[str] = None
    full_name: Optional[str] = None
    email_address: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None


class UpdateInformationPage:
    def __init__(self):
        self.controller = UpdateInformationController()

    def update_information(self, user_id, user_name, full_name, email_address, phone_number, address):
        return self.controller.update_information(user_id, user_name, full_name, email_address, phone_number, address)


@router.post("/update-information/{user_id}")
def update_information(user_id: str, data: UpdateInformationRequest):
    boundary = UpdateInformationPage()

    result = boundary.update_information(
        user_id,
        data.user_name,
        data.full_name,
        data.email_address,
        data.phone_number,
        data.address
    )

    if not result:
        return {
            "success": False,
            "message": "Failed to update information"
        }
    return {
        "success": True,
        "message": "Information updated successfully"
    }


# Delete Investor
class DeleteInvestorPage:
    def __init__(self):
        self.controller = DeleteInvestorController()

    def delete_account(self, user_id):
        return self.controller.delete_account(user_id)


@router.delete("/delete-investor/{user_id}")
def delete_account(user_id: str):
    boundary = DeleteInvestorPage()

    result = boundary.delete_account(user_id)

    if not result:
        return {
            "success": False,
            "message": "Account not found"
        }
    return {
        "success": True,
        "message": "Account deleted successfully"
    }


class UpdateStockLevelRequest(BaseModel):
    user_id: str
    stock_level: Optional[str] = None


class UpdateInvestorStockLevel:
    def __init__(self):
        self.controller = UpdateStockLevel()

    def update_stock_level(self, user_id, stock_level):
        return self.controller.updateStockLevel(user_id, stock_level)


@router.post("/update_stock_level")
def update_stock_level(data: UpdateStockLevelRequest):
    boundary = UpdateInvestorStockLevel()

    result = boundary.update_stock_level(data.user_id, data.stock_level)
    if not result:
        return {
            "success": False,
            "message": "The stock level is not updated"
        }
    return {
        "success": True,
        "message": "The stock level is successfully updated"
    }


################ Watchlist######################
class AddStockToWatchlistRequest(BaseModel):
    user_id: str
    stock_symbol: str


class AddStockToWatchlistPage:
    def __init__(self):
        self.controller = AddStockToWatchlist()

    def add_stock_symbol(self, user_id, stock_symbol):
        return self.controller.addStockToWatchlist(user_id, stock_symbol)


@router.post("/investor-watchlist/{user_id}")
def add_stock_symbol(user_id, data: AddStockToWatchlistRequest):
    boundary = AddStockToWatchlistPage()

    result = boundary.add_stock_symbol(user_id, data.stock_symbol)
    if not result:
        return {
            "success": False,
            "message": "The stock is fail to add to watchlist"
        }
    return {
        "success": True,
        "message": "The stock is success to be added into watchlist"
    }


@router.get("/investor-watchlist/{user_id}")
def get_watchlist(user_id: str):
    result = GetWatchlist().getWatchlist(user_id)
    return {"success": True, "watchlist": result}


@router.delete("/investor-watchlist/{user_id}/{stock_symbol}")
def remove_stock_symbol(user_id: str, stock_symbol: str):
    result = RemoveStockFromWatchlist().removeStockFromWatchlist(user_id, stock_symbol)
    if not result.get("success"):
        return {"success": False, "message": result.get("message", "Failed to remove stock")}
    return {"success": True, "message": "Stock removed from watchlist"}


class FirebaseLoginRequest(BaseModel):
    email: str


@router.post("/firebase-login")
def firebase_login(data: FirebaseLoginRequest):
    profile = FirebaseLoginController().login(data.email)
    if not profile:
        return {"success": False, "message": "User not found"}
    return {"success": True, "user": profile}
