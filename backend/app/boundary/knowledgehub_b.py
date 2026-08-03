from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.control.controller.knowledgehub_c import (
    ListArticlesController,
    GetArticleController,
    CreateArticleController,
    UpdateArticleController,
    DeleteArticleController,
    ExpertArticlesController,
)
from app.control.services.auth import get_current_user

router = APIRouter(prefix="/knowledge", tags=["Knowledge Hub"])



@router.get("/articles")
def list_articles(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 50,
):
    articles = ListArticlesController().list(category=category, tag=tag, limit=limit)
    return {"success": True, "articles": articles}


@router.get("/articles/{article_id}")
def get_article(article_id: str):
    article = GetArticleController().get(article_id)
    if not article:
        return {"success": False, "message": "Article not found"}
    return {"success": True, "article": article}


@router.get("/my-articles/{user_id}")
def get_my_articles(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    articles = ExpertArticlesController().list(user_id)
    return {"success": True, "articles": articles}


class CreateArticleRequest(BaseModel):
    title: str
    summary: str
    content: str
    category: str
    tags: Optional[str] = ""


@router.post("/articles")
def create_article(
    data: CreateArticleRequest,
    current_user: dict = Depends(get_current_user),
):
    result = CreateArticleController().create(
        user_id=current_user["user_id"],
        title=data.title,
        summary=data.summary,
        content=data.content,
        category=data.category,
        tags=data.tags or "",
    )
    return result


class UpdateArticleRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None


@router.put("/articles/{article_id}")
def update_article(
    article_id: str,
    data: UpdateArticleRequest,
    current_user: dict = Depends(get_current_user),
):
    result = UpdateArticleController().update(
        user_id=current_user["user_id"],
        article_id=article_id,
        title=data.title,
        summary=data.summary,
        content=data.content,
        category=data.category,
        tags=data.tags,
        status=data.status,
    )
    return result


@router.delete("/articles/{article_id}")
def delete_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = DeleteArticleController().delete(current_user["user_id"], article_id)
    return result
