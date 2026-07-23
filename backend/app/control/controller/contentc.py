from app.entity.models.contentmanagement import ContentManagement


class GetAllContentController:
    def getAll(self):
        return ContentManagement.get_all()


class UpdateContentController:
    def update(self, content_id: str, title: str, description: str):
        return ContentManagement.update(content_id, title, description)


class ReorderContentController:
    def reorder_section(self, section: str, ordered_ids: list):
        return ContentManagement.reorder_section(section, ordered_ids)
