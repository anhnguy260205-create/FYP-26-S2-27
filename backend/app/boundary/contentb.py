from pydantic import BaseModel
from fastapi import APIRouter
from app.entity.models.landingcontent import LandingContent

router = APIRouter(tags=["Content"])


class UpdateContentRequest(BaseModel):
    title: str
    description: str


# Public — used by the homepage
@router.get("/content/landing")
def get_landing_content():
    items = LandingContent.get_all()
    return {"success": True, "content": items}


# Admin — get all content for management page
@router.get("/admin/content")
def get_admin_content():
    items = LandingContent.get_all()
    return {"success": True, "content": items}


# Admin — update a content item
@router.put("/admin/content/{content_id}")
def update_content(content_id: str, data: UpdateContentRequest):
    success = LandingContent.update(content_id, data.title, data.description)
    if not success:
        return {"success": False, "message": "Content not found"}
    return {"success": True, "message": "Content updated successfully"}
