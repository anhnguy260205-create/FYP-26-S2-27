
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.control.controller.forumc import ForumController

router = APIRouter(prefix="/consultant-forum", tags=["Forum"])


class CreatePostRequest(BaseModel):
    user_id: Optional[str] = None
    title: str
    content: str
    category: Optional[str] = "General"
    tags: List[str] = []


class ReplyRequest(BaseModel):
    user_id: Optional[str] = None
    content: str


class EditReplyRequest(BaseModel):
    user_id: Optional[str] = None
    content: str


class UserActionRequest(BaseModel):
    user_id: str


@router.get("/posts")
def list_posts(user_id: Optional[str] = None):
    return ForumController().list_posts(user_id)


@router.get("/posts/{post_id}")
def get_post(post_id: str, user_id: Optional[str] = None):
    return ForumController().get_post(post_id, user_id)


@router.post("/posts")
def create_post(data: CreatePostRequest):
    return ForumController().create_post(data.user_id, data.title, data.content, data.category, data.tags)


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
