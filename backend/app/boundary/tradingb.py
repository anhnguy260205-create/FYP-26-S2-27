from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from app.control.controller.tradingc import (
    BuyStockController,
    SellStockController,
    GetPortfolioController,
    GetTransactionHistoryController,
    GetPortalTransactionsController,
    GetPortalSummaryController,
    AddPaperMoneyController,
    SubmitOrderController,
    GetOrdersController,
    CancelOrderController,
)
from app.control.services.auth import get_current_user
from app.boundary.stock_ws import get_live_price

router = APIRouter(prefix="/trading", tags=["Trading"])


class BuyRequest(BaseModel):
    symbol: str
    quantity: int


class SellRequest(BaseModel):
    symbol: str
    quantity: int


@router.post("/buy")
def buy_stock(data: BuyRequest, current_user: dict = Depends(get_current_user)):
    server_price = get_live_price(data.symbol.upper())
    if server_price is None:
        raise HTTPException(status_code=503, detail=f"Could not fetch current price for {data.symbol}")
    result = BuyStockController().buy(
        current_user["user_id"], data.symbol.upper(), data.quantity, server_price
    )
    return result


@router.post("/sell")
def sell_stock(data: SellRequest, current_user: dict = Depends(get_current_user)):
    server_price = get_live_price(data.symbol.upper())
    if server_price is None:
        raise HTTPException(status_code=503, detail=f"Could not fetch current price for {data.symbol}")
    result = SellStockController().sell(
        current_user["user_id"], data.symbol.upper(), data.quantity, server_price
    )
    return result


@router.get("/portfolio/{user_id}")
def get_portfolio(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    result = GetPortfolioController().get_portfolio(user_id)
    if result is None:
        return {"success": False, "message": "Investor not found"}
    return {"success": True, **result}


@router.get("/transactions/{investor_id}")
def get_transaction_history(
    investor_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    result = GetTransactionHistoryController().get_transactions(investor_id, limit)
    return {"success": True, "transactions": result}


class AddPaperMoneyRequest(BaseModel):
    amount: float


@router.post("/add-paper-money")
def add_paper_money(
    data: AddPaperMoneyRequest,
    current_user: dict = Depends(get_current_user),
):
    return AddPaperMoneyController().add(current_user["user_id"], data.amount)


class OrderRequest(BaseModel):
    symbol: str
    order_type: str   # "buy" | "sell"
    quantity: int
    limit_price: float


@router.post("/order")
def submit_order(data: OrderRequest, current_user: dict = Depends(get_current_user)):
    if data.quantity <= 0 or data.limit_price <= 0:
        raise HTTPException(status_code=400, detail="quantity and limit_price must be positive")
    return SubmitOrderController().submit(
        current_user["user_id"], data.symbol, data.order_type, data.quantity, data.limit_price
    )


@router.get("/orders/{user_id}")
def get_orders(
    user_id: str,
    symbol: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {"success": True, "orders": GetOrdersController().get(user_id, symbol=symbol)}


@router.delete("/orders/{order_id}")
def cancel_order(order_id: str, current_user: dict = Depends(get_current_user)):
    return CancelOrderController().cancel(order_id, current_user["user_id"])


@router.get("/portal/{user_id}/summary")
def get_portal_summary(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
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
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    result = GetPortalTransactionsController().get_portal_transactions(
        user_id, limit, symbol, transaction_type
    )
    if result is None:
        return {"success": False, "message": "Investor not found"}
    return {"success": True, "transactions": result}
