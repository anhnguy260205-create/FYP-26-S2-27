from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter

from app.control.controller.tradingc import (
    BuyStockController,
    SellStockController,
    GetPortfolioController,
    GetTransactionHistoryController,
    GetPortalTransactionsController,
    GetPortalSummaryController,
    AddPaperMoneyController,
)

router = APIRouter(prefix="/trading", tags=["Trading"])


class BuyRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int
    price: float


class SellRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int
    price: float


@router.post("/buy")
def buy_stock(data: BuyRequest):
    result = BuyStockController().buy(data.user_id, data.symbol, data.quantity, data.price)
    return result


@router.post("/sell")
def sell_stock(data: SellRequest):
    result = SellStockController().sell(data.user_id, data.symbol, data.quantity, data.price)
    return result


@router.get("/portfolio/{user_id}")
def get_portfolio(user_id: str):
    result = GetPortfolioController().get_portfolio(user_id)
    if result is None:
        return {"success": False, "message": "Investor not found"}
    return {"success": True, **result}


@router.get("/transactions/{investor_id}")
def get_transaction_history(investor_id: str, limit: int = 50):
    result = GetTransactionHistoryController().get_transactions(investor_id, limit)
    return {"success": True, "transactions": result}


class AddPaperMoneyRequest(BaseModel):
    user_id: str
    amount: float


@router.post("/add-paper-money")
def add_paper_money(data: AddPaperMoneyRequest):
    return AddPaperMoneyController().add(data.user_id, data.amount)


@router.get("/portal/{user_id}/summary")
def get_portal_summary(user_id: str):
    result = GetPortalSummaryController().get_summary(user_id)
    if result is None:
        return {"success": False, "message": "Investor not found"}
    return {"success": True, **result}


@router.get("/portal/{user_id}")
def get_portal_transactions(
    user_id: str,
    limit: int = 100,
    symbol: Optional[str] = None,
    transaction_type: Optional[str] = None,
):
    result = GetPortalTransactionsController().get_portal_transactions(
        user_id, limit, symbol, transaction_type
    )
    if result is None:
        return {"success": False, "message": "Investor not found"}
    return {"success": True, "transactions": result}
