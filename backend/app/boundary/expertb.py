import re
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


# Requirements for investors who want to become experts
EXPERT_MIN_DISTINCT_STOCKS = 30
EXPERT_MIN_PROFIT_MARGIN = 200.0  # percent


# Keep the LinkedIn format consistent with the frontend validation
_LINKEDIN_URL_RE = re.compile(
    r"^https://([a-z]{2,3}\.)?linkedin\.com/(in|company)/[a-z0-9\-_%]+/?(\?.*)?$",
    re.IGNORECASE,
)


# Check whether the current investor meets the requirements to apply
@router.get("/eligibility")
def expert_eligibility(current_user: dict = Depends(get_current_user)):

    from app.entity.models.investor import Investor
    from app.entity.models.expertverification import ExpertVerification

    eligibility = Investor.getExpertEligibility(
        current_user["user_id"],
        EXPERT_MIN_DISTINCT_STOCKS,
        EXPERT_MIN_PROFIT_MARGIN,
    )

    if eligibility is None:
        return {"success": False, "message": "Investor account not found"}

    verification_status = None
    expert = None

    from app.entity.database.session import get_session
    with get_session() as session:
        expert = session.query(Expert).filter(
            Expert.user_id == current_user["user_id"]
        ).first()

        expert_id = expert.expert_id if expert else None

    if expert_id:
        verification = ExpertVerification.get_for_expert(expert_id)
        verification_status = (
            verification.get("verification_status")
            if verification else None
        )

    return {
        "success": True,
        **eligibility,
        "has_applied": expert_id is not None,
        "verification_status": verification_status,
    }


# Create an expert application for an eligible investor
@router.post("/apply")
def apply_for_expert(current_user: dict = Depends(get_current_user)):

    from app.entity.models.investor import Investor

    eligibility = Investor.getExpertEligibility(
        current_user["user_id"],
        EXPERT_MIN_DISTINCT_STOCKS,
        EXPERT_MIN_PROFIT_MARGIN,
    )

    if eligibility is None:
        return {"success": False, "message": "Investor account not found"}

    if not eligibility["eligible"]:
        return {
            "success": False,
            "message": (
                f"Not eligible yet — trade {EXPERT_MIN_DISTINCT_STOCKS} different stocks "
                f"and reach a {EXPERT_MIN_PROFIT_MARGIN:.0f}% profit margin first."
            ),
            **eligibility,
        }

    result = Expert.create_for_existing_user(current_user["user_id"])

    return {
        "success": True,
        "message": (
            "Application created — upload your supporting documents for review."
            if result["created"] else "You have already applied."
        ),
        "expert_id": result["expert_id"],
        "created": result["created"],
    }


# Get the list of approved experts for the portfolio page
@router.get("/public-list")
def public_expert_list(current_user: dict = Depends(get_current_user)):
    """Return the experts shown on the public portfolio page."""

    from app.entity.models.investor import Investor

    experts = Expert.get_all_for_admin()

    def _pub(e):
        investor_info = Investor.getInvestorByUserId(e["user_id"])

        return {
            "user_id": e["user_id"],
            "full_name": e["full_name"],
            "experience_years": e["experience_years"],
            "rating": e.get("rating"),
            "verification_status": e["verification_status"],
            "follower_count": ExpertFollow.get_follower_count(e["user_id"]),
            "portfolio_rating": ExpertPortfolioReview.get_stats(e["user_id"]),
            "risk_tolerance": (investor_info or {}).get("risk_tolerance"),
        }

    approved = [
        _pub(e)
        for e in experts
        if e["verification_status"] in ("approved", "active")
    ]

    # Use all experts if no one is marked as approved yet
    out = approved or [_pub(e) for e in experts]

    return {"success": True, "experts": out}


# Get the experts followed by the current investor
@router.get("/my-follows")
def my_followed_experts(current_user: dict = Depends(get_current_user)):
    """Return the experts followed by the current user."""

    followed_ids = ExpertFollow.get_followed_by_user(
        current_user["user_id"]
    )

    experts = []

    for expert_user_id in followed_ids:
        info = Expert.get_expert_information(expert_user_id)

        if not info:
            continue

        experts.append({
            "user_id": expert_user_id,
            "full_name": info.get("full_name"),
            "experience_years": info.get("experience_years"),
            "rating": info.get("rating"),
            "follower_count": ExpertFollow.get_follower_count(expert_user_id),
            "portfolio_rating": ExpertPortfolioReview.get_stats(
                expert_user_id
            ),
        })

    return {"success": True, "experts": experts}


