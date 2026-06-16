from typing import Optional
from fastapi import APIRouter

from app.control.controller.adminc import AdminUserAccountController

router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminUserAccountPage:
    def __init__(self):
        self.controller = AdminUserAccountController()

    def searchUserAccounts(self, keyword=None, role=None, status=None):
        return self.controller.getUserAccounts(keyword, role, status)


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