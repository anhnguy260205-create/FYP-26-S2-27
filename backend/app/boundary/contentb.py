from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from app.control.controller.contentc import (
    GetAllContentController,
    UpdateContentController,
    ReorderContentController,
)
from app.control.services.auth import require_admin

router = APIRouter(tags=["Content"])


class UpdateContentRequest(BaseModel):
    title: str
    description: str


class ReorderSectionRequest(BaseModel):
    ordered_ids: List[str]


# Public — used by the homepage and landing sections
@router.get("/content/landing")
def get_landing_content():
    items = GetAllContentController().getAll()
    return {"success": True, "content": items}


# Admin only
@router.get("/admin/content")
def get_admin_content(_: dict = Depends(require_admin)):
    items = GetAllContentController().getAll()
    return {"success": True, "content": items}


@router.put("/admin/content/{content_id}")
def update_content(
    content_id: str,
    data: UpdateContentRequest,
    _: dict = Depends(require_admin),
):
    success = UpdateContentController().update(content_id, data.title, data.description)
    if not success:
        return {"success": False, "message": "Content not found"}
    return {"success": True, "message": "Content updated"}


@router.put("/admin/content/section/{section}/reorder")
def reorder_section(
    section: str,
    data: ReorderSectionRequest,
    _: dict = Depends(require_admin),
):
    """Persists a full drag-and-drop reorder in one call — the frontend sends
    the whole new id order for the section after the user drops an item."""
    if not data.ordered_ids:
        return {"success": False, "message": "ordered_ids is required"}
    ok = ReorderContentController().reorder_section(section, data.ordered_ids)
    if not ok:
        return {"success": False, "message": "Reorder failed — one or more ids don't belong to this section"}
    return {"success": True, "message": "Reordered"}
