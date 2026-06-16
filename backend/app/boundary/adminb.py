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

@router.get("/useraccounts/{user_id}")
def view_user_account(user_id: str):
    boundary = AdminUserAccountPage()
    user = boundary.controller.getUserAccountById(user_id)

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
    result = boundary.controller.suspendUserAccount(user_id)

    if not result:
        return {
            "success": False,
            "message": "User not found",
        }

    return {
        "success": True,
        "message": "User suspended successfully",
    }


@router.delete("/useraccounts/{user_id}")
def delete_user_account(user_id: str):
    boundary = AdminUserAccountPage()
    result = boundary.controller.deleteUserAccount(user_id)

    if not result:
        return {
            "success": False,
            "message": "User not found or delete failed",
        }

    return {
        "success": True,
        "message": "User deleted successfully",
    }