from sqlalchemy import Column, ForeignKey, String, DateTime
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from app.entity.models.investor import Investor


class DashboardUsage(Base):
    """Tracks which stocks a basic investor has opened the real-time dashboard for.

    Basic plan: lifetime limit of BASIC_DASHBOARD_LIMIT distinct stocks.
    Re-opening an already-unlocked stock is free (one row per investor+symbol).
    Premium investors and non-investors (experts/admins) are never limited.

    Flow (see stock_ws.py): `check` gates access WITHOUT consuming, and the
    dashboard page calls `record_view` immediately once access is granted.
    """
    __tablename__ = "dashboard_usage"

    usage_id = Column(String(50), primary_key=True,
                      default=lambda: f"dashview_{uuid4()}")
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    stock_symbol = Column(String(20), nullable=False)
    first_viewed_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))

    BASIC_DASHBOARD_LIMIT = 3

    @staticmethod
    def _investor_state(session, user_id):
        """(investor, unlocked_symbols) — investor is None for experts/admins."""
        investor = session.query(Investor).filter(
            Investor.user_id == user_id).first()
        if not investor:
            return None, set()
        rows = session.query(DashboardUsage).filter(
            DashboardUsage.investor_id == investor.investor_id).all()
        return investor, {r.stock_symbol for r in rows}

    @staticmethod
    def check(user_id, stock_symbol):
        """Is this user allowed to open this stock's dashboard? (no side effects)"""
        symbol = stock_symbol.upper()
        with get_session() as session:
            investor, unlocked = DashboardUsage._investor_state(session, user_id)
            if not investor or investor.investor_subscription_status == "premium":
                return {"allowed": True, "limit_reached": False,
                        "views_used": None, "limit": None}
            limit = DashboardUsage.BASIC_DASHBOARD_LIMIT
            if symbol in unlocked or len(unlocked) < limit:
                return {"allowed": True, "limit_reached": False,
                        "views_used": len(unlocked), "limit": limit}
            return {"allowed": False, "limit_reached": True,
                    "views_used": len(unlocked), "limit": limit}

    @staticmethod
    def record_view(user_id, stock_symbol):
        """Consume quota after access was granted. Returns updated usage."""
        symbol = stock_symbol.upper()
        with get_session() as session:
            investor, unlocked = DashboardUsage._investor_state(session, user_id)
            if not investor or investor.investor_subscription_status == "premium":
                return {"views_used": None, "limit": None}
            if symbol not in unlocked:
                session.add(DashboardUsage(
                    investor_id=investor.investor_id, stock_symbol=symbol))
                session.flush()
                unlocked.add(symbol)
            return {"views_used": len(unlocked),
                    "limit": DashboardUsage.BASIC_DASHBOARD_LIMIT}

    @staticmethod
    def get_usage(user_id):
        """Read-only usage summary (for showing 'x of 3 used' in the UI)."""
        with get_session() as session:
            investor, unlocked = DashboardUsage._investor_state(session, user_id)
            if not investor or investor.investor_subscription_status == "premium":
                return {"views_used": None, "limit": None, "premium": True}
            return {"views_used": len(unlocked),
                    "limit": DashboardUsage.BASIC_DASHBOARD_LIMIT,
                    "premium": False,
                    "unlocked_symbols": sorted(unlocked)}
