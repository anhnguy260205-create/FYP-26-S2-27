import os
import threading
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel

from app.control.services.email_service import send_welcome_email, send_account_deletion_otp_email
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
from app.control.services.auth import get_current_user, get_current_user_pre_mfa, mfa_satisfied, invalidate_profile_cache
from app.control.services.rate_limit import limiter

router = APIRouter(prefix="/user", tags=["User"])


def _env_true(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _send_or_queue_login_otp(background_tasks: BackgroundTasks, email: str, otp: str):
    """Send login OTP.

    Default is synchronous so local/dev immediately shows Gmail failures in the
    API response and backend terminal. On Render, set LOGIN_OTP_BACKGROUND=true
    after email delivery is confirmed if you want faster response time.
    """
    from app.control.services.email_service import send_login_otp_email

    print(f"[MFA] login OTP for {email}: {otp}")
    if _env_true("LOGIN_OTP_BACKGROUND", False):
        background_tasks.add_task(send_login_otp_email, email, otp)
        return None
    return bool(send_login_otp_email(email, otp))


#  Public: registration 

class CreateAccountRequest(BaseModel):
    # Kept for backward compatibility but ignored — all signups are investors.
    role: Optional[str] = "investor"
    username: str
    email_address: str
    recaptcha_token: Optional[str] = None


@router.post("/create-account")
@limiter.limit("5/minute")
def create_account(request: Request, data: CreateAccountRequest):
    from app.control.services.captcha import verify_recaptcha
    client_ip = request.client.host if request.client else None
    if not verify_recaptcha(data.recaptcha_token, client_ip):
        return {"success": False, "message": "CAPTCHA verification failed. Please try again."}
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
            # allow logging in with the email address directly
            user = session.query(UserAccount).filter(
                UserAccount.email_address == name.lower()
            ).first()
        if not user:
            return {"success": False, "message": "No account found with this username"}
        return {"success": True, "email": user.email_address}


#  Auth: login/logout

@router.post("/firebase-login")
def firebase_login(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_pre_mfa),
):
    """Exchange a verified Firebase token for the full internal user profile.

    Every login additionally requires an email OTP (2nd factor): the first
    call of a new login session sends the code and returns mfa_required=True;
    the frontend then calls /user/mfa/verify to complete the login."""
    if not mfa_satisfied(current_user):
        from app.entity.models.login_mfa import LoginMfaOtp
        email = current_user["email"]
        otp = LoginMfaOtp.create_otp(email)
        email_sent = _send_or_queue_login_otp(background_tasks, email, otp)
        message = (
            "Verification code sent."
            if email_sent is not False
            else "Verification code was generated, but email sending failed. Check backend terminal [EMAIL] logs."
        )
        return {
            "success": True,
            "mfa_required": True,
            "email": email,
            "email_sent": email_sent,
            "message": message,
        }

    profile = FirebaseLoginController().login(current_user["email"])
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "mfa_required": False, "user": profile}


@router.get("/session")
def get_session(current_user: dict = Depends(get_current_user)):
    """Lightweight role/is_expert/verification/subscription check the
    frontend re-runs on every protected-route navigation, so admin-side
    changes (e.g. an expert's verification being cancelled) show up without
    requiring the user to log out and back in. No DB write side-effects —
    backed by the same 60s-cached lookup used for request authorization."""
    return {
        "success": True,
        "user": {
            "user_id": current_user.get("user_id"),
            "role": current_user.get("role"),
            "is_expert": current_user.get("is_expert"),
            "verification_status": current_user.get("verification_status"),
            "subscription_status": current_user.get("subscription_status"),
        },
    }


#  Auth: login email OTP (2nd factor, all roles)

class MfaVerifyRequest(BaseModel):
    otp_code: str


@router.post("/mfa/verify")
@limiter.limit("10/minute")
def mfa_verify(request: Request, data: MfaVerifyRequest,
               current_user: dict = Depends(get_current_user_pre_mfa)):
    """Verify the emailed OTP for the current login session."""
    from app.entity.models.login_mfa import LoginMfaOtp, LoginMfaSession

    auth_time = current_user.get("auth_time")
    if auth_time is None:
        auth_time = 0

    ok, message = LoginMfaOtp.verify_otp(current_user["email"], data.otp_code.strip())
    if not ok:
        return {"success": False, "message": message}

    LoginMfaSession.mark_verified(current_user["email"], auth_time)
    profile = FirebaseLoginController().login(current_user["email"])
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "user": profile}


@router.post("/mfa/resend")
@limiter.limit("3/minute")
def mfa_resend(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_pre_mfa),
):
    """Send a fresh login OTP (invalidates previous ones)."""
    from app.entity.models.login_mfa import LoginMfaOtp

    if mfa_satisfied(current_user):
        return {"success": True, "message": "No verification needed."}
    email = current_user["email"]
    otp = LoginMfaOtp.create_otp(email)
    email_sent = _send_or_queue_login_otp(background_tasks, email, otp)
    message = (
        "A new code has been sent."
        if email_sent is not False
        else "A new code was generated, but email sending failed. Check backend terminal [EMAIL] logs."
    )
    return {"success": True, "message": message, "email_sent": email_sent}


class LogoutRequest(BaseModel):
    user_id: str


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    from app.control.controller.userc import LogoutController
    result = LogoutController().logout(current_user["user_id"])
    if not result:
        return {"success": False, "message": "Logout failed"}
    return {"success": True, "message": "Logout successful"}


