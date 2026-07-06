from app.entity.models.forumquestion import ForumRepository


class ForumController:

    def list_posts(self, user_id=None, category=None, search=None,
                   sort="latest", page=1, page_size=50):
        result = ForumRepository.list_posts(
            user_id=user_id, category=category, search=search,
            sort=sort, page=page, page_size=page_size,
        )
        # result is already {"posts": [...], "total": ..., "page": ...}
        return {"success": True, **result}

    def get_post(self, post_id, user_id=None):
        post = ForumRepository.get_post(post_id, user_id)
        if not post:
            return {"success": False, "message": "Post not found"}
        return {"success": True, "post": post}

    def create_post(self, user_id, title, content,
                    category="Technical Analysis", tags=None, ticker_tags=None):
        post = ForumRepository.create_post(
            user_id, title, content, category, tags or [], ticker_tags or []
        )
        if not post:
            return {"success": False, "message": "Failed to create post"}
        return {"success": True, "post": post, "message": "Post created successfully"}

    def update_post(self, post_id, user_id, title=None, content=None,
                    category=None, tags=None, ticker_tags=None):
        post = ForumRepository.update_post(
            post_id, user_id, title=title, content=content,
            category=category, tags=tags, ticker_tags=ticker_tags,
        )
        if not post:
            return {"success": False, "message": "Post not found or you can only edit your own posts"}
        return {"success": True, "post": post, "message": "Post updated successfully"}

    def reply_post(self, post_id, user_id, content):
        post = ForumRepository.add_reply(post_id, user_id, content)
        if not post:
            return {"success": False, "message": "Post not found or thread is closed"}
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
