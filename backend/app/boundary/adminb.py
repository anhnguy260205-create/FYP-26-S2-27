from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.control.controller.adminc import AdminUserAccountController
from app.control.controller.knowledgehub_c import (
    AdminListArticlesController,
    AdminUpdateArticleController,
    AdminDeleteArticleController,
    GetArticleController,
)
from app.entity.models.expert import Expert

router = APIRouter(prefix="/admin", tags=["Admin"])

class AdminArticleRequest(BaseModel):
    title: str
    summary: Optional[str] = ""
    category: str
    content: str
    tags: Optional[str] = ""
    status: str = "published"

class AdminUserAccountPage:
    def __init__(self):
        self.controller = AdminUserAccountController()

    def searchUserAccounts(self, keyword=None, role=None, status=None):
        return self.controller.getUserAccounts(keyword, role, status)

    def viewUserAccount(self, user_id):
        return self.controller.getUserAccountById(user_id)

    def suspendUserAccount(self, user_id):
        return self.controller.suspendUserAccount(user_id)

    def deleteUserAccount(self, user_id, requesting_user_id=None):
        return self.controller.deleteUserAccount(user_id, requesting_user_id)

    def activateUserAccount(self, user_id):
        return self.controller.activateUserAccount(user_id)


@router.get("/useraccounts")
def get_user_accounts(
    keyword: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
):
    boundary = AdminUserAccountPage()
    users = boundary.searchUserAccounts(keyword, role, status)

    return {
        "success": True,
        "count": len(users),
        "users": users,
    }


@router.get("/useraccounts/{user_id}")
def view_user_account(user_id: str):
    boundary = AdminUserAccountPage()
    user = boundary.viewUserAccount(user_id)

    if not user:
        return {
            "success": False,
            "message": "User not found",
        }

    return {
        "success": True,
        "user": user,
    }


@router.put("/useraccounts/{user_id}/suspend")
def suspend_user_account(user_id: str):
    boundary = AdminUserAccountPage()
    success = boundary.suspendUserAccount(user_id)

    if not success:
        return {
            "success": False,
            "message": "User not found",
        }

    return {
        "success": True,
        "message": "User suspended successfully",
    }


@router.delete("/useraccounts/{user_id}")
def delete_user_account(user_id: str, requesting_user_id: Optional[str] = None):
    boundary = AdminUserAccountPage()
    result = boundary.deleteUserAccount(user_id, requesting_user_id)

    if result == "self_delete":
        return {
            "success": False,
            "message": "You cannot delete your own account",
        }

    if not result:
        return {
            "success": False,
            "message": "User not found",
        }

    return {
        "success": True,
        "message": "User account deleted successfully",
    }

@router.put("/useraccounts/{user_id}/activate")
def activate_user_account(user_id: str):
    boundary = AdminUserAccountPage()
    success = boundary.activateUserAccount(user_id)

    if not success:
        return {
            "success": False,
            "message": "User not found",
        }

    return {
        "success": True,
        "message": "User activated successfully",
    }

@router.get("/articles")
def get_admin_articles():
    articles = AdminListArticlesController().list()
    return {"success": True, "count": len(articles), "articles": articles}


@router.get("/articles/{article_id}")
def get_admin_article(article_id: str):
    article = GetArticleController().get(article_id)
    if not article:
        return {"success": False, "message": "Article not found"}
    return {"success": True, "article": article}


@router.put("/articles/{article_id}")
def update_admin_article(article_id: str, data: AdminArticleRequest):
    result = AdminUpdateArticleController().update(
        article_id,
        title=data.title,
        summary=data.summary,
        content=data.content,
        category=data.category,
        tags=data.tags,
        status=data.status,
    )
    return result


@router.delete("/articles/{article_id}")
def delete_admin_article(article_id: str):
    result = AdminDeleteArticleController().delete(article_id)
    return {
        "success": True,
        "message": "Article deleted successfully",
    }


@router.get("/dashboard-stats")
def get_dashboard_stats():
    stats = AdminUserAccountPage().controller.getDashboardStats()
    return {"success": True, **stats}


@router.get("/subscriptions")
def get_subscriptions():
    subs = AdminUserAccountPage().controller.getSubscriptions()
    return {"success": True, "count": len(subs), "subscriptions": subs}


# ── Expert verification ────────────────────────────────────────────────────────

@router.get("/experts")
def get_all_experts():
    experts = Expert.get_all_for_admin()
    return {"success": True, "experts": experts}


@router.post("/experts/{expert_id}/approve")
def approve_expert(expert_id: str):
    ok = Expert.set_verification_status(expert_id, "approved")
    if not ok:
        return {"success": False, "message": "Expert not found"}
    return {"success": True, "message": "Expert approved"}


@router.post("/experts/{expert_id}/reject")
def reject_expert(expert_id: str):
    ok = Expert.set_verification_status(expert_id, "rejected")
    if not ok:
        return {"success": False, "message": "Expert not found"}
    return {"success": True, "message": "Expert rejected"}
