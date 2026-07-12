from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.control.controller.reviewc import ReviewController
from app.control.services.auth import get_current_user, require_admin

router = APIRouter(prefix="/reviews", tags=["Reviews"])


# ── Request models ─────────────────────────────────────────────────────────────

class CreateReviewRequest(BaseModel):
    rating: int
    title: Optional[str] = ""
    comment: str


class UpdateReviewRequest(BaseModel):
    rating: Optional[int] = None
    title: Optional[str] = None
    comment: Optional[str] = None


# ── Public reads ───────────────────────────────────────────────────────────────
# No auth required — visible on the public landing page so prospective users
# can see reviews before signing up.

@router.get("/stats")
def get_stats():
    return ReviewController().get_stats()


@router.get("")
def list_reviews(sort: str = "latest", page: int = 1, page_size: int = 10,
                  rating: Optional[int] = None, user_id: Optional[str] = None):
    return ReviewController().list_reviews(
        user_id=user_id, sort=sort, page=page, page_size=page_size, rating_filter=rating
    )


# ── Authenticated user actions ─────────────────────────────────────────────────

@router.get("/mine")
def get_my_review(current_user: dict = Depends(get_current_user)):
    return ReviewController().get_my_review(current_user["user_id"])


@router.post("")
def create_review(data: CreateReviewRequest, current_user: dict = Depends(get_current_user)):
    return ReviewController().create_review(
        current_user["user_id"], current_user.get("role"),
        data.rating, data.title, data.comment,
    )


@router.put("/{review_id}")
def update_review(review_id: str, data: UpdateReviewRequest, current_user: dict = Depends(get_current_user)):
    return ReviewController().update_review(
        review_id, current_user["user_id"],
        rating=data.rating, title=data.title, comment=data.comment,
    )


@router.delete("/{review_id}")
def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    return ReviewController().delete_review(review_id, user_id=current_user["user_id"], is_admin=is_admin)


class FlagReviewRequest(BaseModel):
    reason: str = "Inappropriate content"


@router.post("/{review_id}/flag")
def flag_review(review_id: str, data: FlagReviewRequest, current_user: dict = Depends(get_current_user)):
    return ReviewController().flag_review(review_id, current_user["user_id"], data.reason)


@router.post("/{review_id}/helpful")
def toggle_helpful(review_id: str, current_user: dict = Depends(get_current_user)):
    return ReviewController().toggle_helpful(review_id, current_user["user_id"])


# ── Admin moderation ────────────────────────────────────────────────────────────

@router.get("/admin/flagged")
def admin_get_flagged_reviews(current_user: dict = Depends(require_admin)):
    return ReviewController().admin_flagged_reviews()


@router.get("/admin/all")
def admin_list_reviews(current_user: dict = Depends(require_admin)):
    return ReviewController().admin_list_reviews()


class AdminDeleteReviewRequest(BaseModel):
    reason: str = "Violated community guidelines"


@router.delete("/admin/{review_id}")
def admin_delete_review(review_id: str, data: AdminDeleteReviewRequest, current_user: dict = Depends(require_admin)):
    return ReviewController().admin_delete_review(review_id, admin_user_id=current_user["user_id"], reason=data.reason)
