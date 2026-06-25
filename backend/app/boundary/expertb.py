
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.control.controller.expertc import ExpertPortfolioController, ExpertQuestionsController
from app.entity.models.expert import Expert

router = APIRouter(prefix="/expert", tags=["Expert"])


class HoldingRequest(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    asset_class: Optional[str] = "Equity"
    sector: Optional[str] = ""
    units: Optional[float] = 0
    average_buy_price: Optional[float] = 0
    current_price: Optional[float] = 0
    total_invested: Optional[float] = 0
    allocation_percentage: Optional[float] = 0
    purchase_rationale: Optional[str] = ""


class PortfolioRequest(BaseModel):
    portfolio_name: str
    description: Optional[str] = ""
    investment_objective: Optional[str] = ""
    risk_level: Optional[str] = "Moderate"
    time_horizon: Optional[str] = "3-5 years"
    target_audience: Optional[str] = ""
    status: Optional[str] = "Active"
    created_by: Optional[str] = "Consultant"
    cash_balance: Optional[float] = 0
    holdings: List[Dict[str, Any]] = []


class ReplyQuestionRequest(BaseModel):
    reply_text: str


@router.get("/portfolio/{user_id}")
def get_portfolio(user_id: str):
    return ExpertPortfolioController().get_portfolio(user_id)


@router.post("/portfolio/{user_id}")
def save_portfolio(user_id: str, data: PortfolioRequest):
    return ExpertPortfolioController().save_portfolio(user_id, data.dict())


@router.get("/questions/{user_id}")
def get_questions(user_id: str):
    return ExpertQuestionsController().list_questions(user_id)


@router.get("/questions/detail/{question_id}")
def get_question_detail(question_id: str):
    return ExpertQuestionsController().get_question(question_id)


@router.post("/questions/{question_id}/reply")
def reply_question(question_id: str, data: ReplyQuestionRequest):
    return ExpertQuestionsController().reply_question(question_id, data.reply_text)


@router.delete("/questions/{question_id}/reply")
def delete_question_reply(question_id: str):
    return ExpertQuestionsController().delete_reply(question_id)


# ── Expert document submission ─────────────────────────────────────────────────

class DocumentItem(BaseModel):
    name: str
    url: str
    type: str  # "certification" | "degree" | "employment" | "other"

class UpdateExpertProfileRequest(BaseModel):
    user_id: str
    experience_years: Optional[int] = None
    linked_in_url: Optional[str] = None

@router.post("/update-profile")
def update_expert_profile(data: UpdateExpertProfileRequest):
    ok = Expert.update_profile(data.user_id, data.experience_years, data.linked_in_url)
    if not ok:
        return {"success": False, "message": "Expert not found"}
    return {"success": True, "message": "Profile updated"}


class UpdateDocumentsRequest(BaseModel):
    user_id: str
    documents: List[DocumentItem]

@router.post("/documents")
def update_documents(data: UpdateDocumentsRequest):
    docs = [d.dict() for d in data.documents]
    ok = Expert.update_documents(data.user_id, docs)
    if not ok:
        return {"success": False, "message": "Expert not found"}
    return {"success": True, "message": "Documents updated successfully"}
