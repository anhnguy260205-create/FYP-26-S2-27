from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.control.controller.adminc import AdminUserAccountController
from app.control.controller.knowledgehub_c import (
    AdminListArticlesController,
    AdminUpdateArticleController,
    AdminDeleteArticleController,
    GetArticleController,
)
from app.entity.models.expert import Expert
from app.control.services.auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminArticleRequest(BaseModel):
    title: str
    summary: Optional[str] = ""
    category: str
    content: str
    tags: Optional[str] = ""
    status: str = "published"


# ── User account management ────────────────────────────────────────────────────

@router.get("/useraccounts")
def get_user_accounts(
    keyword: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    _: dict = Depends(require_admin),
):
    users = AdminUserAccountController().getUserAccounts(keyword, role, status)
    return {"success": True, "count": len(users), "users": users}


@router.get("/useraccounts/{user_id}")
def view_user_account(user_id: str, _: dict = Depends(require_admin)):
    user = AdminUserAccountController().getUserAccountById(user_id)
    if not user:
        return {"success": False, "message": "User not found"}
    return {"success": True, "user": user}


@router.put("/useraccounts/{user_id}/suspend")
def suspend_user_account(user_id: str, _: dict = Depends(require_admin)):
    ok = AdminUserAccountController().suspendUserAccount(user_id)
    if not ok:
        return {"success": False, "message": "User not found"}
    return {"success": True, "message": "User suspended successfully"}


@router.delete("/useraccounts/{user_id}")
def delete_user_account(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    result = AdminUserAccountController().deleteUserAccount(
        user_id, current_user["user_id"]
    )
    if result == "self_delete":
        return {"success": False, "message": "You cannot delete your own account"}
    if not result:
        return {"success": False, "message": "User not found"}
    return {"success": True, "message": "User account deleted successfully"}


@router.put("/useraccounts/{user_id}/activate")
def activate_user_account(user_id: str, _: dict = Depends(require_admin)):
    ok = AdminUserAccountController().activateUserAccount(user_id)
    if not ok:
        return {"success": False, "message": "User not found"}
    return {"success": True, "message": "User activated successfully"}


# ── Knowledge hub (admin) ──────────────────────────────────────────────────────

@router.get("/articles")
def get_admin_articles(_: dict = Depends(require_admin)):
    articles = AdminListArticlesController().list()
    return {"success": True, "count": len(articles), "articles": articles}


@router.get("/articles/{article_id}")
def get_admin_article(article_id: str, _: dict = Depends(require_admin)):
    article = GetArticleController().get(article_id)
    if not article:
        return {"success": False, "message": "Article not found"}
    return {"success": True, "article": article}


@router.put("/articles/{article_id}")
def update_admin_article(
    article_id: str,
    data: AdminArticleRequest,
    _: dict = Depends(require_admin),
):
    return AdminUpdateArticleController().update(
        article_id,
        title=data.title,
        summary=data.summary,
        content=data.content,
        category=data.category,
        tags=data.tags,
        status=data.status,
    )


@router.delete("/articles/{article_id}")
def delete_admin_article(article_id: str, _: dict = Depends(require_admin)):
    AdminDeleteArticleController().delete(article_id)
    return {"success": True, "message": "Article deleted successfully"}


# ── Dashboard / subscriptions ──────────────────────────────────────────────────

@router.get("/dashboard-stats")
def get_dashboard_stats(_: dict = Depends(require_admin)):
    stats = AdminUserAccountController().getDashboardStats()
    return {"success": True, **stats}


@router.get("/subscriptions")
def get_subscriptions(_: dict = Depends(require_admin)):
    subs = AdminUserAccountController().getSubscriptions()
    return {"success": True, "count": len(subs), "subscriptions": subs}


# ── Expert verification ────────────────────────────────────────────────────────

@router.get("/experts")
def get_all_experts(_: dict = Depends(require_admin)):
    experts = Expert.get_all_for_admin()
    return {"success": True, "experts": experts}


@router.post("/experts/{expert_id}/approve")
def approve_expert(expert_id: str, _: dict = Depends(require_admin)):
    ok = Expert.set_verification_status(expert_id, "approved")
    if not ok:
        return {"success": False, "message": "Expert not found"}
    return {"success": True, "message": "Expert approved"}


@router.post("/experts/{expert_id}/reject")
def reject_expert(expert_id: str, _: dict = Depends(require_admin)):
    ok = Expert.set_verification_status(expert_id, "rejected")
    if not ok:
        return {"success": False, "message": "Expert not found"}
    return {"success": True, "message": "Expert rejected"}
