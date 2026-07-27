from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from app.control.controller.notificationc import (
    GetNotificationsController,
    MarkNotificationReadController,
    MarkAllNotificationsReadController,
    BroadcastNotificationController,
    GetBroadcastHistoryController,
    UpdateBroadcastController,
    DeleteBroadcastController,
    GetAllNotificationsAdminController,
    UpdateNotificationAdminController,
    GetNotificationTemplatesController,
    UpdateNotificationTemplateController,
    DeleteNotificationController,
)
from app.control.services.auth import get_current_user, require_admin

router = APIRouter(prefix="/notification", tags=["Notification"])


class BroadcastRequest(BaseModel):
    audience: str  # "investor" | "expert" | "both"
    title: str
    message: str


class NotificationEditRequest(BaseModel):
    title: str
    message: str


def _validate_text(title: str, message: str):
    title = title.strip()
    message = message.strip()
    if not title or not message:
        raise HTTPException(status_code=400, detail="Title and message are required")
    if len(title) > 200:
        raise HTTPException(status_code=400, detail="Title must be 200 characters or fewer")
    if len(message) > 500:
        raise HTTPException(status_code=400, detail="Message must be 500 characters or fewer")
    return title, message


@router.post("/broadcast")
def broadcast_notification(data: BroadcastRequest, current_user: dict = Depends(require_admin)):
    if data.audience not in ("investor", "expert", "both"):
        raise HTTPException(status_code=400, detail="Invalid audience")
    title, message = _validate_text(data.title, data.message)
    count = BroadcastNotificationController().broadcast(
        data.audience, title, message, sent_by=current_user["user_id"]
    )
    return {"success": True, "count": count}


@router.get("/broadcast/history")
def get_broadcast_history(q: str = None, current_user: dict = Depends(require_admin)):
    history = GetBroadcastHistoryController().get_history(search=q)
    return {"success": True, "broadcasts": [
        {
            "broadcast_id": b.broadcast_id,
            "audience": b.audience,
            "title": b.title,
            "message": b.message,
            "recipient_count": b.recipient_count,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in history
    ]}


@router.put("/broadcast/{broadcast_id}")
def update_broadcast(
    broadcast_id: int,
    data: NotificationEditRequest,
    current_user: dict = Depends(require_admin),
):
    title, message = _validate_text(data.title, data.message)
    ok = UpdateBroadcastController().update_broadcast(broadcast_id, title, message)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Notification updated for all recipients"}


@router.delete("/broadcast/{broadcast_id}")
def delete_broadcast(broadcast_id: int, current_user: dict = Depends(require_admin)):
    ok = DeleteBroadcastController().delete_broadcast(broadcast_id)
    return {"success": ok}


@router.get("/templates")
def get_notification_templates(current_user: dict = Depends(require_admin)):
    return {
        "success": True,
        "templates": GetNotificationTemplatesController().get_templates(),
    }


@router.put("/templates/{template_id}")
def update_notification_template(
    template_id: str,
    data: NotificationEditRequest,
    current_user: dict = Depends(require_admin),
):
    title, message = _validate_text(data.title, data.message)
    ok = UpdateNotificationTemplateController().update_template(
        template_id, title, message
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Notification template not found")
    return {"success": True, "message": "Default notification updated"}


@router.get("/admin/all")
def get_all_notifications_admin(
    q: str = None,
    current_user: dict = Depends(require_admin),
):
    notifications = GetAllNotificationsAdminController().get_notifications(search=q)
    return {
        "success": True,
        "notifications": notifications,
        "total": len(notifications),
    }


@router.put("/admin/{notification_id}")
def update_notification_admin(
    notification_id: int,
    data: NotificationEditRequest,
    current_user: dict = Depends(require_admin),
):
    title, message = _validate_text(data.title, data.message)
    ok = UpdateNotificationAdminController().update_notification(
        notification_id, title, message
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Delivered notification updated"}


@router.get("/list/{user_id}")
def get_notifications(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    notifications = GetNotificationsController().get_notifications(user_id)
    return {"success": True, "notifications": [
        {
            "notification_id": n.notification_id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "is_unread": bool(n.is_unread),
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]}


@router.post("/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: dict = Depends(get_current_user)):
    ok = MarkNotificationReadController().mark_read(notification_id, current_user["user_id"])
    return {"success": ok}


@router.post("/mark-all-read")
def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    ok = MarkAllNotificationsReadController().mark_all_read(current_user["user_id"])
    return {"success": ok}


@router.delete("/{notification_id}")
def delete_notification(notification_id: int, current_user: dict = Depends(get_current_user)):
    ok = DeleteNotificationController().delete_notification(notification_id, current_user["user_id"])
    return {"success": ok}
