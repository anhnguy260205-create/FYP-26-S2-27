from sqlalchemy import Column, String, DateTime, Boolean
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from uuid import uuid4
import random


OTP_VALID_MINUTES = 10


class PasswordReset(Base):
    __tablename__ = "password_reset"

    reset_id = Column(String(50), primary_key=True,
                       default=lambda: f"reset_{uuid4()}")
    email_address = Column(String(255), nullable=False)
    otp_code = Column(String(10), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))
    expires_at = Column(DateTime, nullable=False)

    @staticmethod
    def createOtp(email_address) -> str:
        """Generate a 6-digit OTP, store it, and return the code."""
        otp_code = f"{random.randint(0, 999999):06d}"
        now = datetime.now(ZoneInfo("Asia/Singapore"))
        expires_at = now + timedelta(minutes=OTP_VALID_MINUTES)

        with get_session() as session:
            # Invalidate any previous unused OTPs for this email
            session.query(PasswordReset).filter(
                PasswordReset.email_address == email_address,
                PasswordReset.is_used == False
            ).update({"is_used": True})

            reset_entry = PasswordReset(
                email_address=email_address,
                otp_code=otp_code,
                created_at=now,
                expires_at=expires_at,
                is_used=False
            )
            session.add(reset_entry)
            session.flush()

        return otp_code

    @staticmethod
    def verifyOtp(email_address, otp_code, consume=True) -> bool:
        now = datetime.now(ZoneInfo("Asia/Singapore"))
        with get_session() as session:
            entry = session.query(PasswordReset).filter(
                PasswordReset.email_address == email_address,
                PasswordReset.otp_code == otp_code,
                PasswordReset.is_used == False
            ).order_by(PasswordReset.created_at.desc()).first()

            if not entry:
                return False

            expires_at = entry.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=ZoneInfo("Asia/Singapore"))

            if expires_at < now:
                return False

            if consume:
                entry.is_used = True
            return True
