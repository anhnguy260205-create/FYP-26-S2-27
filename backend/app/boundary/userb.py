import threading
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.control.services.email_service import send_welcome_email
from app.control.controller.userc import (
    CreateAccountController,
    InvestorInformationController,
    LogoutController,
    ExpertInformationController,
    UpdateInformationController,
    DeleteInvestorController,
    DeleteExpertController,
    FirebaseLoginController,
)
from app.control.controller.investorc import (
    AddStockToWatchlist,
    RemoveStockFromWatchlist,
    GetWatchlist,
    UpdateInvestorInterestsController,
    UpdateInvestorRiskToleranceController,
)
from app.control.services.auth import get_current_user
from app.control.services.rate_limit import limiter

router = APIRouter(prefix="/user", tags=["User"])


# ── Public: registration ───────────────────────────────────────────────────────

class CreateAccountRequest(BaseModel):
    role: str
    username: str
    email_address: str


@router.post("/create-account")
@limiter.limit("5/minute")
def create_account(request: Request, data: CreateAccountRequest):
    result = CreateAccountController().createAccount(
        data.role, data.username, data.email_address
    )
    if result == "duplicate_email":
        return {"success": False, "message": "This email is already registered."}
    if result == "duplicate_username":
        return {"success": False, "message": "This username is already taken."}
    if not result:
        return {"success": False, "message": "Account already exists"}
    threading.Thread(
        target=send_welcome_email,
        args=(data.email_address, data.username, data.role),
        daemon=True
    ).start()
    return {"success": True, "message": "Account created successfully", "user_id": result}


@router.get("/check-email")
@limiter.limit("20/minute")
def check_email(request: Request, email: str):
    from app.entity.models.useraccount import UserAccount
    exists = UserAccount.emailExists(email.strip().lower())
    return {"exists": exists}


@router.get("/email-by-username")
@limiter.limit("20/minute")
def email_by_username(request: Request, username: str):
    """Resolve a username to its account email (Firebase sign-in needs the
    email). Used by the login page's username-based flow."""
    from app.entity.models.useraccount import UserAccount
    from app.entity.database.session import get_session
    name = username.strip()
    with get_session() as session:
        user = session.query(UserAccount).filter(
            UserAccount.username == name
        ).first()
        if not user:
            # Convenience: allow logging in with the email address directly
            user = session.query(UserAccount).filter(
                UserAccount.email_address == name.lower()
            ).first()
        if not user:
            return {"success": False, "message": "No account found with this username"}
        return {"success": True, "email": user.email_address}


# ── Auth: login/logout ─────────────────────────────────────────────────────────

@router.post("/firebase-login")
def firebase_login(current_user: dict = Depends(get_current_user)):
    """Exchange a verified Firebase token for the full internal user profile."""
    profile = FirebaseLoginController().login(current_user["email"])
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "user": profile}


class LogoutRequest(BaseModel):
    user_id: str


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    from app.control.controller.userc import LogoutController
    result = LogoutController().logout(current_user["user_id"])
    if not result:
        return {"success": False, "message": "Logout failed"}
    return {"success": True, "message": "Logout successful"}


# ── Auth: user information ─────────────────────────────────────────────────────

@router.get("/investor-information/{user_id}")
def get_investor_information(
    user_id: str, current_user: dict = Depends(get_current_user)
):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    result = InvestorInformationController().get_investor_information(user_id)
    if not result:
        return {"success": False, "message": "Investor information not found"}
    return {"success": True, "message": "Investor information retrieved successfully", "investor_information": result}


@router.get("/expert-information/{user_id}")
def get_expert_information(
    user_id: str, current_user: dict = Depends(get_current_user)
):
    result = ExpertInformationController().get_expert_information(user_id)
    if not result:
        return {"success": False, "message": "Expert information not found"}
    return {"success": True, "message": "Expert information retrieved successfully", "expert_information": result}


# ── Auth: update/delete ────────────────────────────────────────────────────────

class UpdateInformationRequest(BaseModel):
    user_name: Optional[str] = None
    full_name: Optional[str] = None
    email_address: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None


@router.post("/update-information/{user_id}")
def update_information(
    user_id: str,
    data: UpdateInformationRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    result = UpdateInformationController().update_information(
        user_id,
        data.user_name,
        data.full_name,
        data.email_address,
        data.phone_number,
        data.address,
    )
    if not result:
        return {"success": False, "message": "Failed to update information"}
    return {"success": True, "message": "Information updated successfully"}


@router.delete("/delete-investor/{user_id}")
def delete_account(
    user_id: str, current_user: dict = Depends(get_current_user)
):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    result = DeleteInvestorController().delete_account(user_id)
    if not result:
        return {"success": False, "message": "Account not found"}
    return {"success": True, "message": "Account deleted successfully"}


@router.delete("/delete-expert/{user_id}")
def delete_expert_account(
    user_id: str, current_user: dict = Depends(get_current_user)
):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    result = DeleteExpertController().delete_account(user_id)
    if not result:
        return {"success": False, "message": "Account not found"}
    return {"success": True, "message": "Account deleted successfully"}


# ── Auth: watchlist ────────────────────────────────────────────────────────────

class AddStockToWatchlistRequest(BaseModel):
    stock_symbol: str


@router.post("/investor-watchlist/{user_id}")
def add_stock_symbol(
    user_id: str,
    data: AddStockToWatchlistRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = AddStockToWatchlist().addStockToWatchlist(user_id, data.stock_symbol)
    if not result.get("success"):
        return {
            "success": False,
            "message": result.get("message", "Failed to add stock to watchlist"),
            "limit_reached": result.get("limit_reached", False),
        }
    return {"success": True, "message": result.get("message", "Stock added to watchlist")}


@router.get("/investor-watchlist/{user_id}")
def get_watchlist(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = GetWatchlist().getWatchlist(user_id)
    return {"success": True, "watchlist": result}


@router.delete("/investor-watchlist/{user_id}/{stock_symbol}")
def remove_stock_symbol(
    user_id: str,
    stock_symbol: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = RemoveStockFromWatchlist().removeStockFromWatchlist(user_id, stock_symbol)
    if not result.get("success"):
        return {"success": False, "message": result.get("message", "Failed to remove stock")}
    return {"success": True, "message": "Stock removed from watchlist"}


# ── Auth: interests / risk tolerance ──────────────────────────────────────────

class UpdateInterestsRequest(BaseModel):
    interests: str


@router.post("/update-interests")
def update_interests(
    data: UpdateInterestsRequest,
    current_user: dict = Depends(get_current_user),
):
    result = UpdateInvestorInterestsController().update(current_user["user_id"], data.interests)
    if not result:
        return {"success": False, "message": "Failed to update interests"}
    return {"success": True, "message": "Interests updated successfully"}


class UpdateRiskToleranceRequest(BaseModel):
    risk_tolerance: str


@router.post("/update-risk-tolerance")
def update_risk_tolerance(
    data: UpdateRiskToleranceRequest,
    current_user: dict = Depends(get_current_user),
):
    result = UpdateInvestorRiskToleranceController().update(current_user["user_id"], data.risk_tolerance)
    if not result:
        return {"success": False, "message": "Failed to update risk tolerance"}
    return {"success": True, "message": "Risk tolerance updated successfully"}
