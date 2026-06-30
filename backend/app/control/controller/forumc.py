from app.entity.models.forumquestion import ForumRepository, FORUM_CATEGORIES


class ForumController:

    def list_posts(self, user_id=None, category=None, search=None,
                   sort="latest", ticker=None, page=1, page_size=20):
        result = ForumRepository.list_posts(
            user_id=user_id, category=category, search=search,
            sort=sort, ticker=ticker, page=page, page_size=page_size,
        )
        return {"success": True, **result}

    def get_post(self, post_id, user_id=None):
        post = ForumRepository.get_post(post_id, user_id)
        if not post:
            return {"success": False, "message": "Post not found"}
        return {"success": True, "post": post}

    def create_post(self, user_id, title, content, category=None,
                    tags=None, ticker_tags=None):
        post = ForumRepository.create_post(
            user_id, title, content, category, tags or [], ticker_tags or []
        )
        return {"success": True, "post": post, "message": "Post created successfully"}

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

    def toggle_reply_like(self, reply_id, user_id):
        post = ForumRepository.toggle_reply_like(reply_id, user_id)
        if not post:
            return {"success": False, "message": "Unable to toggle reply like"}
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

    def get_saved_posts(self, user_id):
        posts = ForumRepository.get_saved_posts(user_id)
        return {"success": True, "posts": posts}

    def get_trending_posts(self, limit=5):
        posts = ForumRepository.get_trending_posts(limit)
        return {"success": True, "posts": posts}

    def get_posts_by_ticker(self, ticker, user_id=None, limit=10):
        posts = ForumRepository.get_posts_by_ticker(ticker, user_id, limit)
        return {"success": True, "posts": posts, "ticker": ticker.upper()}

    def get_forum_stats(self):
        stats = ForumRepository.get_forum_stats()
        return {"success": True, "stats": stats}

    def get_categories(self):
        stats = ForumRepository.get_category_stats()
        return {
            "success": True,
            "categories": FORUM_CATEGORIES,
            "counts": stats,
        }

    def pin_post(self, post_id, pin=True):
        post = ForumRepository.pin_post(post_id, pin)
        if not post:
            return {"success": False, "message": "Post not found"}
        return {"success": True, "post": post, "message": f"Post {'pinned' if pin else 'unpinned'} successfully"}

    def feature_post(self, post_id, feature=True):
        post = ForumRepository.feature_post(post_id, feature)
        if not post:
            return {"success": False, "message": "Post not found"}
        return {"success": True, "post": post, "message": f"Post {'featured' if feature else 'unfeatured'} successfully"}

    def close_post(self, post_id, close=True):
        post = ForumRepository.close_post(post_id, close)
        if not post:
            return {"success": False, "message": "Post not found"}
        return {"success": True, "post": post, "message": f"Thread {'closed' if close else 'reopened'} successfully"}
