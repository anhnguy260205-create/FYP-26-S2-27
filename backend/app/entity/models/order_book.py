from sqlalchemy import Column, ForeignKey, String, Float, Integer, DateTime
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


class OrderBook(Base):
    __tablename__ = "order_book"

    order_id = Column(String(50), primary_key=True, default=lambda: f"ord_{uuid4()}")
    investor_id = Column(String(50), ForeignKey("investor.investor_id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    order_type = Column(String(10), nullable=False)   # "buy" | "sell"
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)             # limit price
    filled_quantity = Column(Integer, default=0)
    status = Column(String(20), default="pending")   # pending|partial|filled|cancelled
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    @staticmethod
    def create(investor_id: str, symbol: str, order_type: str, quantity: int, price: float) -> str:
        with get_session() as session:
            order = OrderBook(
                investor_id=investor_id,
                symbol=symbol,
                order_type=order_type,
                quantity=quantity,
                price=price,
            )
            session.add(order)
            session.flush()
            return order.order_id

    @staticmethod
    def get_counterpart_orders(symbol: str, counterpart_type: str, limit_price: float) -> list:
      
        with get_session() as session:
            q = session.query(OrderBook).filter(
                OrderBook.symbol == symbol,
                OrderBook.order_type == counterpart_type,
                OrderBook.status.in_(["pending", "partial"]),
            )
            if counterpart_type == "sell":
                q = q.filter(OrderBook.price <= limit_price).order_by(
                    OrderBook.price.asc(), OrderBook.created_at.asc()
                )
            else:
                q = q.filter(OrderBook.price >= limit_price).order_by(
                    OrderBook.price.desc(), OrderBook.created_at.asc()
                )
            rows = q.all()
            return [
                {
                    "order_id": r.order_id,
                    "investor_id": r.investor_id,
                    "quantity": r.quantity,
                    "price": r.price,
                    "filled_quantity": r.filled_quantity,
                    "remaining": r.quantity - r.filled_quantity,
                }
                for r in rows
            ]

    @staticmethod
    def get_orders_by_user(user_id: str, symbol: str = None, limit: int = 20) -> list:
        from app.entity.models.investor import Investor
        investor = Investor.getInvestorByUserId(user_id)
        if not investor:
            return []
        investor_id = investor["investor_id"]
        with get_session() as session:
            q = session.query(OrderBook).filter(OrderBook.investor_id == investor_id)
            if symbol:
                q = q.filter(OrderBook.symbol == symbol.upper())
            rows = q.order_by(OrderBook.created_at.desc()).limit(limit).all()
            return [
                {
                    "order_id": r.order_id,
                    "symbol": r.symbol,
                    "order_type": r.order_type,
                    "quantity": r.quantity,
                    "price": r.price,
                    "filled_quantity": r.filled_quantity,
                    "remaining": r.quantity - r.filled_quantity,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]

    @staticmethod
    def cancel(order_id: str, investor_id: str) -> bool:
        with get_session() as session:
            order = session.query(OrderBook).filter(
                OrderBook.order_id == order_id,
                OrderBook.investor_id == investor_id,
                OrderBook.status.in_(["pending", "partial"]),
            ).first()
            if not order:
                return False
            order.status = "cancelled"
            return True
