from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from app.control.controller.notificationc import (
    GetNotificationsController,
    MarkNotificationReadController,
    MarkAllNotificationsReadController,
    BroadcastNotificationController,
    GetBroadcastHistoryController,
    DeleteBroadcastController,
    DeleteNotificationController,
)
from app.control.services.auth import get_current_user, require_admin

router = APIRouter(prefix="/notification", tags=["Notification"])


class BroadcastRequest(BaseModel):
    audience: str  # "investor" | "expert" | "both"
    title: str
    message: str


@router.post("/broadcast")
def broadcast_notification(data: BroadcastRequest, current_user: dict = Depends(require_admin)):
    if data.audience not in ("investor", "expert", "both"):
        raise HTTPException(status_code=400, detail="Invalid audience")
    if not data.title.strip() or not data.message.strip():
        raise HTTPException(status_code=400, detail="Title and message are required")
    count = BroadcastNotificationController().broadcast(
        data.audience, data.title, data.message, sent_by=current_user["user_id"]
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


@router.delete("/broadcast/{broadcast_id}")
def delete_broadcast(broadcast_id: int, current_user: dict = Depends(require_admin)):
    ok = DeleteBroadcastController().delete_broadcast(broadcast_id)
    return {"success": ok}


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
