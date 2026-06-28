from pydantic import BaseModel
from fastapi import APIRouter, Depends
from app.control.controller.contentc import (
    GetAllContentController,
    GetContentBySectionController,
    UpdateContentController,
)
from app.control.services.auth import require_admin

router = APIRouter(tags=["Content"])


class UpdateContentRequest(BaseModel):
    title: str
    description: str


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
