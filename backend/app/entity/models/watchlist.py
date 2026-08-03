from sqlalchemy import Column, String, DateTime, UniqueConstraint
from sqlalchemy.exc import IntegrityError
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert


class Watchlist(Base):
    __tablename__ = "watchlist"
    __table_args__ = (
        UniqueConstraint("user_id", "stock_symbol", name="uq_watchlist_user_symbol"),
    )

    watchlist_id = Column(String(50), primary_key=True,
                          default=lambda: f"watchlist_{uuid4()}")

    user_id = Column(String(50), nullable=True)
    stock_symbol = Column(String(20), nullable=False)
    added_at = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))
    # Define a limit for the number of stocks that can be added to a basic watchlist.
    BASIC_WATCHLIST_LIMIT = 3
    # Handle stock watchlist operations for both investors and experts, including adding, removing, and retrieving stocks from a user's watchlist.
    @staticmethod
    def add_stock(user_id, stock_symbol):
        with get_session() as session:
            # Check if the user is an investor or an expert
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            expert = None if investor else session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            if not investor and not expert:
                return {"success": False, "message": "User not found"}

            # Experts and premium investors have no cap — only basic-plan investors do.
            if investor and investor.investor_subscription_status != "premium":
                count = session.query(Watchlist).filter(
                    Watchlist.user_id == user_id
                ).count()
                if count >= Watchlist.BASIC_WATCHLIST_LIMIT:
                    return {
                        "success": False,
                        "message": f"Basic plan is limited to {Watchlist.BASIC_WATCHLIST_LIMIT} watchlist stocks. Upgrade to Premium for unlimited.",
                        "limit_reached": True,
                    }
            # Check if the stock is already in the user's watchlist
            existing = session.query(Watchlist).filter(
                Watchlist.user_id == user_id,
                Watchlist.stock_symbol == stock_symbol.upper()
            ).first()
            if existing:
                return {"success": False, "message": "Stock is already in your watchlist"}
            # Add the stock to the user's watchlist
            entry = Watchlist(
                user_id=user_id,
                stock_symbol=stock_symbol.upper()
            )
            session.add(entry)
            try:
                session.flush()
            except IntegrityError:
                # If the stock is already in the watchlist, rollback the session and return an error message.
                session.rollback()
                return {"success": False, "message": "Stock is already in your watchlist"}
            return {"success": True, "message": "Stock added to watchlist"}

    @staticmethod
    def remove_stock(user_id, stock_symbol):
        with get_session() as session:
            # Check if the stock is in the user's watchlist
            entry = session.query(Watchlist).filter(
                Watchlist.user_id == user_id,
                Watchlist.stock_symbol == stock_symbol.upper()
            ).first()
            # If the stock is not found, return an error message. 
            if not entry:
                return {"success": False, "message": "Stock not in watchlist"}
            # Otherwise, delete the entry from the watchlist.
            session.delete(entry)
            return {"success": True}

    @staticmethod
    def get_watchlist(user_id):
        with get_session() as session:
            entries = session.query(Watchlist).filter(
                Watchlist.user_id == user_id
            ).order_by(Watchlist.added_at.desc()).all()
            return [
                {
                    "watchlist_id": e.watchlist_id,
                    "stock_symbol": e.stock_symbol,
                    "added_at": e.added_at,
                }
                for e in entries
            ]