# Get summary statistics for the expert section
@router.get("/public-stats")
def public_expert_stats(current_user: dict = Depends(get_current_user)):
    experts = Expert.get_all_for_admin()

    listed = [
        e for e in experts
        if e["verification_status"] in ("approved", "active")
    ] or experts

    total_followers = 0
    top_rated = None  # Stores the highest-rated expert

    for e in listed:
        follower_count = ExpertFollow.get_follower_count(e["user_id"])
        total_followers += follower_count

        stats = ExpertPortfolioReview.get_stats(e["user_id"])
        rating = (
            stats["average"]
            if stats["total"] > 0
            else float(e.get("rating") or 0)
        )

        if rating > 0 and (
            top_rated is None or rating > top_rated["rating"]
        ):
            top_rated = {
                "name": e["full_name"],
                "rating": rating
            }

    return {
        "success": True,
        "total_experts": len(listed),
        "top_rated": top_rated,
        "avg_return": ExpertPortfolioRepository.get_average_return(),
        "total_followers": total_followers,
    }


# Get an expert's public profile
@router.get("/public-profile/{user_id}")
def public_expert_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):

    quota = ExpertProfileView.check_and_consume(
        current_user["user_id"],
        user_id
    )

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

    # Experts also have an investor profile, which stores their interests
    from app.entity.models.investor import Investor
    investor_info = Investor.getInvestorByUserId(user_id)

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
            "verification_status": info.get("verification_status"),
            "address": info.get("address"),
            "chat_available": info.get("chat_available", True),
            "follower_count": ExpertFollow.get_follower_count(user_id),
            "is_following": ExpertFollow.is_following(
                current_user["user_id"], user_id
            ),
            "is_self": current_user["user_id"] == user_id,
            "portfolio_rating": ExpertPortfolioReview.get_stats(user_id),
            "interests": (investor_info or {}).get("interests"),
            "risk_tolerance": (investor_info or {}).get("risk_tolerance"),
        },
    }


# Get follower count and follow status for an expert
@router.get("/{expert_user_id}/followers")
def get_follower_status(
    expert_user_id: str,
    current_user: dict = Depends(get_current_user)
):
    return {
        "success": True,
        "follower_count": ExpertFollow.get_follower_count(expert_user_id),
        "is_following": ExpertFollow.is_following(
            current_user["user_id"], expert_user_id
        ),
    }


# Follow an expert
@router.post("/{expert_user_id}/follow")
def follow_expert(
    expert_user_id: str,
    current_user: dict = Depends(get_current_user)
):
    return ExpertFollow.follow(
        current_user["user_id"],
        expert_user_id
    )


# Stop following an expert
@router.delete("/{expert_user_id}/follow")
def unfollow_expert(
    expert_user_id: str,
    current_user: dict = Depends(get_current_user)
):
    return ExpertFollow.unfollow(
        current_user["user_id"],
        expert_user_id
    )


# Request data for rating and commenting on an expert portfolio
class PortfolioReviewRequest(BaseModel):
    rating: int
    comment: Optional[str] = ""


# Get reviews for an expert's portfolio
@router.get("/{expert_user_id}/portfolio-reviews")
def get_portfolio_reviews(
    expert_user_id: str,
    page: int = 1,
    page_size: int = 10,
    current_user: dict = Depends(get_current_user),
):
    return ExpertPortfolioReview.list_for_expert(
        expert_user_id,
        current_user["user_id"],
        page,
        page_size
    )


