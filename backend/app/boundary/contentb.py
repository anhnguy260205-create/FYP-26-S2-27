from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.control.controller.contentc import (
    GetAllContentController,
    UpdateContentController,
    ReorderContentController,
    CreateContentController,
    DeleteContentController,
)
from app.control.services.auth import require_admin


router = APIRouter(tags=["Content"])


# Request data used when updating homepage content
class UpdateContentRequest(BaseModel):
    title: str
    description: str = ""
    image_url: Optional[str] = None
    video_url: Optional[str] = None


# Request data used when reordering a section
class ReorderSectionRequest(BaseModel):
    ordered_ids: List[str]


class CreateContentRequest(BaseModel):
    section: str
    title: str
    description: str = ""
    image_url: Optional[str] = None
    video_url: Optional[str] = None


# Public — used by the homepage and landing sections
@router.get("/content/landing")
def get_landing_content():
    items = GetAllContentController().getAll()
    return {"success": True, "content": items}


# Get content for the admin page
@router.get("/admin/content")
def get_admin_content(_: dict = Depends(require_admin)):
    items = GetAllContentController().getAll()
    return {"success": True, "content": items}


# Update homepage content as an admin
@router.put("/admin/content/{content_id}")
def update_content(
    content_id: str,
    data: UpdateContentRequest,
    _: dict = Depends(require_admin),
):
    success = UpdateContentController().update(
        content_id,
        data.title,
        data.description,
        data.image_url,
        data.video_url
    )

    if not success:
        return {"success": False, "message": "Content not found"}

    return {"success": True, "message": "Content updated"}


# Reorder content within a section
@router.put("/admin/content/section/{section}/reorder")
def reorder_section(
    section: str,
    data: ReorderSectionRequest,
    _: dict = Depends(require_admin),
):
    # Save the new order of content items in a section.
    if not data.ordered_ids:
        return {"success": False, "message": "ordered_ids is required"}

    ok = ReorderContentController().reorder_section(
        section,
        data.ordered_ids
    )

    if not ok:
        return {
            "success": False,
            "message": "Reorder failed — one or more ids don't belong to this section"
        }

    return {"success": True, "message": "Reordered"}

# Create new content for the admin
@router.post("/admin/content")
def create_content(
    data: CreateContentRequest,
    _: dict = Depends(require_admin),
):
    if not data.section.strip() or not data.title.strip():
        return {"success": False, "message": "Section and title are required"}
    item = CreateContentController().create(
        data.section, data.title, data.description, data.image_url, data.video_url
    )
    return {"success": True, "message": "Content added", "content": item}

# Delete existing content by ID for the admin
@router.delete("/admin/content/{content_id}")
def delete_content(
    content_id: str,
    _: dict = Depends(require_admin),
):
    ok = DeleteContentController().delete(content_id)
    if not ok:
        return {"success": False, "message": "Content not found"}
    return {"success": True, "message": "Content removed"}
