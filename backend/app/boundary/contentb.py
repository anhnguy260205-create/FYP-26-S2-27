from pydantic import BaseModel
from fastapi import APIRouter
from app.control.controller.contentc import (
    GetAllContentController,
    GetContentBySectionController,
    UpdateContentController,
)

router = APIRouter(tags=["Content"])


class UpdateContentRequest(BaseModel):
    title: str
    description: str


class ContentManagementPage:
    def __init__(self):
        self.get_all_ctrl = GetAllContentController()
        self.get_section_ctrl = GetContentBySectionController()
        self.update_ctrl = UpdateContentController()

    def getAllContent(self):
        return self.get_all_ctrl.getAll()

    def getContentBySection(self, section: str):
        return self.get_section_ctrl.getBySection(section)

    def updateContent(self, content_id: str, title: str, description: str):
        return self.update_ctrl.update(content_id, title, description)


# Public — used by the homepage
@router.get("/content/landing")
def get_landing_content():
    items = ContentManagementPage().getAllContent()
    return {"success": True, "content": items}


# Admin — get all content for management page
@router.get("/admin/content")
def get_admin_content():
    items = ContentManagementPage().getAllContent()
    return {"success": True, "content": items}


# Admin — update a content item
@router.put("/admin/content/{content_id}")
def update_content(content_id: str, data: UpdateContentRequest):
    success = ContentManagementPage().updateContent(
        content_id, data.title, data.description
    )
    if not success:
        return {"success": False, "message": "Content not found"}
    return {"success": True, "message": "Content updated successfully"}
