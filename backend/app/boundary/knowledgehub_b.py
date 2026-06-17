from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.control.controller.knowledgehub_c import (
    ListArticlesController,
    GetArticleController,
    CreateArticleController,
    UpdateArticleController,
    DeleteArticleController,
    ExpertArticlesController,
)

router = APIRouter(prefix="/knowledge", tags=["Knowledge Hub"])


# ── GET all published articles (investor view, filterable) ─────────────────────

@router.get("/articles")
def list_articles(category: Optional[str] = None,
                  tag: Optional[str] = None,
                  limit: int = 50):
    articles = ListArticlesController().list(category=category, tag=tag, limit=limit)
    return {"success": True, "articles": articles}


# ── GET single article ──────────────────────────────────────────────────────────

@router.get("/articles/{article_id}")
def get_article(article_id: str):
    article = GetArticleController().get(article_id)
    if not article:
        return {"success": False, "message": "Article not found"}
    return {"success": True, "article": article}


# ── GET expert's own articles ───────────────────────────────────────────────────

@router.get("/my-articles/{user_id}")
def get_my_articles(user_id: str):
    articles = ExpertArticlesController().list(user_id)
    return {"success": True, "articles": articles}


# ── POST create article (expert only) ──────────────────────────────────────────

class CreateArticleRequest(BaseModel):
    user_id:  str
    title:    str
    summary:  str
    content:  str
    category: str
    tags:     Optional[str] = ""


@router.post("/articles")
def create_article(data: CreateArticleRequest):
    result = CreateArticleController().create(
        user_id=data.user_id,
        title=data.title,
        summary=data.summary,
        content=data.content,
        category=data.category,
        tags=data.tags or "",
    )
    return result


# ── PUT update article (expert only) ───────────────────────────────────────────

class UpdateArticleRequest(BaseModel):
    user_id:  str
    title:    Optional[str] = None
    summary:  Optional[str] = None
    content:  Optional[str] = None
    category: Optional[str] = None
    tags:     Optional[str] = None
    status:   Optional[str] = None


@router.put("/articles/{article_id}")
def update_article(article_id: str, data: UpdateArticleRequest):
    result = UpdateArticleController().update(
        user_id=data.user_id,
        article_id=article_id,
        title=data.title,
        summary=data.summary,
        content=data.content,
        category=data.category,
        tags=data.tags,
        status=data.status,
    )
    return result


# ── DELETE article (expert only) ───────────────────────────────────────────────

@router.delete("/articles/{article_id}")
def delete_article(article_id: str, user_id: str):
    result = DeleteArticleController().delete(user_id, article_id)
    return result
