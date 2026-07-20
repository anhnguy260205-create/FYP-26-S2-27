from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request

from app.control.controller.passwordresetc import (
    LookupAccountController,
    ForgotPasswordController,
    VerifyOtpController,
    ResetPasswordController,
    ChangePasswordController,
)
from app.control.services.auth import get_current_user
from app.control.services.rate_limit import limiter

router = APIRouter(prefix="/user", tags=["Password Reset"])


# ---- Step 0: lookup account by email (no OTP sent) ----
class LookupAccountRequest(BaseModel):
    email_address: str


@router.post("/lookup-account")
@limiter.limit("10/minute")
def lookup_account(request: Request, data: LookupAccountRequest):
    return LookupAccountController().lookup(data.email_address.strip().lower())


# ---- Step 1: request OTP ----
class ForgotPasswordRequest(BaseModel):
    email_address: str


class ForgotPasswordPage:
    def __init__(self):
        self.controller = ForgotPasswordController()

    def request_otp(self, email_address):
        return self.controller.request_otp(email_address)


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, data: ForgotPasswordRequest):
    boundary = ForgotPasswordPage()
    result = boundary.request_otp(data.email_address.strip().lower())
    return result


# ---- Step 2: verify OTP ----
class VerifyOtpRequest(BaseModel):
    email_address: str
    otp_code: str


class VerifyOtpPage:
    def __init__(self):
        self.controller = VerifyOtpController()

    def verify(self, email_address, otp_code):
        return self.controller.verify(email_address, otp_code)


@router.post("/verify-reset-otp")
def verify_reset_otp(data: VerifyOtpRequest):
    boundary = VerifyOtpPage()
    result = boundary.verify(data.email_address.strip().lower(), data.otp_code.strip())
    return result


# ---- Step 3: reset password ----
class ResetPasswordRequest(BaseModel):
    email_address: str
    otp_code: str
    new_password: str


class ResetPasswordPage:
    def __init__(self):
        self.controller = ResetPasswordController()

    def reset_password(self, email_address, otp_code, new_password):
        return self.controller.reset_password(email_address, otp_code, new_password)


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, data: ResetPasswordRequest):
    boundary = ResetPasswordPage()

    if len(data.new_password) < 8:
        return {"success": False, "message": "Password must be at least 8 characters"}

    result = boundary.reset_password(
        data.email_address.strip().lower(),
        data.otp_code.strip(),
        data.new_password
    )
    return result


# ---- Change password (authenticated users) ----
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangePasswordBoundary:
    def __init__(self):
        self.controller = ChangePasswordController()

    def change_password(self, email, current_password, new_password):
        return self.controller.change_password(email, current_password, new_password)


@router.post("/change-password")
def change_password(data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if len(data.new_password) < 8 or len(data.new_password) > 24:
        return {"success": False, "message": "Password must be 8-24 characters"}
    if data.new_password == data.current_password:
        return {"success": False, "message": "New password must be different from your current password"}
    boundary = ChangePasswordBoundary()
    return boundary.change_password(current_user["email"], data.current_password, data.new_password)
