from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.control.controller.forumc import ForumController
from app.control.services.auth import get_current_user, get_current_user_optional, require_admin

router = APIRouter(prefix="/consultant-forum", tags=["Forum"])


def _is_privileged(current_user: Optional[dict]) -> bool:
    """True for verified experts, admins, and premium subscribers -- the set
    of viewers allowed to read/act on gated Stock Discussion content."""
    if not current_user:
        return False
    return (
        current_user.get("is_expert") is True
        or current_user.get("role") == "admin"
        or (current_user.get("subscription_status") or "").lower() == "premium"
    )


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



@router.get("/posts")
def list_posts(user_id: Optional[str] = None, category: Optional[str] = None,
               search: Optional[str] = None, sort: Optional[str] = "latest",
               page: int = 1, page_size: int = 50):
    return ForumController().list_posts(
        user_id=user_id, category=category, search=search,
        sort=sort, page=page, page_size=page_size
    )


@router.get("/posts/{post_id}")
def get_post(
    post_id: str, user_id: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    return ForumController().get_post(post_id, user_id, viewer_is_privileged=_is_privileged(current_user))


class CreateStockCommentRequest(BaseModel):
    content: str


@router.get("/stock-comments/{symbol}")
def list_stock_comments(
    symbol: str, page: int = 1, page_size: int = 50,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    user_id = current_user.get("user_id") if current_user else None
    return ForumController().list_stock_comments(
        symbol, user_id=user_id, viewer_is_privileged=_is_privileged(current_user),
        page=page, page_size=page_size,
    )


@router.post("/stock-comments/{symbol}")
def create_stock_comment(
    symbol: str,
    data: CreateStockCommentRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("is_expert") is not True:
        raise HTTPException(status_code=403, detail="Only verified experts can post stock commentary.")
    return ForumController().create_stock_comment(current_user["user_id"], symbol, data.content)



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
    return ForumController().reply_post(
        post_id, current_user["user_id"], data.content,
        actor_is_privileged=_is_privileged(current_user),
    )


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: str, current_user: dict = Depends(get_current_user)):
    return ForumController().toggle_like(
        post_id, current_user["user_id"], actor_is_privileged=_is_privileged(current_user)
    )


@router.post("/posts/{post_id}/save")
def toggle_save(post_id: str, current_user: dict = Depends(get_current_user)):
    return ForumController().toggle_save(
        post_id, current_user["user_id"], actor_is_privileged=_is_privileged(current_user)
    )


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



class FlagPostRequest(BaseModel):
    reason: str = "Inappropriate content"


@router.post("/posts/{post_id}/flag")
def flag_post(post_id: str, data: FlagPostRequest, current_user: dict = Depends(get_current_user)):
    return ForumController().flag_post(post_id, current_user["user_id"], data.reason)


@router.post("/replies/{reply_id}/flag")
def flag_reply(reply_id: str, data: FlagPostRequest, current_user: dict = Depends(get_current_user)):
    return ForumController().flag_reply(reply_id, current_user["user_id"], data.reason)


@router.get("/removal-notice")
def get_removal_notice(current_user: dict = Depends(get_current_user)):
    return ForumController().get_removal_notice(current_user["user_id"])


class AcknowledgeRemovalRequest(BaseModel):
    removal_id: str


@router.post("/removal-notice/acknowledge")
def acknowledge_removal(data: AcknowledgeRemovalRequest, current_user: dict = Depends(get_current_user)):
    return ForumController().acknowledge_removal(data.removal_id, current_user["user_id"])

@router.get("/admin/flagged")
def admin_get_flagged_posts(current_user: dict = Depends(require_admin)):
    return ForumController().admin_flagged_posts()


@router.get("/admin/all")
def admin_list_posts(current_user: dict = Depends(require_admin)):
    return ForumController().admin_list_posts()


@router.delete("/admin/{post_id}/flags")
def admin_clear_post_flags(post_id: str, current_user: dict = Depends(require_admin)):
    return ForumController().admin_clear_flags(post_id)


@router.delete("/admin/replies/{reply_id}/flags")
def admin_clear_reply_flags(reply_id: str, current_user: dict = Depends(require_admin)):
    return ForumController().admin_clear_reply_flags(reply_id)


class AdminDeletePostRequest(BaseModel):
    reason: str = "Violated community guidelines"


@router.delete("/admin/{post_id}")
def admin_delete_post(post_id: str, data: AdminDeletePostRequest, current_user: dict = Depends(require_admin)):
    return ForumController().admin_delete_post(post_id, admin_user_id=current_user["user_id"], reason=data.reason)


@router.delete("/admin/posts/{post_id}/replies/{reply_id}")
def admin_delete_reply(post_id: str, reply_id: str, data: AdminDeletePostRequest, current_user: dict = Depends(require_admin)):
    return ForumController().admin_delete_reply(post_id, reply_id, reason=data.reason)
