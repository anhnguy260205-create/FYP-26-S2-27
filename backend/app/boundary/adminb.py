import threading
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.control.controller.adminc import AdminUserAccountController
from app.control.controller.knowledgehub_c import (
    AdminListArticlesController,
    AdminCreateArticleController,
    AdminUpdateArticleController,
    AdminDeleteArticleController,
    GetArticleController,
)
from app.control.controller.notificationc import create_notification
from app.control.services.firebase_admin_service import delete_firebase_user_by_email
from app.control.services.auth import require_admin
from app.control.services.email_service import send_expert_verified_email, send_expert_rejected_email, send_expert_verification_cancelled_email
from app.entity.models.expert import Expert
from app.entity.models.expertverification import ExpertVerification
from app.entity.models.investor import Investor
from app.entity.models.useraccount import UserAccount

router = APIRouter(prefix="/admin", tags=["Admin"])


def _notify_article_author(article: dict, notif_title: str, notif_message: str):
    """Notify the expert who wrote the article — admin-created articles have
    no expert_id, so this is a no-op for those."""
    expert_id = article.get("expert_id")
    if not expert_id:
        return
    user_id = Expert.get_user_id_by_expert_id(expert_id)
    if user_id:
        create_notification(user_id, "article", notif_title, notif_message)


def _notify_investors_new_article(article: dict):
    """Broadcast a new-content notification to every investor, naming the
    author and topic so it's useful without opening it."""
    title = f"New article: {article['title']}"
    message = f"{article['author']} just published a new {article['category']} article — check it out in Educational Content."
    for user_id in Investor.get_all_user_ids():
        create_notification(user_id, "article", title, message)


def _notify_expert_verification(expert_id: str, notif_title: str, notif_message: str, email_fn):
    """Create the in-app notification synchronously (so it's visible the
    moment the admin action returns) and send the matching email in the
    background, mirroring the pattern used for subscription emails."""
    user_id = Expert.get_user_id_by_expert_id(expert_id)
    if not user_id:
        return
    create_notification(user_id, "verification", notif_title, notif_message)
    info = UserAccount.get_user_information(user_id)
    if info:
        threading.Thread(
            target=email_fn,
            args=(info["email_address"], info["username"]),
            daemon=True,
        ).start()


class InvestmentArticleRequest(BaseModel):
    title: str
    category: str
    content: str
    summary: Optional[str] = None
    tags: Optional[str] = None
    status: str = "published"


class AdminUserAccountPage:
    def __init__(self):
        self.controller = AdminUserAccountController()

    def searchUserAccounts(self, keyword=None, role=None, status=None, tier=None):
        return self.controller.getUserAccounts(keyword, role, status, tier)

    def viewUserAccount(self, user_id):
        return self.controller.getUserAccountById(user_id)

    def suspendUserAccount(self, user_id):
        return self.controller.suspendUserAccount(user_id)

    def activateUserAccount(self, user_id):
        return self.controller.activateUserAccount(user_id)

    def getDashboardStats(self):
        return self.controller.getDashboardStats()

    def getSignupStats(self, days=30):
        return self.controller.getSignupStats(days)

    def getUserTypeBreakdown(self):
        return self.controller.getUserTypeBreakdown()

    def getRevenueStats(self):
        return self.controller.getRevenueStats()

    def getRevenueByMonth(self, months=6):
        return self.controller.getRevenueByMonth(months)

    def getSubscriptions(self):
        return self.controller.getSubscriptions()

    def getInvestmentArticles(self):
        return AdminListArticlesController().list()

    def getInvestmentArticleById(self, article_id):
        return GetArticleController().get(article_id)

    def createInvestmentArticle(self, data):
        return AdminCreateArticleController().create(
            data.title,
            data.summary,
            data.content,
            data.category,
            data.tags or "",
            data.status,
        )

    def updateInvestmentArticle(self, article_id, data):
        return AdminUpdateArticleController().update(
            article_id,
            title=data.title,
            summary=data.summary,
            content=data.content,
            category=data.category,
            tags=data.tags,
            status=data.status,
        )

    def deleteInvestmentArticle(self, article_id):
        return AdminDeleteArticleController().delete(article_id)

    def setArticleStatus(self, article_id, status):
        return AdminUpdateArticleController().update(article_id, status=status)

    def getAllExperts(self):
        return self.controller.getAllExperts()

    def setExpertVerificationStatus(self, expert_id, status):
        return self.controller.setExpertVerificationStatus(expert_id, status)


@router.get("/useraccounts")
def get_user_accounts(
    keyword: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    tier: Optional[str] = None,
    current_user: dict = Depends(require_admin),
):
    boundary = AdminUserAccountPage()
    users = boundary.searchUserAccounts(keyword, role, status, tier)

    return {
        "success": True,
        "count": len(users),
        "users": users,
    }


@router.get("/useraccounts/{user_id}")
def view_user_account(user_id: str, current_user: dict = Depends(require_admin)):
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
def suspend_user_account(user_id: str, current_user: dict = Depends(require_admin)):
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


class DeleteFirebaseOrphanRequest(BaseModel):
    email: str


@router.post("/firebase-cleanup")
def delete_firebase_orphan(data: DeleteFirebaseOrphanRequest, current_user: dict = Depends(require_admin)):
    """Delete a Firebase Auth user that has no matching account in our DB —
    for cleaning up accounts deleted before Firebase deletion was wired in."""
    ok = delete_firebase_user_by_email(data.email.strip().lower())
    return {"success": ok}


