from sqlalchemy import Column, ForeignKey, String, DateTime
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from app.entity.models.investor import Investor


class Watchlist(Base):
    __tablename__ = "watchlist"

    watchlist_id = Column(String(50), primary_key=True,
                          default=lambda: f"watchlist_{uuid4()}")
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    stock_symbol = Column(String(20), nullable=False)
    added_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))

    BASIC_WATCHLIST_LIMIT = 3

    @staticmethod
    def add_stock(user_id, stock_symbol):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}

            if investor.investor_subscription_status != "premium":
                count = session.query(Watchlist).filter(
                    Watchlist.investor_id == investor.investor_id
                ).count()
                if count >= Watchlist.BASIC_WATCHLIST_LIMIT:
                    return {
                        "success": False,
                        "message": f"Basic plan is limited to {Watchlist.BASIC_WATCHLIST_LIMIT} watchlist stocks. Upgrade to Premium for unlimited.",
                        "limit_reached": True,
                    }

            existing = session.query(Watchlist).filter(
                Watchlist.investor_id == investor.investor_id,
                Watchlist.stock_symbol == stock_symbol.upper()
            ).first()
            if existing:
                return {"success": False, "message": "Stock is already in your watchlist"}

            entry = Watchlist(
                investor_id=investor.investor_id,
                stock_symbol=stock_symbol.upper()
            )
            session.add(entry)
            session.flush()
            return {"success": True, "message": "Stock added to watchlist"}

    @staticmethod
    def remove_stock(user_id, stock_symbol):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}
            entry = session.query(Watchlist).filter(
                Watchlist.investor_id == investor.investor_id,
                Watchlist.stock_symbol == stock_symbol.upper()
            ).first()
            if not entry:
                return {"success": False, "message": "Stock not in watchlist"}
            session.delete(entry)
            return {"success": True}

    @staticmethod
    def get_watchlist(user_id):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return []
            entries = session.query(Watchlist).filter(
                Watchlist.investor_id == investor.investor_id
            ).order_by(Watchlist.added_at.desc()).all()
            return [
                {
                    "watchlist_id": e.watchlist_id,
                    "stock_symbol": e.stock_symbol,
                    "added_at": e.added_at,
                }
                for e in entries
            ]
