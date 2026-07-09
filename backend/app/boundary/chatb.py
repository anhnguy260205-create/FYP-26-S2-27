"""
Direct-messaging boundary.

REST (authenticated via get_current_user) performs all actions; the
websocket at /chat/ws is push-only — it delivers new messages instantly to
online users. Offline users get history from MySQL on next load.
"""
import asyncio
from typing import Dict, Set

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.control.services.auth import get_current_user
from app.entity.models.chat import ChatController

router = APIRouter(prefix="/chat", tags=["Chat"])


# ── Online-user registry (user_id -> live websockets) ───────────────────────

_online: Dict[str, Set[WebSocket]] = {}
_online_lock = asyncio.Lock()


async def _push_to_user(user_id: str, payload: dict) -> None:
    async with _online_lock:
        sockets = list(_online.get(user_id, ()))
    for ws in sockets:
        try:
            await ws.send_json(payload)
        except Exception:
            pass  # dead socket; cleaned up on disconnect


@router.websocket("/ws")
async def chat_ws(websocket: WebSocket, user_id: str):
    """Push channel. Connect as /chat/ws?user_id=<id>."""
    await websocket.accept()
    async with _online_lock:
        _online.setdefault(user_id, set()).add(websocket)
    try:
        while True:
            # We don't act on client frames (REST does the work);
            # reading keeps the connection alive and detects disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        async with _online_lock:
            _online.get(user_id, set()).discard(websocket)
            if not _online.get(user_id):
                _online.pop(user_id, None)


# ── REST ─────────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    recipient_id: str
    content: str


@router.post("/send")
async def send_message(data: SendMessageRequest,
                       current_user: dict = Depends(get_current_user)):
    result = await asyncio.to_thread(
        ChatController.send_message,
        current_user["user_id"], data.recipient_id, data.content,
    )
    if result.get("success"):
        payload = {"type": "message", "data": result["data"]}
        await _push_to_user(data.recipient_id, payload)      # recipient, live
        await _push_to_user(current_user["user_id"], payload)  # my other tabs
    return result


@router.get("/conversations")
async def list_conversations(current_user: dict = Depends(get_current_user)):
    convs = await asyncio.to_thread(
        ChatController.list_conversations, current_user["user_id"])
    return {"success": True, "conversations": convs}


@router.get("/messages/{conv_id}")
async def get_messages(conv_id: str,
                       current_user: dict = Depends(get_current_user)):
    msgs = await asyncio.to_thread(
        ChatController.get_messages, conv_id, current_user["user_id"])
    if msgs is None:
        return {"success": False, "message": "Conversation not found"}
    return {"success": True, "messages": msgs}


@router.get("/unread-count")
async def unread_count(current_user: dict = Depends(get_current_user)):
    count = await asyncio.to_thread(
        ChatController.unread_total, current_user["user_id"])
    return {"success": True, "unread": count}


@router.get("/users/search")
async def search_users(q: str = "",
                       current_user: dict = Depends(get_current_user)):
    users = await asyncio.to_thread(
        ChatController.search_users, q, current_user["user_id"])
    return {"success": True, "users": users}
