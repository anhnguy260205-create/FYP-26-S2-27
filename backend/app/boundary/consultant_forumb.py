from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.control.controller.forumc import ForumController
from app.control.services.auth import get_current_user, require_admin

router = APIRouter(prefix="/consultant-forum", tags=["Forum"])


# ── Request models ─────────────────────────────────────────────────────────────

class CreatePostRequest(BaseModel):
    title:       str
    content:     str
    category:    Optional[str] = "Technical Analysis"
    tags:        List[str] = []
    ticker_tags: List[str] = []


class UpdatePostRequest(BaseModel):
    title:       Optional[str] = None
    content:     Optional[str] = None
    category:    Optional[str] = None
    tags:        Optional[List[str]] = None
    ticker_tags: Optional[List[str]] = None


class ReplyRequest(BaseModel):
    content: str


class EditReplyRequest(BaseModel):
    content: str


# ── Public reads ───────────────────────────────────────────────────────────────

@router.get("/posts")
def list_posts(user_id: Optional[str] = None, category: Optional[str] = None,
               search: Optional[str] = None, sort: Optional[str] = "latest",
               page: int = 1, page_size: int = 50):
    return ForumController().list_posts(
        user_id=user_id, category=category, search=search,
        sort=sort, page=page, page_size=page_size
    )


@router.get("/posts/{post_id}")
def get_post(post_id: str, user_id: Optional[str] = None):
    return ForumController().get_post(post_id, user_id)


# ── Authenticated write operations ─────────────────────────────────────────────

@router.post("/posts")
def create_post(
    data: CreatePostRequest,
    current_user: dict = Depends(get_current_user),
):
    return ForumController().create_post(
        current_user["user_id"], data.title, data.content,
        data.category, data.tags, data.ticker_tags,
    )


@router.put("/posts/{post_id}")
def update_post(
    post_id: str,
    data: UpdatePostRequest,
    current_user: dict = Depends(get_current_user),
):
    return ForumController().update_post(
        post_id, current_user["user_id"],
        title=data.title, content=data.content,
        category=data.category, tags=data.tags, ticker_tags=data.ticker_tags,
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
    is_admin = current_user.get("role") == "admin"
    return ForumController().delete_post(post_id, current_user["user_id"], is_admin=is_admin)


@router.put("/posts/{post_id}/replies/{reply_id}")
def update_reply(
    post_id: str, reply_id: str,
    data: EditReplyRequest,
    current_user: dict = Depends(get_current_user),
):
    return ForumController().update_reply(
        post_id, reply_id, current_user["user_id"], data.content
    )


@router.delete("/posts/{post_id}/replies/{reply_id}")
def delete_reply(
    post_id: str, reply_id: str,
    current_user: dict = Depends(get_current_user),
):
    is_admin = current_user.get("role") == "admin"
    return ForumController().delete_reply(post_id, reply_id, current_user["user_id"], is_admin=is_admin)


# ── Flagging / removal notices ──────────────────────────────────────────────────

class FlagPostRequest(BaseModel):
    reason: str = "Inappropriate content"


@router.post("/posts/{post_id}/flag")
def flag_post(post_id: str, data: FlagPostRequest, current_user: dict = Depends(get_current_user)):
    return ForumController().flag_post(post_id, current_user["user_id"], data.reason)


@router.get("/removal-notice")
def get_removal_notice(current_user: dict = Depends(get_current_user)):
    return ForumController().get_removal_notice(current_user["user_id"])


class AcknowledgeRemovalRequest(BaseModel):
    removal_id: str


@router.post("/removal-notice/acknowledge")
def acknowledge_removal(data: AcknowledgeRemovalRequest, current_user: dict = Depends(get_current_user)):
    return ForumController().acknowledge_removal(data.removal_id, current_user["user_id"])


# ── Admin moderation ────────────────────────────────────────────────────────────

@router.get("/admin/flagged")
def admin_get_flagged_posts(current_user: dict = Depends(require_admin)):
    return ForumController().admin_flagged_posts()


@router.get("/admin/all")
def admin_list_posts(current_user: dict = Depends(require_admin)):
    return ForumController().admin_list_posts()


class AdminDeletePostRequest(BaseModel):
    reason: str = "Violated community guidelines"


@router.delete("/admin/{post_id}")
def admin_delete_post(post_id: str, data: AdminDeletePostRequest, current_user: dict = Depends(require_admin)):
    return ForumController().admin_delete_post(post_id, admin_user_id=current_user["user_id"], reason=data.reason)