# Submit or update a portfolio review
@router.post("/{expert_user_id}/portfolio-reviews")
def submit_portfolio_review(
    expert_user_id: str,
    data: PortfolioReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    return ExpertPortfolioReview.create_or_update(
        current_user["user_id"],
        expert_user_id,
        data.rating,
        data.comment
    )


# Remove the current user's portfolio review
@router.delete("/{expert_user_id}/portfolio-reviews")
def delete_portfolio_review(
    expert_user_id: str,
    current_user: dict = Depends(get_current_user)
):
    return ExpertPortfolioReview.delete(
        current_user["user_id"],
        expert_user_id
    )


# Request data for an individual portfolio holding
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


# Request data for creating or updating an expert portfolio
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


# Get a portfolio while keeping unpublished portfolios private
@router.get("/portfolio/{user_id}")
def get_portfolio(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Owners and admins can always view the portfolio
    if (
        current_user["user_id"] == user_id
        or current_user["role"] == "admin"
    ):
        return ExpertPortfolioController().get_portfolio(user_id)

    # Other users can only view published portfolios
    portfolio = ExpertPortfolioRepository.get_by_user(user_id)

    if not portfolio or not portfolio.get("is_published"):
        return {
            "success": False,
            "not_published": True,
            "message": "This expert has not published their portfolio yet.",
        }

    return {"success": True, "portfolio": portfolio}


# Save an expert portfolio
@router.post("/portfolio/{user_id}")
def save_portfolio(
    user_id: str,
    data: PortfolioRequest,
    current_user: dict = Depends(get_current_user),
):
    if (
        current_user["user_id"] != user_id
        and current_user["role"] != "admin"
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    return ExpertPortfolioController().save_portfolio(
        user_id,
        data.dict()
    )


# Request data for publishing or hiding a portfolio
class PublishPortfolioRequest(BaseModel):
    published: bool = True


# Change the portfolio's published status
@router.post("/portfolio-publish")
def publish_portfolio(
    data: PublishPortfolioRequest,
    current_user: dict = Depends(get_current_user),
):
    return ExpertPortfolioRepository.set_published(
        current_user["user_id"],
        data.published
    )


# Get portfolios that are available to Premium users
@router.get("/published-portfolios")
def published_portfolios(
    current_user: dict = Depends(get_current_user)
):

    from app.entity.models.investor import Investor

    investor = Investor.getInvestorByUserId(current_user["user_id"])

    is_premium = (
        investor is None  # admins have no investor row
        or (investor.get("investor_subscription_status") or "").lower() == "premium"
    )

    if not is_premium:
        return {
            "success": False,
            "premium_required": True,
            "message": "Upgrade to Premium to view expert portfolios.",
        }

    return {
        "success": True,
        "portfolios": ExpertPortfolioRepository.get_published()
    }


# Basic information for uploaded expert documents
class DocumentItem(BaseModel):
    name: str
    url: str
    type: str


# Fields that can be updated on an expert profile
class UpdateExpertProfileRequest(BaseModel):
    experience_years: Optional[int] = None
    linked_in_url: Optional[str] = None


# Update the current expert's profile
@router.post("/update-profile")
def update_expert_profile(
    data: UpdateExpertProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    if data.linked_in_url is not None:
        url = data.linked_in_url.strip()

        # Check the LinkedIn URL before saving it
        if not _LINKEDIN_URL_RE.match(url):
            return {
                "success": False,
                "message": (
                    "Enter a valid LinkedIn profile or company link, "
                    "e.g. https://linkedin.com/in/yourname"
                ),
            }

        data.linked_in_url = url

    ok = Expert.update_profile(
        current_user["user_id"],
        data.experience_years,
        data.linked_in_url,
    )

    if not ok:
        return {"success": False, "message": "Expert not found"}

    return {"success": True, "message": "Profile updated"}


# Request data for changing chat availability
class ChatAvailabilityRequest(BaseModel):
    available: bool = True


# Update whether the expert is available for chat
@router.post("/chat-availability")
def set_chat_availability(
    data: ChatAvailabilityRequest,
    current_user: dict = Depends(get_current_user),
):
    ok = Expert.set_chat_available(
        current_user["user_id"],
        data.available
    )

    if not ok:
        return {"success": False, "message": "Expert not found"}

    return {
        "success": True,
        "chat_available": data.available
    }


# Request data for updating expert documents
class UpdateDocumentsRequest(BaseModel):
    documents: List[DocumentItem]


# Update the documents submitted by the expert
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