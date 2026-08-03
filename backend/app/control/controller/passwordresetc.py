from app.entity.models.useraccount import UserAccount
from app.entity.models.password_reset import PasswordReset
import threading
from app.control.services.email_service import send_password_reset_email, send_password_changed_email
from app.control.services.firebase_admin_service import update_password_by_email, verify_password_firebase


class LookupAccountController:
    def lookup(self, email_address):
        profile = UserAccount.getProfileByEmail(email_address)
        if not profile:
            return {"success": False, "message": "No account found with this email address."}
        return {
            "success": True,
            "username": profile.get("username"),
            "full_name": profile.get("full_name"),
        }


class ForgotPasswordController:
    def request_otp(self, email_address):
        profile = UserAccount.getProfileByEmail(email_address)
        if not profile:
            return {"success": False, "message": "No account found with this email address."}

        otp_code = PasswordReset.createOtp(email_address)
        send_password_reset_email(email_address, otp_code)

        return {"success": True, "message": "Verification code sent."}


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

        threading.Thread(target=send_password_changed_email, args=(email_address,), daemon=True).start()
        return {"success": True, "message": "Password has been reset successfully"}


class ChangePasswordController:
    def change_password(self, email, current_password, new_password):
        # Verify the current password server-side. (Client-side reauthenticate would start a new Firebase session and invalidate the MFA check.)
        if not verify_password_firebase(email, current_password):
            return {"success": False, "message": "Current password is incorrect"}

        updated = update_password_by_email(email, new_password)
        if not updated:
            return {"success": False, "message": "Failed to update password"}

        threading.Thread(target=send_password_changed_email, args=(email,), daemon=True).start()
        return {"success": True, "message": "Password updated successfully"}
