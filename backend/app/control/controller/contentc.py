from app.entity.models.contentmanagement import ContentManagement


class GetAllContentController:
    def getAll(self):
        return ContentManagement.get_all()


class GetContentBySectionController:
    def getBySection(self, section: str):
        return ContentManagement.get_by_section(section)


class UpdateContentController:
    def update(self, content_id: str, title: str, description: str, image_url: str | None = None):
        return ContentManagement.update(content_id, title, description, image_url)


class ReorderContentController:
    def reorder_section(self, section: str, ordered_ids: list):
        return ContentManagement.reorder_section(section, ordered_ids)
