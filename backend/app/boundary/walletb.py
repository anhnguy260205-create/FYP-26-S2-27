from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.control.controller.walletc import (
    CashInController,
    CashOutController,
    GetWalletController,
)
from app.control.controller.giftc import SendGiftController, GetGiftController
from app.control.services.auth import get_current_user
from app.entity.models.investor import Investor
from fastapi import HTTPException

router = APIRouter(prefix="/wallet", tags=["Wallet"])


class CashRequest(BaseModel):
    amount: float
    bank_name: str
    account_number: str
    pin: str | None = None


class GiftRequest(BaseModel):
    expert_user_id: str
    amount: float
    message: str | None = None


@router.get("/overview")
def get_wallet_overview(current_user: dict = Depends(get_current_user)):
    """Balance, lifetime totals per category, and the wallet ledger — powers
    the Cash In / Cash Out page and the wallet rows in Transaction History."""
    return GetWalletController().get_overview(current_user["user_id"])


@router.post("/cash-in")
def cash_in(data: CashRequest, current_user: dict = Depends(get_current_user)):
    return CashInController().deposit(
        current_user["user_id"], data.amount, data.bank_name, data.account_number
    )


@router.post("/cash-out")
def cash_out(data: CashRequest, current_user: dict = Depends(get_current_user)):
    # Cash-out confirms the 6-digit transaction PIN (no-op for legacy accounts
    # that never set one).
    if Investor.hasTransactionPin(current_user["user_id"]):
        if not data.pin or not Investor.verifyTransactionPin(current_user["user_id"], data.pin):
            raise HTTPException(status_code=403, detail="Incorrect transaction PIN")
    return CashOutController().withdraw(
        current_user["user_id"], data.amount, data.bank_name, data.account_number
    )


@router.post("/gift")
def send_gift(data: GiftRequest, current_user: dict = Depends(get_current_user)):
    """Premium user sends a red packet to an expert from the chat window."""
    return SendGiftController().send(
        current_user["user_id"], data.expert_user_id, data.amount, data.message
    )


@router.get("/gifts/conversation/{other_user_id}")
def get_conversation_gifts(other_user_id: str,
                           current_user: dict = Depends(get_current_user)):
    """Gifts exchanged between the caller and one other user, so the chat can
    render them inline alongside messages."""
    return GetGiftController().get_between(
        current_user["user_id"], other_user_id
    )


@router.get("/gifts/received")
def get_received_gifts(current_user: dict = Depends(get_current_user)):
    return GetGiftController().get_received(current_user["user_id"])
