from app.entity.models.article import Article
from app.entity.models.expert import Expert


def _get_expert_id(user_id):
    """Resolve expert_id from user_id."""
    with __import__("app.entity.database.session", fromlist=["get_session"]).get_session() as s:
        exp = s.query(Expert).filter(Expert.user_id == user_id).first()
        return exp.expert_id if exp else None


class ListArticlesController:
    def list(self, category=None, tag=None, limit=50):
        return Article.getAll(category=category, tag=tag, limit=limit)


class GetArticleController:
    def get(self, article_id):
        return Article.getById(article_id)


class CreateArticleController:
    def create(self, user_id, title, summary, content, category, tags=""):
        expert_id = _get_expert_id(user_id)
        if not expert_id:
            return {"success": False, "message": "Expert account not found"}
        article_id = Article.create(expert_id, title, summary, content, category, tags)
        return {"success": True, "article_id": article_id}


class UpdateArticleController:
    def update(self, user_id, article_id, **kwargs):
        expert_id = _get_expert_id(user_id)
        if not expert_id:
            return {"success": False, "message": "Expert account not found"}
        ok = Article.update(article_id, expert_id, **kwargs)
        if not ok:
            return {"success": False, "message": "Article not found or not yours"}
        return {"success": True, "message": "Article updated"}


class DeleteArticleController:
    def delete(self, user_id, article_id):
        expert_id = _get_expert_id(user_id)
        if not expert_id:
            return {"success": False, "message": "Expert account not found"}
        ok = Article.delete(article_id, expert_id)
        if not ok:
            return {"success": False, "message": "Article not found or not yours"}
        return {"success": True, "message": "Article deleted"}


class ExpertArticlesController:
    def list(self, user_id):
        expert_id = _get_expert_id(user_id)
        if not expert_id:
            return []
        return Article.getByExpert(expert_id)
