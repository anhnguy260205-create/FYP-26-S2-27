
from app.entity.models.forumquestion import ForumRepository


class ForumController:
    def list_posts(self, user_id=None, symbol=None):
        return {"success": True, "posts": ForumRepository.list_posts(user_id, symbol)}

    def get_post(self, post_id, user_id=None):
        post = ForumRepository.get_post(post_id, user_id)
        if not post:
            return {"success": False, "message": "Post not found"}
        return {"success": True, "post": post}

    def create_post(self, user_id, title, content, category="General", tags=None, symbol=None):
        post = ForumRepository.create_post(user_id, title, content, category, tags or [], symbol)
        return {"success": True, "post": post, "message": "Post created successfully"}

    def reply_post(self, post_id, user_id, content):
        post = ForumRepository.add_reply(post_id, user_id, content)
        if not post:
            return {"success": False, "message": "Post not found"}
        return {"success": True, "post": post, "message": "Reply posted successfully"}

    def toggle_like(self, post_id, user_id):
        post = ForumRepository.toggle_like(post_id, user_id)
        if not post:
            return {"success": False, "message": "Unable to toggle like"}
        return {"success": True, "post": post}

    def toggle_save(self, post_id, user_id):
        post = ForumRepository.toggle_save(post_id, user_id)
        if not post:
            return {"success": False, "message": "Unable to toggle save"}
        return {"success": True, "post": post}

    def delete_post(self, post_id, user_id=None):
        deleted = ForumRepository.delete_post(post_id, user_id)
        if not deleted:
            return {"success": False, "message": "Post not found"}
        return {"success": True, "message": "Post deleted successfully", "post_id": post_id}

    def update_reply(self, post_id, reply_id, user_id=None, content=""):
        post = ForumRepository.update_reply(post_id, reply_id, user_id, content)
        if not post:
            return {"success": False, "message": "Reply not found or you can only edit your own comment"}
        return {"success": True, "post": post, "message": "Comment updated successfully"}

    def delete_reply(self, post_id, reply_id, user_id=None):
        post = ForumRepository.delete_reply(post_id, reply_id, user_id)
        if not post:
            return {"success": False, "message": "Reply not found or you can only delete your own comment"}
        return {"success": True, "post": post, "message": "Comment deleted successfully"}
