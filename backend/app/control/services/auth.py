from typing import Mapping

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.control.services.firebase_admin_service import verify_firebase_token
from app.entity.models.useraccount import UserAccount

security = HTTPBearer(auto_error=False)


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
                profile = UserAccount.get_auth_profile(email)
                print(f"[AUTH] token email={email!r} => {profile}")
                if profile:
                    return profile

    dev_email = _extract_dev_email(headers)
    if dev_email:
        profile = UserAccount.get_auth_profile(dev_email)
        print(f"[AUTH] dev fallback email={dev_email!r} => {profile}")
        if profile:
            return profile

    return None


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    token = credentials.credentials if credentials else None
    profile = _resolve_profile_from_token(token, request.headers)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return profile


def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """Like get_current_user, but returns None instead of raising 401 —
    for endpoints that work for both guests and logged-in users, but need
    to know who's asking (e.g. to mark 'is_mine' on a public review list)."""
    token = credentials.credentials if credentials else None
    return _resolve_profile_from_token(token, request.headers)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
