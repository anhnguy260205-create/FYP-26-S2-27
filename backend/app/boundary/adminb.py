from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.control.controller.adminc import AdminUserAccountController
from app.control.services.firebase_admin_service import delete_firebase_user_by_email
from app.control.services.auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


class InvestmentArticleRequest(BaseModel):
    title: str
    category: str
    content: str
    status: str = "draft"


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

    def getInvestmentArticles(self):
        return self.controller.getInvestmentArticles()

    def getInvestmentArticleById(self, article_id):
        return self.controller.getInvestmentArticleById(article_id)

    def createInvestmentArticle(self, data):
        return self.controller.createInvestmentArticle(
            data.title,
            data.category,
            data.content,
            data.status,
        )

    def updateInvestmentArticle(self, article_id, data):
        return self.controller.updateInvestmentArticle(
            article_id,
            data.title,
            data.category,
            data.content,
            data.status,
        )

    def deleteInvestmentArticle(self, article_id):
        return self.controller.deleteInvestmentArticle(article_id)


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


class DeleteFirebaseOrphanRequest(BaseModel):
    email: str


@router.post("/firebase-cleanup")
def delete_firebase_orphan(data: DeleteFirebaseOrphanRequest, current_user: dict = Depends(require_admin)):
    """Delete a Firebase Auth user that has no matching account in our DB —
    for cleaning up accounts deleted before Firebase deletion was wired in."""
    ok = delete_firebase_user_by_email(data.email.strip().lower())
    return {"success": ok}


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
def get_investment_articles():
    boundary = AdminUserAccountPage()
    articles = boundary.getInvestmentArticles()

    return {
        "success": True,
        "count": len(articles),
        "articles": articles,
    }


@router.get("/articles/{article_id}")
def get_investment_article(article_id: str):
    boundary = AdminUserAccountPage()
    article = boundary.getInvestmentArticleById(article_id)

    if not article:
        return {
            "success": False,
            "message": "Article not found",
        }

    return {
        "success": True,
        "article": article,
    }


@router.post("/articles")
def create_investment_article(data: InvestmentArticleRequest):
    boundary = AdminUserAccountPage()
    article_id = boundary.createInvestmentArticle(data)

    return {
        "success": True,
        "message": "Article created successfully",
        "article_id": article_id,
    }


@router.put("/articles/{article_id}")
def update_investment_article(article_id: str, data: InvestmentArticleRequest):
    boundary = AdminUserAccountPage()
    success = boundary.updateInvestmentArticle(article_id, data)

    if not success:
        return {
            "success": False,
            "message": "Article not found",
        }

    return {
        "success": True,
        "message": "Article updated successfully",
    }


@router.delete("/articles/{article_id}")
def delete_investment_article(article_id: str):
    boundary = AdminUserAccountPage()
    success = boundary.deleteInvestmentArticle(article_id)

    if not success:
        return {
            "success": False,
            "message": "Article not found",
        }

    return {
        "success": True,
        "message": "Article deleted successfully",
    }