#  Auth: user information 

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


#  Auth: update/delete 

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


@router.post("/delete-investor/request-otp")
@limiter.limit("5/minute")
def request_delete_otp(request: Request, current_user: dict = Depends(get_current_user)):
    """Step 1 of the secured delete flow: email a 6-digit OTP to the account
    holder. Deleting also requires the transaction PIN, so this is 2FA."""
    from app.entity.models.password_reset import PasswordReset
    email = current_user["email"]
    otp = PasswordReset.createOtp(email)
    try:
        send_account_deletion_otp_email(email, otp)
    except Exception as e:
        print(f"[DELETE] Failed to send deletion OTP to {email}: {e}")
        return {"success": False, "message": "Could not send verification email. Please try again."}
    return {"success": True, "message": "A verification code has been sent to your email."}


class DeleteInvestorRequest(BaseModel):
    pin: Optional[str] = None
    otp: Optional[str] = None


@router.delete("/delete-investor/{user_id}")
def delete_account(
    user_id: str,
    data: DeleteInvestorRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    # Self-service deletion is gated by three checks. Admins deleting another
    # account bypass the PIN/OTP (they've authenticated as admin) but the
    # account must still be emptied first.
    from app.entity.models.investor import Investor
    from app.entity.models.password_reset import PasswordReset

    portfolio = Investor.getPortfolio(user_id)
    if portfolio:
        holdings = [h for h in (portfolio.get("holdings") or []) if (h.get("quantity") or 0) > 0]
        if holdings:
            raise HTTPException(
                status_code=409,
                detail="You still hold stocks. Sell all your holdings before deleting your account.",
            )
        if round(float(portfolio.get("assets") or 0), 2) > 0:
            raise HTTPException(
                status_code=409,
                detail="You still have assets in your account. Cash out your full balance before deleting your account.",
            )

    is_self = current_user["user_id"] == user_id
    if is_self:
        # 6-digit transaction PIN
        if not Investor.hasTransactionPin(user_id):
            raise HTTPException(status_code=428, detail="Set a transaction PIN before deleting your account.")
        if not data.pin or not Investor.verifyTransactionPin(user_id, data.pin):
            raise HTTPException(status_code=403, detail="Incorrect transaction PIN")
        # Email OTP
        if not data.otp or not PasswordReset.verifyOtp(current_user["email"], data.otp.strip()):
            raise HTTPException(status_code=403, detail="Invalid or expired email verification code.")

    # Grab the target's email before the row is gone, so the auth-profile
    # cache (keyed by email, up to 60s stale — see auth._PROFILE_TTL) can be
    # busted immediately. Without this, re-registering the same email right
    # after deletion could keep resolving to the deleted account's stale
    # cached profile/user_id for up to a minute.
    from app.entity.models.useraccount import UserAccount
    deleted_email = (UserAccount.get_user_information(user_id) or {}).get("email_address")

    result = DeleteInvestorController().delete_account(user_id)
    if not result:
        return {"success": False, "message": "Account not found"}
    if deleted_email:
        invalidate_profile_cache(deleted_email)
    return {"success": True, "message": "Account deleted successfully"}


@router.delete("/delete-expert/{user_id}")
def delete_expert_account(
    user_id: str, current_user: dict = Depends(get_current_user)
):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    from app.entity.models.useraccount import UserAccount
    deleted_email = (UserAccount.get_user_information(user_id) or {}).get("email_address")

    result = DeleteExpertController().delete_account(user_id)
    if not result:
        return {"success": False, "message": "Account not found"}
    if deleted_email:
        invalidate_profile_cache(deleted_email)
    return {"success": True, "message": "Account deleted successfully"}


#  Auth: watchlist 

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


#  Auth: interests / risk tolerance 

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


#  Auth: 6-digit transaction PIN

class SetPinRequest(BaseModel):
    pin: str
    confirm_pin: str


class VerifyPinRequest(BaseModel):
    pin: str


@router.get("/pin/status")
def pin_status(current_user: dict = Depends(get_current_user)):
    """Whether the caller has set a transaction PIN — drives the first-login
    setup flow and the trade/cash-out PIN prompt."""
    from app.entity.models.investor import Investor
    return {"success": True, "has_pin": Investor.hasTransactionPin(current_user["user_id"])}


@router.post("/pin/set")
@limiter.limit("10/minute")
def set_pin(request: Request, data: SetPinRequest,
            current_user: dict = Depends(get_current_user)):
    from app.entity.models.investor import Investor
    pin = (data.pin or "").strip()
    confirm = (data.confirm_pin or "").strip()
    if not (pin.isdigit() and len(pin) == 6):
        return {"success": False, "message": "PIN must be exactly 6 digits"}
    if pin != confirm:
        return {"success": False, "message": "PINs do not match"}
    return Investor.setTransactionPin(current_user["user_id"], pin)


@router.post("/pin/verify")
@limiter.limit("10/minute")
def verify_pin(request: Request, data: VerifyPinRequest,
               current_user: dict = Depends(get_current_user)):
    from app.entity.models.investor import Investor
    valid = Investor.verifyTransactionPin(current_user["user_id"], (data.pin or "").strip())
    return {"success": True, "valid": valid}
