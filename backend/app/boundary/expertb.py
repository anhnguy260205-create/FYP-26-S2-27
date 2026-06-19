from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.control.controller.expertc import ExpertPortfolioController
from app.control.controller.forumc import ForumController

router = APIRouter(prefix="/expert", tags=["Expert"])


class PortfolioHoldingPayload(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    asset_class: Optional[str] = None
    units_held: Optional[float] = 0
    avg_buy_price: Optional[float] = 0
    total_invested: Optional[float] = 0
    allocation_pct: float = Field(ge=0, le=100)
    purchase_rationale: Optional[str] = None


class ExpertPortfolioCreate(BaseModel):
    user_id: str
    experience_years: int = 0
    linked_in_url: Optional[str] = None
    portfolio_name: Optional[str] = None
    description: Optional[str] = None
    risk_level: Optional[str] = None
    target_audience: Optional[str] = None
    strategy_notes: Optional[str] = None
    holdings: List[PortfolioHoldingPayload] = []


class ExpertPortfolioUpdate(BaseModel):
    experience_years: Optional[int] = None
    linked_in_url: Optional[str] = None
    expert_status: Optional[str] = None
    portfolio_name: Optional[str] = None
    description: Optional[str] = None
    risk_level: Optional[str] = None
    target_audience: Optional[str] = None
    strategy_notes: Optional[str] = None
    holdings: Optional[List[PortfolioHoldingPayload]] = None


class ForumQuestionCreate(BaseModel):
    user_id: str
    title: str
    content: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    image_url: Optional[str] = None
    urgency: Optional[str] = None
    tickers: Optional[List[str]] = None
    investment_goal: Optional[str] = None


class ForumQuestionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    image_url: Optional[str] = None


class ForumReplyCreate(BaseModel):
    question_id: str
    content: str
    expert_id: Optional[str] = None
    user_id: Optional[str] = None
    is_expert_reply: bool = False


class QuestionAssign(BaseModel):
    expert_id: str


expert_portfolio_controller = ExpertPortfolioController()
forum_controller = ForumController()


@router.get("/portfolios")
def get_all_expert_portfolios():
    experts = expert_portfolio_controller.get_all_experts()
    return {"success": True, "count": len(experts), "experts": experts}


@router.get("/portfolio/by-user/{user_id}")
def get_expert_portfolio_by_user(user_id: str):
    expert = expert_portfolio_controller.get_expert_by_user_id(user_id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    return {"success": True, "expert": expert, "portfolio": expert.get("portfolio")}


@router.get("/portfolio/{expert_id}")
def get_expert_portfolio(expert_id: str):
    expert = expert_portfolio_controller.get_expert_by_id(expert_id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    return {"success": True, "expert": expert, "portfolio": expert.get("portfolio")}


@router.post("/portfolio/create")
def create_expert_portfolio(data: ExpertPortfolioCreate):
    result = expert_portfolio_controller.create_expert_portfolio(
        user_id=data.user_id,
        experience_years=data.experience_years,
        linked_in_url=data.linked_in_url,
        portfolio_name=data.portfolio_name,
        description=data.description,
        risk_level=data.risk_level,
        target_audience=data.target_audience,
        strategy_notes=data.strategy_notes,
        holdings=[h.dict() for h in data.holdings],
    )
    if not result.get("created"):
        return {
            "success": False,
            "message": "Expert portfolio already exists",
            "portfolio": result.get("portfolio"),
        }
    return {
        "success": True,
        "message": "Expert portfolio created successfully",
        "portfolio": result.get("portfolio"),
        "expert_id": result.get("expert_id"),
    }


@router.put("/portfolio/{portfolio_id}/update")
def update_expert_portfolio(portfolio_id: str, data: ExpertPortfolioUpdate, user_id: str):
    updated = expert_portfolio_controller.update_expert_portfolio(
        portfolio_id=portfolio_id,
        user_id=user_id,
        experience_years=data.experience_years,
        linked_in_url=data.linked_in_url,
        expert_status=data.expert_status,
        portfolio_name=data.portfolio_name,
        description=data.description,
        risk_level=data.risk_level,
        target_audience=data.target_audience,
        strategy_notes=data.strategy_notes,
        holdings=[h.dict() for h in data.holdings] if data.holdings is not None else None,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Expert portfolio not found or unauthorized")
    return {"success": True, "message": "Expert portfolio updated successfully", "portfolio": updated}


@router.get("/forum/questions")
def get_forum_questions(limit: int = 50, offset: int = 0):
    questions = forum_controller.get_all_questions(limit=limit, offset=offset)
    return {"success": True, "count": len(questions), "questions": questions}


@router.get("/forum/question/{question_id}")
def get_forum_question(question_id: str, increment_views: bool = True):
    question = forum_controller.get_question_by_id(question_id, increment_views=increment_views)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"success": True, "question": question}


@router.post("/forum/question/create")
def create_forum_question(data: ForumQuestionCreate):
    question_id = forum_controller.create_question(
        user_id=data.user_id,
        title=data.title,
        content=data.content,
        category=data.category,
        tags=data.tags,
        image_url=data.image_url,
        urgency=data.urgency,
        tickers=data.tickers,
        investment_goal=data.investment_goal,
    )
    question = forum_controller.get_question_by_id(question_id)
    return {
        "success": True,
        "question_id": question_id,
        "question": question,
        "message": "Question created successfully",
    }


@router.put("/forum/question/{question_id}/update")
def update_forum_question(question_id: str, data: ForumQuestionUpdate, user_id: str):
    question = forum_controller.update_question(
        question_id=question_id,
        user_id=user_id,
        title=data.title,
        content=data.content,
        category=data.category,
        tags=data.tags,
        image_url=data.image_url,
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found or unauthorized")
    return {"success": True, "question": question, "message": "Question updated successfully"}


@router.post("/forum/reply/create")
def create_forum_reply(data: ForumReplyCreate):
    reply_id = forum_controller.create_reply(
        question_id=data.question_id,
        content=data.content,
        expert_id=data.expert_id,
        user_id=data.user_id,
        is_expert_reply=data.is_expert_reply,
    )
    reply = forum_controller.get_reply_by_id(reply_id)
    return {
        "success": True,
        "reply_id": reply_id,
        "reply": reply,
        "message": "Reply created successfully",
    }


@router.get("/{expert_id}/questions")
def get_expert_questions(expert_id: str):
    questions = forum_controller.get_questions_by_expert(expert_id)
    return {"success": True, "count": len(questions), "questions": questions}


@router.post("/forum/question/{question_id}/assign")
def assign_question(question_id: str, data: QuestionAssign):
    success = forum_controller.assign_question_to_expert(question_id=question_id, expert_id=data.expert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"success": True, "message": "Question assigned successfully"}


@router.post("/forum/question/{question_id}/resolve")
def resolve_question(question_id: str, user_id: str):
    success = forum_controller.mark_question_resolved(question_id=question_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found or unauthorized")
    return {"success": True, "message": "Question marked as resolved"}
