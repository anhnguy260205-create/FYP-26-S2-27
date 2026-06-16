from sqlalchemy import Column, ForeignKey, String, Float, Integer, DateTime
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


class Transaction(Base):
    __tablename__ = "transaction"

    transaction_id = Column(String(50), primary_key=True,
                             default=lambda: f"txn_{uuid4()}")
    investor_id = Column(String(50), ForeignKey(
        "investor.investor_id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    transaction_type = Column(String(10), nullable=False)  # "buy" or "sell"
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    transaction_date = Column(DateTime, default=lambda: datetime.now(
        ZoneInfo("Asia/Singapore")))

    @staticmethod
    def createTransaction(investor_id, symbol, transaction_type, quantity, price, total_amount):
        with get_session() as session:
            transaction = Transaction(
                investor_id=investor_id,
                symbol=symbol,
                transaction_type=transaction_type,
                quantity=quantity,
                price=price,
                total_amount=total_amount
            )
            session.add(transaction)
            session.flush()
            return transaction.transaction_id

    @staticmethod
    def getTransactionsByInvestor(investor_id, limit=50):
        with get_session() as session:
            transactions = session.query(Transaction).filter(
                Transaction.investor_id == investor_id
            ).order_by(Transaction.transaction_date.desc()).limit(limit).all()
            return [
                {
                    "transaction_id": t.transaction_id,
                    "symbol": t.symbol,
                    "transaction_type": t.transaction_type,
                    "quantity": t.quantity,
                    "price": t.price,
                    "total_amount": t.total_amount,
                    "transaction_date": t.transaction_date
                }
                for t in transactions
            ]

    @staticmethod
    def getTransactionsByUserId(user_id, limit=100, symbol=None,
                                 transaction_type=None):
        """
        Convenience wrapper that resolves investor_id from user_id, then
        returns transactions with optional symbol / type filters.
        """
        from app.entity.models.investor import Investor
        investor = Investor.getInvestorByUserId(user_id)
        if not investor:
            return None
        investor_id = investor["investor_id"]

        with get_session() as session:
            q = session.query(Transaction).filter(
                Transaction.investor_id == investor_id
            )
            if symbol:
                q = q.filter(Transaction.symbol == symbol.upper())
            if transaction_type in ("buy", "sell"):
                q = q.filter(Transaction.transaction_type == transaction_type)

            rows = q.order_by(Transaction.transaction_date.desc()).limit(limit).all()
            return [
                {
                    "transaction_id": t.transaction_id,
                    "symbol": t.symbol,
                    "transaction_type": t.transaction_type,
                    "quantity": t.quantity,
                    "price": t.price,
                    "total_amount": t.total_amount,
                    "transaction_date": t.transaction_date.isoformat()
                    if t.transaction_date else None,
                }
                for t in rows
            ]

    @staticmethod
    def getSummaryStats(user_id):
        """
        Returns aggregate stats for the Transaction Portal header cards:
        total trades, total spent (buys), total proceeds (sells),
        realised P&L, most-traded symbol.
        """
        from app.entity.models.investor import Investor
        investor = Investor.getInvestorByUserId(user_id)
        if not investor:
            return None
        investor_id = investor["investor_id"]

        with get_session() as session:
            rows = session.query(Transaction).filter(
                Transaction.investor_id == investor_id
            ).all()

        if not rows:
            return {
                "total_trades": 0,
                "total_buy_amount": 0,
                "total_sell_amount": 0,
                "realised_pnl": 0,
                "most_traded_symbol": None,
            }

        total_buy = sum(t.total_amount for t in rows if t.transaction_type == "buy")
        total_sell = sum(t.total_amount for t in rows if t.transaction_type == "sell")

        from collections import Counter
        symbol_counts = Counter(t.symbol for t in rows)
        most_traded = symbol_counts.most_common(1)[0][0] if symbol_counts else None

        return {
            "total_trades": len(rows),
            "total_buy_amount": round(total_buy, 2),
            "total_sell_amount": round(total_sell, 2),
            "realised_pnl": round(total_sell - total_buy, 2),
            "most_traded_symbol": most_traded,
        }
