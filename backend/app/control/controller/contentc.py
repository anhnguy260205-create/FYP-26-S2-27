from app.entity.models.contentmanagement import ContentManagement


class GetAllContentController:
    def getAll(self):
        return ContentManagement.get_all()


class GetContentBySectionController:
    def getBySection(self, section: str):
        return ContentManagement.get_by_section(section)


class UpdateContentController:
    def update(self, content_id: str, title: str, description: str):
        return ContentManagement.update(content_id, title, description)


class ReorderContentController:
    def move(self, content_id: str, direction: str):
        return ContentManagement.move(content_id, direction)
