from app.entity.models.article import Article
from app.entity.models.expert import Expert


def _get_expert_id(user_id):
    """Resolve expert_id from user_id."""
    with __import__("app.entity.database.session", fromlist=["get_session"]).get_session() as s:
        exp = s.query(Expert).filter(Expert.user_id == user_id).first()
        return exp.expert_id if exp else None


def _get_expert(user_id):
    """Return the Expert row for a user_id, or None."""
    with __import__("app.entity.database.session", fromlist=["get_session"]).get_session() as s:
        return s.query(Expert).filter(Expert.user_id == user_id).first()


class ListArticlesController:
    def list(self, category=None, tag=None, limit=50):
        return Article.getAll(category=category, tag=tag, limit=limit)


class GetArticleController:
    def get(self, article_id):
        return Article.getById(article_id)


class CreateArticleController:
    def create(self, user_id, title, summary, content, category, tags=""):
        expert = _get_expert(user_id)
        if not expert:
            return {"success": False, "message": "Expert account not found"}
        if expert.verification_status != "approved":
            return {"success": False, "message": "Only verified experts can create articles", "unverified": True}
        article_id = Article.create(expert.expert_id, title, summary, content, category, tags)
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


# ── Admin controllers (no expert_id needed) ────────────────────────────────────

class AdminListArticlesController:
    def list(self, category=None):
        return Article.getAll_admin(category=category)


class AdminCreateArticleController:
    def create(self, title, summary, content, category, tags="", status="published"):
        article_id = Article.admin_create(title, summary, content, category, tags, status)
        return {"success": True, "article_id": article_id}


class AdminUpdateArticleController:
    def update(self, article_id, **kwargs):
        ok = Article.admin_update(article_id, **kwargs)
        if not ok:
            return {"success": False, "message": "Article not found"}
        return {"success": True, "message": "Article updated"}


class AdminDeleteArticleController:
    def delete(self, article_id):
        ok = Article.admin_delete(article_id)
        if not ok:
            return {"success": False, "message": "Article not found"}
        return {"success": True, "message": "Article deleted"}
