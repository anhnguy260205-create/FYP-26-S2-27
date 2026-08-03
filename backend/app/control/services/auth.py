import time
from typing import Mapping

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.control.services.firebase_admin_service import verify_firebase_token
from app.entity.models.useraccount import UserAccount

security = HTTPBearer(auto_error=False)

# get_auth_profile costs 3 DB queries over the public Railway proxy and runs on
# EVERY authenticated request — cache it briefly. Role changes propagate within
# _PROFILE_TTL seconds, which is fine.
_PROFILE_TTL = 60
_profile_cache: dict = {}  # email -> (expires_at, profile)


def _cached_auth_profile(email: str) -> dict | None:
    now = time.time()
    hit = _profile_cache.get(email)
    if hit and hit[0] > now:
        return hit[1]
    profile = UserAccount.get_auth_profile(email)
    if profile:
        _profile_cache[email] = (now + _PROFILE_TTL, profile)
    else:
        _profile_cache.pop(email, None)
    return profile


def invalidate_profile_cache(email: str) -> None:
    # Invalidate the cached auth profile for a given email, if it exists. This is useful when a user's role or status changes and you want to ensure that subsequent requests fetch the updated profile from the database.
    _profile_cache.pop(email, None)


def _extract_dev_email(headers: Mapping[str, str]) -> str | None:
    for key in ("x-dev-email", "X-Dev-Email", "x-dev-user-email"):
        value = headers.get(key)
        if value:
            return value
    return None


def _resolve_profile_from_token(token: str | None, headers: Mapping[str, str]) -> dict | None:
    if token:
        decoded = verify_firebase_token(token)
        if decoded:
            email = decoded.get("email")
            if email:
                profile = _cached_auth_profile(email)
                if profile:
                    profile = dict(profile)
                    # Firebase login timestamp — identifies this login session for the email-OTP second factor (see login_mfa.py).
                    profile["auth_time"] = decoded.get("auth_time")
                    return profile

    dev_email = _extract_dev_email(headers)
    if dev_email:
        profile = _cached_auth_profile(dev_email)
        print(f"[AUTH] dev fallback email={dev_email!r}")
        if profile:
            profile = dict(profile)
            # Dev-header sessions have no Firebase auth_time; use 0 so they still go through the email OTP once instead of bypassing MFA.
            profile["auth_time"] = 0
            return profile

    return None


def mfa_satisfied(profile: dict) -> bool:
    # Check if the user has satisfied the multi-factor authentication (MFA) requirement. This is determined by checking if the user's email has been verified and if the auth_time from the Firebase token is recent enough to indicate that the user has completed the MFA process. If the auth_time is None, it indicates that there is no session identity, and we treat it as not satisfying MFA.
    auth_time = profile.get("auth_time")
    if auth_time is None:
        # No session identity at all (shouldn't happen) — require OTP under a fixed key rather than silently skipping the second factor.
        auth_time = 0
    from app.entity.models.login_mfa import LoginMfaSession
    return LoginMfaSession.is_verified(profile["email"], auth_time)


def get_current_user_pre_mfa(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    # Get the current authenticated user's profile before checking for multi-factor authentication (MFA). This function extracts the token from the request headers, verifies it, and retrieves the user's profile from the database. If the token is invalid or expired, or if the user is suspended, it raises an HTTPException with the appropriate status code and message.
    token = credentials.credentials if credentials else None
    profile = _resolve_profile_from_token(token, request.headers)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    if profile.get("suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "account_suspended",
                    "message": "Your account has been suspended. Please contact support."},
        )
    return profile


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    profile = get_current_user_pre_mfa(request, credentials)
    if not mfa_satisfied(profile):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "mfa_required",
                    "message": "Email verification required for this login."},
        )
    return profile


def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    # Get the current authenticated user's profile if available, but do not raise an exception if the user is not authenticated. This function is useful for endpoints that can be accessed by both authenticated and unauthenticated users. If the user is authenticated, it returns their profile; otherwise, it returns None.
    token = credentials.credentials if credentials else None
    profile = _resolve_profile_from_token(token, request.headers)
    if profile and profile.get("suspended"):
        return None
    return profile


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

def require_admin_or_hr(
    current_user: dict = Depends(get_current_user)
) -> dict:
    role = current_user.get("role")

    if role not in ["admin", "finance admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or HR access required",
        )

    return current_user
