from typing import Optional
from fastapi import APIRouter

from app.control.controller.adminc import AdminUserAccountController

router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminUserAccountPage:
    def __init__(self):
        self.controller = AdminUserAccountController()

    def searchUserAccounts(self, keyword=None, role=None, status=None):
        return self.controller.getUserAccounts(keyword, role, status)

    def viewUserAccount(self, user_id):
        return self.controller.getUserAccountById(user_id)

    def suspendUserAccount(self, user_id):
        return self.controller.suspendUserAccount(user_id)

    def deleteUserAccount(self, user_id):
        return self.controller.deleteUserAccount(user_id)


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
def delete_user_account(user_id: str):
    boundary = AdminUserAccountPage()
    success = boundary.deleteUserAccount(user_id)

    if not success:
        return {
            "success": False,
            "message": "User not found",
        }

    return {
        "success": True,
        "message": "User deleted successfully",
    }
