"""
login_mfa.py
============
Email-OTP verification for logins (2nd factor). Admins are exempt — the check
lives in app/control/services/auth.py.

Two tables:
  * login_mfa_otp     — one row per issued OTP (mirrors password_reset).
  * login_mfa_session — one row per VERIFIED login session. A "session" is
    identified by (email, auth_time): Firebase puts the login timestamp in
    every ID token as `auth_time`, and it stays constant across token
    refreshes but changes on every re-login. So verifying once covers the
    whole session, and a new login requires a new OTP.
"""

from sqlalchemy import Column, String, DateTime, Boolean, Integer, BigInteger
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from uuid import uuid4
import random

OTP_VALID_MINUTES = 10
MAX_ATTEMPTS = 5

# In-memory cache of verified (email, auth_time) pairs so get_current_user
# doesn't hit the DB on every request. Safe: entries only ever go from
# unverified -> verified, and a restart just repopulates from the DB.
_verified_cache: set = set()


class LoginMfaOtp(Base):
    __tablename__ = "login_mfa_otp"

    otp_id = Column(String(50), primary_key=True, default=lambda: f"mfa_{uuid4()}")
    email_address = Column(String(255), nullable=False, index=True)
    otp_code = Column(String(10), nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    expires_at = Column(DateTime, nullable=False)

    @staticmethod
    def create_otp(email_address: str) -> str:
        """Generate a 6-digit OTP, invalidate previous ones, return the code."""
        otp_code = f"{random.randint(0, 999999):06d}"
        now = datetime.now(ZoneInfo("Asia/Singapore"))
        with get_session() as session:
            session.query(LoginMfaOtp).filter(
                LoginMfaOtp.email_address == email_address,
                LoginMfaOtp.is_used == False,  # noqa: E712
            ).update({"is_used": True})
            session.add(LoginMfaOtp(
                email_address=email_address,
                otp_code=otp_code,
                created_at=now,
                expires_at=now + timedelta(minutes=OTP_VALID_MINUTES),
                is_used=False,
                attempts=0,
            ))
            session.flush()
        return otp_code

    @staticmethod
    def verify_otp(email_address: str, otp_code: str) -> tuple[bool, str]:
        """Check the latest active OTP. Returns (ok, message).

        Wrong code increments `attempts`; after MAX_ATTEMPTS the OTP is burned
        and the user must request a new one."""
        now = datetime.now(ZoneInfo("Asia/Singapore"))
        with get_session() as session:
            entry = session.query(LoginMfaOtp).filter(
                LoginMfaOtp.email_address == email_address,
                LoginMfaOtp.is_used == False,  # noqa: E712
            ).order_by(LoginMfaOtp.created_at.desc()).first()

            if not entry:
                return False, "No active code — please request a new one."

            expires_at = entry.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=ZoneInfo("Asia/Singapore"))
            if expires_at < now:
                return False, "Code expired — please request a new one."

            if entry.otp_code != otp_code:
                entry.attempts = (entry.attempts or 0) + 1
                if entry.attempts >= MAX_ATTEMPTS:
                    entry.is_used = True
                    return False, "Too many wrong attempts — please request a new code."
                return False, "Incorrect code."

            entry.is_used = True
            return True, "Verified."


class LoginMfaSession(Base):
    __tablename__ = "login_mfa_session"

    session_id = Column(String(50), primary_key=True, default=lambda: f"mfas_{uuid4()}")
    email_address = Column(String(255), nullable=False, index=True)
    auth_time = Column(BigInteger, nullable=False)
    verified_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    @staticmethod
    def mark_verified(email_address: str, auth_time: int) -> None:
        with get_session() as session:
            session.add(LoginMfaSession(email_address=email_address, auth_time=int(auth_time)))
            session.flush()
        _verified_cache.add((email_address, int(auth_time)))

    @staticmethod
    def is_verified(email_address: str, auth_time: int) -> bool:
        key = (email_address, int(auth_time))
        if key in _verified_cache:
            return True
        with get_session() as session:
            hit = session.query(LoginMfaSession).filter(
                LoginMfaSession.email_address == email_address,
                LoginMfaSession.auth_time == int(auth_time),
            ).first()
        if hit:
            _verified_cache.add(key)
            return True
        return False
