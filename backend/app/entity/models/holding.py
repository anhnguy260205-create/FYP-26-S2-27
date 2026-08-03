from sqlalchemy import Column, ForeignKey, String, Float, Integer, DateTime
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


class Holding(Base):
    __tablename__ = "holding"

    holding_id = Column(String(50), primary_key=True,
                         default=lambda: f"holding_{uuid4()}")
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    quantity = Column(Integer, default=0)
    average_cost = Column(Float, default=0)
    last_updated = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))

    @staticmethod
    def getHolding(investor_id, symbol):
        with get_session() as session:
            holding = session.query(Holding).filter(
                Holding.investor_id == investor_id,
                Holding.symbol == symbol
            ).first()
            if not holding:
                return None
            return {
                "holding_id": holding.holding_id,
                "investor_id": holding.investor_id,
                "symbol": holding.symbol,
                "quantity": holding.quantity,
                "average_cost": holding.average_cost,
                "last_updated": holding.last_updated
            }

    @staticmethod
    def getHoldingsByInvestor(investor_id):
        with get_session() as session:
            holdings = session.query(Holding).filter(
                Holding.investor_id == investor_id,
                Holding.quantity > 0
            ).all()
            return [
                {
                    "holding_id": h.holding_id,
                    "investor_id": h.investor_id,
                    "symbol": h.symbol,
                    "quantity": h.quantity,
                    "average_cost": h.average_cost,
                    "last_updated": h.last_updated
                }
                for h in holdings
            ]

    @staticmethod
    def addShares(investor_id, symbol, quantity, price):
        """Increase holding quantity and recompute average cost (used on BUY)."""
        with get_session() as session:
            holding = session.query(Holding).filter(
                Holding.investor_id == investor_id,
                Holding.symbol == symbol
            ).first()

            if not holding:
                holding = Holding(
                    investor_id=investor_id,
                    symbol=symbol,
                    quantity=quantity,
                    average_cost=price
                )
                session.add(holding)
            else:
                total_cost = (holding.average_cost *
                               holding.quantity) + (price * quantity)
                holding.quantity += quantity
                holding.average_cost = total_cost / holding.quantity if holding.quantity > 0 else 0
                holding.last_updated = datetime.now(
                    ZoneInfo("Asia/Singapore"))
            session.flush()
            return True

    @staticmethod
    def removeShares(investor_id, symbol, quantity):
        with get_session() as session:
            holding = session.query(Holding).filter(
                Holding.investor_id == investor_id,
                Holding.symbol == symbol
            ).first()

            if not holding or holding.quantity < quantity:
                return False

            holding.quantity -= quantity
            holding.last_updated = datetime.now(ZoneInfo("Asia/Singapore"))

            if holding.quantity == 0:
                holding.average_cost = 0

            session.flush()
            return True
