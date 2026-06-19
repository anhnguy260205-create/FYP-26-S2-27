from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter

from app.control.controller.tradingc import (
    BuyStockController,
    SellStockController,
    PortfolioController,
    TransactionHistoryController,
    TransactionPortalController,
)

router = APIRouter(prefix="/trading", tags=["Trading"])


# ---- Buy ----
class BuyStockRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int
    price: float


class BuyStockPage:
    def __init__(self):
        self.controller = BuyStockController()

    def buy(self, user_id, symbol, quantity, price):
        return self.controller.buy(user_id, symbol, quantity, price)


@router.post("/buy")
def buy_stock(data: BuyStockRequest):
    boundary = BuyStockPage()
    result = boundary.buy(
        data.user_id,
        data.symbol.upper(),
        data.quantity,
        data.price
    )
    return result


# ---- Sell ----
class SellStockRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int
    price: float


class SellStockPage:
    def __init__(self):
        self.controller = SellStockController()

    def sell(self, user_id, symbol, quantity, price):
        return self.controller.sell(user_id, symbol, quantity, price)


@router.post("/sell")
def sell_stock(data: SellStockRequest):
    boundary = SellStockPage()
    result = boundary.sell(
        data.user_id,
        data.symbol.upper(),
        data.quantity,
        data.price
    )
    return result


# ---- Portfolio (holdings + cash balance) ----
class PortfolioPage:
    def __init__(self):
        self.controller = PortfolioController()

    def get_portfolio(self, user_id):
        return self.controller.get_portfolio(user_id)


@router.get("/portfolio/{user_id}")
def get_portfolio(user_id: str):
    boundary = PortfolioPage()
    result = boundary.get_portfolio(user_id)

    if result is None:
        return {"success": False, "message": "Investor not found"}

    return {
        "success": True,
        "message": "Portfolio retrieved successfully",
        "portfolio": result
    }


# ---- Transaction history ----
class TransactionHistoryPage:
    def __init__(self):
        self.controller = TransactionHistoryController()

    def get_history(self, investor_id):
        return self.controller.get_history(investor_id)


@router.get("/transactions/{investor_id}")
def get_transaction_history(investor_id: str):
    boundary = TransactionHistoryPage()
    result = boundary.get_history(investor_id)

    return {
        "success": True,
        "message": "Transaction history retrieved successfully",
        "transactions": result
    }


# ---- Transaction portal (by user_id, with optional filters) ----

class TransactionPortalPage:
    def __init__(self):
        self.controller = TransactionPortalController()

    def get_transactions(self, user_id, limit, symbol, transaction_type):
        return self.controller.get_transactions(
            user_id, limit=limit, symbol=symbol,
            transaction_type=transaction_type
        )

    def get_summary(self, user_id):
        return self.controller.get_summary(user_id)


@router.get("/portal/{user_id}")
def get_portal_transactions(
    user_id: str,
    limit: int = 100,
    symbol: Optional[str] = None,
    transaction_type: Optional[str] = None,
):
    boundary = TransactionPortalPage()
    transactions = boundary.get_transactions(
        user_id, limit, symbol, transaction_type
    )
    if transactions is None:
        return {"success": False, "message": "Investor not found"}
    return {
        "success": True,
        "message": "Transactions retrieved",
        "transactions": transactions,
    }


@router.get("/portal/{user_id}/summary")
def get_portal_summary(user_id: str):
    boundary = TransactionPortalPage()
    summary = boundary.get_summary(user_id)
    if summary is None:
        return {"success": False, "message": "Investor not found"}
    return {"success": True, "summary": summary}
