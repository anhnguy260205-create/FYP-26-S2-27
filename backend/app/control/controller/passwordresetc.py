from app.entity.models.useraccount import UserAccount
from app.entity.models.password_reset import PasswordReset
from app.control.services.email_service import send_password_reset_email
from app.control.services.firebase_admin_service import update_password_by_email


class ForgotPasswordController:
    def request_otp(self, email_address):
        email_exists = UserAccount.emailExists(email_address)
        if not email_exists:
            return {"success": True, "message": "If this email is registered, a verification code has been sent."}

        otp_code = PasswordReset.createOtp(email_address)
        send_password_reset_email(email_address, otp_code)

        return {"success": True, "message": "If this email is registered, a verification code has been sent."}


class VerifyOtpController:
    def verify(self, email_address, otp_code):
        is_valid = PasswordReset.verifyOtp(email_address, otp_code, consume=False)
        if not is_valid:
            return {"success": False, "message": "Invalid or expired verification code"}
        return {"success": True, "message": "Code verified"}


class ResetPasswordController:
    def reset_password(self, email_address, otp_code, new_password):
        is_valid = PasswordReset.verifyOtp(email_address, otp_code, consume=True)
        if not is_valid:
            return {"success": False, "message": "Invalid or expired verification code"}

        updated = update_password_by_email(email_address, new_password)
        if not updated:
            return {"success": False, "message": "Account not found or Firebase error"}

        return {"success": True, "message": "Password has been reset successfully"}
