from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.control.controller.reviewc import ReviewController
from app.control.services.auth import (
    get_current_user,
    get_current_user_optional,
    require_admin,
)


router = APIRouter(prefix="/reviews", tags=["Reviews"])


class CreateReviewRequest(BaseModel):
    rating: int
    title: Optional[str] = ""
    comment: str


class UpdateReviewRequest(BaseModel):
    rating: Optional[int] = None
    title: Optional[str] = None
    comment: Optional[str] = None


# Get the overall review statistics.
@router.get("/stats")
def get_stats():
    return ReviewController().get_stats()


# List reviews with optional sorting, pagination, and rating filters.
@router.get("")
def list_reviews(
    sort: str = "latest",
    page: int = 1,
    page_size: int = 10,
    rating: Optional[int] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    # Use the logged-in user's ID when available.
    resolved_user_id = current_user["user_id"] if current_user else None

    return ReviewController().list_reviews(
        user_id=resolved_user_id,
        sort=sort,
        page=page,
        page_size=page_size,
        rating_filter=rating,
    )


# Get the current user's review.
@router.get("/mine")
def get_my_review(current_user: dict = Depends(get_current_user)):
    return ReviewController().get_my_review(current_user["user_id"])


# Check whether the user has any review removal notices.
@router.get("/removal-notice")
def get_removal_notice(current_user: dict = Depends(get_current_user)):
    return ReviewController().get_removal_notice(current_user["user_id"])


class AcknowledgeRemovalRequest(BaseModel):
    removal_id: str


# Mark a review removal notice as acknowledged.
@router.post("/removal-notice/acknowledge")
def acknowledge_removal(
    data: AcknowledgeRemovalRequest,
    current_user: dict = Depends(get_current_user),
):
    return ReviewController().acknowledge_removal(
        data.removal_id,
        current_user["user_id"],
    )


# Create a new review for the current user.
@router.post("")
def create_review(
    data: CreateReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    return ReviewController().create_review(
        current_user["user_id"],
        current_user.get("role"),
        data.rating,
        data.title,
        data.comment,
    )


# Update an existing review.
@router.put("/{review_id}")
def update_review(
    review_id: str,
    data: UpdateReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    return ReviewController().update_review(
        review_id,
        current_user["user_id"],
        rating=data.rating,
        title=data.title,
        comment=data.comment,
    )


# Delete a review. Admins can delete reviews belonging to other users.
@router.delete("/{review_id}")
def delete_review(
    review_id: str,
    current_user: dict = Depends(get_current_user),
):
    is_admin = current_user.get("role") == "admin"

    return ReviewController().delete_review(
        review_id,
        user_id=current_user["user_id"],
        is_admin=is_admin,
    )


class FlagReviewRequest(BaseModel):
    reason: str = "Inappropriate content"


# Report a review that may violate the community guidelines.
@router.post("/{review_id}/flag")
def flag_review(
    review_id: str,
    data: FlagReviewRequest,
    current_user: dict = Depends(get_current_user),
):
    return ReviewController().flag_review(
        review_id,
        current_user["user_id"],
        data.reason,
    )


# Toggle whether the current user finds the review helpful.
@router.post("/{review_id}/helpful")
def toggle_helpful(
    review_id: str,
    current_user: dict = Depends(get_current_user),
):
    return ReviewController().toggle_helpful(
        review_id,
        current_user["user_id"],
    )


# Get a specific review, including the user's own interaction if logged in.
@router.get("/{review_id}")
def get_review(
    review_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    resolved_user_id = current_user["user_id"] if current_user else None

    return ReviewController().get_review_by_id(
        review_id,
        user_id=resolved_user_id,
    )


# Admin: view reviews that have been flagged.
@router.get("/admin/flagged")
def admin_get_flagged_reviews(
    current_user: dict = Depends(require_admin),
):
    return ReviewController().admin_flagged_reviews()


# Admin: view all reviews.
@router.get("/admin/all")
def admin_list_reviews(
    current_user: dict = Depends(require_admin),
):
    return ReviewController().admin_list_reviews()


class AdminDeleteReviewRequest(BaseModel):
    reason: str = "Violated community guidelines"


# Admin: remove a review and record the reason for removal.
@router.delete("/admin/{review_id}")
def admin_delete_review(
    review_id: str,
    data: AdminDeleteReviewRequest,
    current_user: dict = Depends(require_admin),
):
    return ReviewController().admin_delete_review(
        review_id,
        admin_user_id=current_user["user_id"],
        reason=data.reason,
    )

