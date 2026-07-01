from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.control.controller.forumc import ForumController
from app.control.services.auth import get_current_user

router = APIRouter(prefix="/consultant-forum", tags=["Forum"])


class CreatePostRequest(BaseModel):
    title: str
    content: str
    category: Optional[str] = "General"
    tags: List[str] = []
    symbol: Optional[str] = None


class ReplyRequest(BaseModel):
    content: str


class EditReplyRequest(BaseModel):
    content: str


# ── Public reads ───────────────────────────────────────────────────────────────

@router.get("/posts")
def list_posts(user_id: Optional[str] = None, symbol: Optional[str] = None):
    return ForumController().list_posts(user_id, symbol)


@router.get("/posts/{post_id}")
def get_post(post_id: str, user_id: Optional[str] = None):
    return ForumController().get_post(post_id, user_id)


# ── Auth: write operations ─────────────────────────────────────────────────────

@router.post("/posts")
def create_post(
    data: CreatePostRequest,
    current_user: dict = Depends(get_current_user),
):
    return ForumController().create_post(
        current_user["user_id"], data.title, data.content, data.category, data.tags, data.symbol
    )


@router.post("/posts/{post_id}/reply")
def reply_post(
    post_id: str,
    data: ReplyRequest,
    current_user: dict = Depends(get_current_user),
):
    return ForumController().reply_post(post_id, current_user["user_id"], data.content)


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: str, current_user: dict = Depends(get_current_user)):
    return ForumController().toggle_like(post_id, current_user["user_id"])


@router.post("/posts/{post_id}/save")
def toggle_save(post_id: str, current_user: dict = Depends(get_current_user)):
    return ForumController().toggle_save(post_id, current_user["user_id"])


@router.delete("/posts/{post_id}")
def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    return ForumController().delete_post(post_id, current_user["user_id"])


@router.put("/posts/{post_id}/replies/{reply_id}")
def update_reply(
    post_id: str,
    reply_id: str,
    data: EditReplyRequest,
    current_user: dict = Depends(get_current_user),
):
    return ForumController().update_reply(
        post_id, reply_id, current_user["user_id"], data.content
    )


@router.delete("/posts/{post_id}/replies/{reply_id}")
def delete_reply(
    post_id: str,
    reply_id: str,
    current_user: dict = Depends(get_current_user),
):
    return ForumController().delete_reply(post_id, reply_id, current_user["user_id"])