@router.put("/useraccounts/{user_id}/activate")
def activate_user_account(user_id: str, current_user: dict = Depends(require_admin)):
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


@router.get("/dashboard-stats")
def get_dashboard_stats(current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    return {"success": True, **boundary.getDashboardStats()}


@router.get("/signup-stats")
def get_signup_stats(days: int = 30, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    return {"success": True, **boundary.getSignupStats(days)}


@router.get("/user-types")
def get_user_types(current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    return {"success": True, **boundary.getUserTypeBreakdown()}


@router.get("/revenue-stats")
def get_revenue_stats(current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    return {"success": True, **boundary.getRevenueStats()}


@router.get("/revenue-by-month")
def get_revenue_by_month(months: int = 6, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    return {"success": True, **boundary.getRevenueByMonth(months)}


@router.get("/subscriptions")
def get_subscriptions(current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    subs = boundary.getSubscriptions()
    return {"success": True, "subscriptions": subs}


@router.get("/articles")
def get_investment_articles(current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    articles = boundary.getInvestmentArticles()

    return {
        "success": True,
        "count": len(articles),
        "articles": articles,
    }


@router.get("/articles/{article_id}")
def get_investment_article(article_id: str, current_user: dict = Depends(require_admin)):
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
def create_investment_article(data: InvestmentArticleRequest, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    return boundary.createInvestmentArticle(data)


@router.put("/articles/{article_id}")
def update_investment_article(article_id: str, data: InvestmentArticleRequest, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    return boundary.updateInvestmentArticle(article_id, data)


@router.delete("/articles/{article_id}")
def delete_investment_article(article_id: str, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    article = boundary.getInvestmentArticleById(article_id)
    result = boundary.deleteInvestmentArticle(article_id)

    if result.get("success") and article:
        _notify_article_author(
            article,
            notif_title="Your article has been removed",
            notif_message=f"An administrator removed your published article \"{article['title']}\" from the Knowledge Hub.",
        )

    return result


@router.post("/articles/{article_id}/approve")
def approve_article(article_id: str, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    article = boundary.getInvestmentArticleById(article_id)
    if not article:
        return {"success": False, "message": "Article not found"}
    result = boundary.setArticleStatus(article_id, "published")
    if not result.get("success"):
        return result

    _notify_article_author(
        article,
        notif_title="Your article has been published",
        notif_message=f"\"{article['title']}\" was approved and is now live in the Knowledge Hub.",
    )
    _notify_investors_new_article(article)

    return {"success": True, "message": "Article approved and published"}


@router.post("/articles/{article_id}/reject")
def reject_article(article_id: str, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    article = boundary.getInvestmentArticleById(article_id)
    if not article:
        return {"success": False, "message": "Article not found"}
    result = boundary.setArticleStatus(article_id, "rejected")
    if not result.get("success"):
        return result

    _notify_article_author(
        article,
        notif_title="Your article was not approved",
        notif_message=f"\"{article['title']}\" was reviewed and rejected. You can edit and resubmit it from My Articles.",
    )
    return {"success": True, "message": "Article rejected"}


@router.get("/experts")
def get_all_experts(current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    experts = boundary.getAllExperts()

    return {
        "success": True,
        "count": len(experts),
        "experts": experts,
    }


@router.post("/experts/{expert_id}/approve")
def approve_expert(expert_id: str, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    success = boundary.setExpertVerificationStatus(expert_id, "approved")

    if not success:
        return {
            "success": False,
            "message": "Expert not found",
        }

    _notify_expert_verification(
        expert_id,
        notif_title="Your expert account has been verified",
        notif_message="Your credentials have been reviewed and approved. You now appear as a verified expert.",
        email_fn=send_expert_verified_email,
    )

    return {
        "success": True,
        "message": "Expert approved successfully",
    }


@router.post("/experts/{expert_id}/reject")
def reject_expert(expert_id: str, current_user: dict = Depends(require_admin)):
    boundary = AdminUserAccountPage()
    success = boundary.setExpertVerificationStatus(expert_id, "rejected")

    if not success:
        return {
            "success": False,
            "message": "Expert not found",
        }

    _notify_expert_verification(
        expert_id,
        notif_title="Your expert application was not approved",
        notif_message="Your submitted documents were reviewed and not approved. Update your documents and resubmit to be reviewed again.",
        email_fn=send_expert_rejected_email,
    )

    return {
        "success": True,
        "message": "Expert rejected successfully",
    }


@router.post("/experts/{expert_id}/cancel")
def cancel_expert_verification(expert_id: str, current_user: dict = Depends(require_admin)):
    """Revoke a previously-approved expert's verified status, putting them
    back into the not-submitted state so they must resubmit to reapply.
    Also clears their submitted documents — cancelling wipes the slate
    clean rather than leaving stale documents sitting under a cancelled
    verification."""
    boundary = AdminUserAccountPage()
    success = boundary.setExpertVerificationStatus(expert_id, "not_submitted")

    if not success:
        return {
            "success": False,
            "message": "Expert not found",
        }

    ExpertVerification.update_documents(expert_id, [])

    _notify_expert_verification(
        expert_id,
        notif_title="Your expert verification has been cancelled",
        notif_message="An administrator has revoked your verified status. Resubmit your credentials to be reviewed again.",
        email_fn=send_expert_verification_cancelled_email,
    )

    return {
        "success": True,
        "message": "Expert verification cancelled",
    }
