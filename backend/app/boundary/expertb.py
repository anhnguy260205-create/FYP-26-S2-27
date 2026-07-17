from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.control.controller.expertc import ExpertPortfolioController
from app.entity.models.expert import Expert
from app.entity.models.expertprofileview import ExpertProfileView
from app.entity.models.expertfollow import ExpertFollow
from app.entity.models.expertportfolioreview import ExpertPortfolioReview
from app.entity.models.expertportfolio import ExpertPortfolioRepository
from app.control.services.auth import get_current_user

router = APIRouter(prefix="/expert", tags=["Expert"])


# ── Public expert directory & profiles (investor-facing) ────────────────────

@router.get("/public-list")
def public_expert_list(current_user: dict = Depends(get_current_user)):
    """Approved experts with their core info, for the Expert Portfolio page."""
    experts = Expert.get_all_for_admin()

    def _pub(e):
        return {
            "user_id": e["user_id"],
            "full_name": e["full_name"],
            "experience_years": e["experience_years"],
            "rating": e.get("rating"),
            "risk_tolerance": e["risk_tolerance"],
            "verification_status": e["verification_status"],
            "follower_count": ExpertFollow.get_follower_count(e["user_id"]),
            "portfolio_rating": ExpertPortfolioReview.get_stats(e["user_id"]),
        }

    approved = [_pub(e) for e in experts
                if e["verification_status"] in ("approved", "active")]
    # fall back to all experts if none are marked approved yet (dev data)
    out = approved or [_pub(e) for e in experts]
    return {"success": True, "experts": out}


@router.get("/public-stats")
def public_expert_stats(current_user: dict = Depends(get_current_user)):
    """Aggregate stats for the Expert Portfolio page's top banner."""
    experts = Expert.get_all_for_admin()
    listed = [e for e in experts if e["verification_status"] in ("approved", "active")] or experts

    total_followers = 0
    top_rated = None  # {"name": ..., "rating": ...}
    for e in listed:
        follower_count = ExpertFollow.get_follower_count(e["user_id"])
        total_followers += follower_count

        stats = ExpertPortfolioReview.get_stats(e["user_id"])
        rating = stats["average"] if stats["total"] > 0 else float(e.get("rating") or 0)
        if rating > 0 and (top_rated is None or rating > top_rated["rating"]):
            top_rated = {"name": e["full_name"], "rating": rating}

    return {
        "success": True,
        "total_experts": len(listed),
        "top_rated": top_rated,
        "avg_return": ExpertPortfolioRepository.get_average_return(),
        "total_followers": total_followers,
    }


@router.get("/public-profile/{user_id}")
def public_expert_profile(user_id: str,
                          current_user: dict = Depends(get_current_user)):
    """Expert profile (core info) with the basic-plan view limit.

    Basic investors may view up to 3 distinct expert profiles (lifetime);
    re-viewing an unlocked profile is free. Premium/experts are unlimited."""
    quota = ExpertProfileView.check_and_consume(current_user["user_id"], user_id)
    if not quota["allowed"]:
        return {
            "success": False,
            "limit_reached": True,
            "views_used": quota["views_used"],
            "views_limit": quota["limit"],
            "message": "Free profile view limit reached. Upgrade to Premium for unlimited access.",
        }

    info = Expert.get_expert_information(user_id)
    if not info:
        return {"success": False, "message": "Expert not found"}

    return {
        "success": True,
        "views_used": quota["views_used"],
        "views_limit": quota["limit"],
        "premium": quota["premium"],
        "profile": {
            "user_id": user_id,
            "username": info.get("username"),
            "full_name": info.get("full_name"),
            "email_address": info.get("email_address"),
            "experience_years": info.get("experience_years"),
            "rating": info.get("rating"),
            "linked_in_url": info.get("linked_in_url"),
            "risk_tolerance": info.get("risk_tolerance"),
            "verification_status": info.get("verification_status"),
            "address": info.get("address"),
            "follower_count": ExpertFollow.get_follower_count(user_id),
            "is_following": ExpertFollow.is_following(current_user["user_id"], user_id),
            "is_self": current_user["user_id"] == user_id,
            "portfolio_rating": ExpertPortfolioReview.get_stats(user_id),
        },
    }


# ── Follow / unfollow (investor-facing) ──────────────────────────────────────

@router.get("/{expert_user_id}/followers")
def get_follower_status(expert_user_id: str, current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "follower_count": ExpertFollow.get_follower_count(expert_user_id),
        "is_following": ExpertFollow.is_following(current_user["user_id"], expert_user_id),
    }


@router.post("/{expert_user_id}/follow")
def follow_expert(expert_user_id: str, current_user: dict = Depends(get_current_user)):
    return ExpertFollow.follow(current_user["user_id"], expert_user_id)


@router.delete("/{expert_user_id}/follow")
def unfollow_expert(expert_user_id: str, current_user: dict = Depends(get_current_user)):
    return ExpertFollow.unfollow(current_user["user_id"], expert_user_id)


# ── Portfolio ratings & reviews (investor- and expert-facing) ────────────────

class PortfolioReviewRequest(BaseModel):
    rating: int
    comment: Optional[str] = ""


@router.get("/{expert_user_id}/portfolio-reviews")
def get_portfolio_reviews(
    expert_user_id: str,
    page: int = 1,
    page_size: int = 10,
    current_user: dict = Depends(get_current_user),
):
    return ExpertPortfolioReview.list_for_expert(
        expert_user_id, current_user["user_id"], page, page_size)


@router.post("/{expert_user_id}/portfolio-reviews")
def submit_portfolio_review(
    expert_user_id: str,
    data: PortfolioReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    return ExpertPortfolioReview.create_or_update(
        current_user["user_id"], expert_user_id, data.rating, data.comment)


@router.delete("/{expert_user_id}/portfolio-reviews")
def delete_portfolio_review(expert_user_id: str, current_user: dict = Depends(get_current_user)):
    return ExpertPortfolioReview.delete(current_user["user_id"], expert_user_id)


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


@router.get("/portfolio/{user_id}")
def get_portfolio(user_id: str, current_user: dict = Depends(get_current_user)):
    return ExpertPortfolioController().get_portfolio(user_id)


@router.post("/portfolio/{user_id}")
def save_portfolio(
    user_id: str,
    data: PortfolioRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return ExpertPortfolioController().save_portfolio(user_id, data.dict())


# ── Expert profile & documents ─────────────────────────────────────────────────

class DocumentItem(BaseModel):
    name: str
    url: str
    type: str


class UpdateExpertProfileRequest(BaseModel):
    experience_years: Optional[int] = None
    linked_in_url: Optional[str] = None
    risk_tolerance: Optional[str] = None
    interests: Optional[str] = None


@router.post("/update-profile")
def update_expert_profile(
    data: UpdateExpertProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    ok = Expert.update_profile(
        current_user["user_id"],
        data.experience_years,
        data.linked_in_url,
        data.risk_tolerance,
        data.interests,
    )
    if not ok:
        return {"success": False, "message": "Expert not found"}
    return {"success": True, "message": "Profile updated"}


class UpdateDocumentsRequest(BaseModel):
    documents: List[DocumentItem]


@router.post("/documents")
def update_documents(
    data: UpdateDocumentsRequest,
    current_user: dict = Depends(get_current_user),
):
    ok = Expert.update_documents(
        current_user["user_id"],
        [d.dict() for d in data.documents],
    )
    if not ok:
        return {"success": False, "message": "Expert not found"}
    return {"success": True, "message": "Documents updated"}
