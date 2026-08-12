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


# Get published articles for the Knowledge Hub
@router.get("/articles")
def list_articles(
    category: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 50,
):
    articles = ListArticlesController().list(
        category=category,
        tag=tag,
        limit=limit
    )
    return {"success": True, "articles": articles}


# Get a single article by its ID
@router.get("/articles/{article_id}")
def get_article(article_id: str):
    article = GetArticleController().get(article_id)

    if not article:
        return {
            "success": False,
            "message": "Article not found"
        }

    return {
        "success": True,
        "article": article
    }


# Get articles belonging to a specific expert
@router.get("/my-articles/{user_id}")
def get_my_articles(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Users can only view their own articles unless they are an admin
    if (
        current_user["user_id"] != user_id
        and current_user["role"] != "admin"
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    articles = ExpertArticlesController().list(user_id)

    return {
        "success": True,
        "articles": articles
    }


# Request data used when creating an article
class CreateArticleRequest(BaseModel):
    title: str
    summary: str
    content: str
    category: str
    tags: Optional[str] = ""


# Create a new article for the current user
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


# Request data used when updating an article
class UpdateArticleRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None


# Update an existing article
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


# Delete an article owned by the current user
@router.delete("/articles/{article_id}")
def delete_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = DeleteArticleController().delete(
        current_user["user_id"],
        article_id
    )
    return result