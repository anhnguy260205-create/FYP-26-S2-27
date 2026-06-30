from typing import List, Optional
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.control.controller.forumc import ForumController

router = APIRouter(prefix="/consultant-forum", tags=["Forum"])


# ── Request models ─────────────────────────────────────────────────────────────

class CreatePostRequest(BaseModel):
    user_id:     Optional[str] = None
    title:       str
    content:     str
    category:    Optional[str] = None       # validated server-side; "General" is rejected
    tags:        List[str] = []
    ticker_tags: List[str] = []


class ReplyRequest(BaseModel):
    user_id: Optional[str] = None
    content: str


class EditReplyRequest(BaseModel):
    user_id: Optional[str] = None
    content: str


class UserActionRequest(BaseModel):
    user_id: str


class AdminActionRequest(BaseModel):
    value: Optional[bool] = True


# ── Posts ──────────────────────────────────────────────────────────────────────

@router.get("/posts")
def list_posts(
    user_id:   Optional[str] = None,
    category:  Optional[str] = None,
    search:    Optional[str] = None,
    sort:      Optional[str] = "latest",
    ticker:    Optional[str] = None,
    page:      int = 1,
    page_size: int = 20,
):
    return ForumController().list_posts(
        user_id=user_id, category=category, search=search,
        sort=sort, ticker=ticker, page=page, page_size=page_size,
    )


@router.get("/posts/{post_id}")
def get_post(post_id: str, user_id: Optional[str] = None):
    return ForumController().get_post(post_id, user_id)


@router.post("/posts")
def create_post(data: CreatePostRequest):
    return ForumController().create_post(
        data.user_id, data.title, data.content,
        data.category, data.tags, data.ticker_tags,
    )


@router.post("/posts/{post_id}/reply")
def reply_post(post_id: str, data: ReplyRequest):
    return ForumController().reply_post(post_id, data.user_id, data.content)


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: str, data: UserActionRequest):
    return ForumController().toggle_like(post_id, data.user_id)


@router.post("/posts/{post_id}/save")
def toggle_save(post_id: str, data: UserActionRequest):
    return ForumController().toggle_save(post_id, data.user_id)


@router.delete("/posts/{post_id}")
def delete_post(post_id: str, data: UserActionRequest):
    return ForumController().delete_post(post_id, data.user_id)


@router.put("/posts/{post_id}/replies/{reply_id}")
def update_reply(post_id: str, reply_id: str, data: EditReplyRequest):
    return ForumController().update_reply(post_id, reply_id, data.user_id, data.content)


@router.delete("/posts/{post_id}/replies/{reply_id}")
def delete_reply(post_id: str, reply_id: str, data: UserActionRequest):
    return ForumController().delete_reply(post_id, reply_id, data.user_id)


# ── Reply likes ────────────────────────────────────────────────────────────────

@router.post("/replies/{reply_id}/like")
def toggle_reply_like(reply_id: str, data: UserActionRequest):
    return ForumController().toggle_reply_like(reply_id, data.user_id)


# ── Discovery ──────────────────────────────────────────────────────────────────

@router.get("/categories")
def get_categories():
    """Returns the full list of topic categories and post count per category."""
    return ForumController().get_categories()


@router.get("/trending")
def get_trending(limit: int = 5):
    """Top posts by likes + views in the last 7 days."""
    return ForumController().get_trending_posts(limit)


@router.get("/ticker/{ticker}")
def get_posts_by_ticker(ticker: str, user_id: Optional[str] = None, limit: int = 10):
    """All posts mentioning a specific stock ticker e.g. /ticker/AAPL"""
    return ForumController().get_posts_by_ticker(ticker, user_id, limit)


@router.get("/saved")
def get_saved_posts(user_id: str):
    """Get all posts bookmarked by a user."""
    return ForumController().get_saved_posts(user_id)


@router.get("/stats")
def get_forum_stats():
    """Overall forum statistics."""
    return ForumController().get_forum_stats()


# ── Admin moderation ───────────────────────────────────────────────────────────

@router.post("/posts/{post_id}/pin")
def pin_post(post_id: str, data: AdminActionRequest):
    return ForumController().pin_post(post_id, data.value)


@router.post("/posts/{post_id}/feature")
def feature_post(post_id: str, data: AdminActionRequest):
    return ForumController().feature_post(post_id, data.value)


@router.post("/posts/{post_id}/close")
def close_post(post_id: str, data: AdminActionRequest):
    return ForumController().close_post(post_id, data.value)
