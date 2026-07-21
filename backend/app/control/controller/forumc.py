from app.entity.models.forumquestion import ForumRepository
from app.control.controller.notificationc import create_notification


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
        author_id = post.get("user_id")
        if author_id and author_id != user_id:
            replies = post.get("replies") or []
            replier_name = replies[-1].get("author_name") if replies else "Someone"
            create_notification(
                author_id,
                "consultation",
                f"New reply on \"{post.get('title')}\"",
                f"{replier_name or 'Someone'} replied to your post.",
            )
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

    def delete_post(self, post_id, user_id=None, is_admin=False):
        deleted = ForumRepository.delete_post(post_id, user_id, is_admin=is_admin)
        if not deleted:
            return {"success": False, "message": "Post not found or you can only delete your own posts"}
        return {"success": True, "message": "Post deleted successfully", "post_id": post_id}

    def update_reply(self, post_id, reply_id, user_id=None, content=""):
        post = ForumRepository.update_reply(post_id, reply_id, user_id, content)
        if not post:
            return {"success": False, "message": "Reply not found or you can only edit your own comment"}
        return {"success": True, "post": post, "message": "Comment updated successfully"}

    def delete_reply(self, post_id, reply_id, user_id=None, is_admin=False):
        post = ForumRepository.delete_reply(post_id, reply_id, user_id, is_admin=is_admin)
        if not post:
            return {"success": False, "message": "Reply not found or you can only delete your own comment"}
        return {"success": True, "post": post, "message": "Comment deleted successfully"}

    # ── Flagging ─────────────────────────────────────────────────────────────

    def flag_post(self, post_id, user_id, reason):
        if not user_id:
            return {"success": False, "message": "Must be logged in to report a post."}
        post = ForumRepository.get_post(post_id, user_id)
        if not post:
            return {"success": False, "message": "Post not found."}
        if str(post.get("user_id")) == str(user_id):
            return {"success": False, "message": "You can't report your own post."}
        result = ForumRepository.flag_post(post_id, user_id, reason)
        if not result:
            return {"success": False, "message": "Post not found."}
        if result.get("unflagged"):
            return {"success": True, "unflagged": True, "message": "Report removed."}
        return {"success": True, "flagged": True, "message": "Post reported. Our moderation team will look into it."}

    def get_removal_notice(self, user_id):
        notice = ForumRepository.get_unacknowledged_removal(user_id)
        return {"success": True, "notice": notice}

    def acknowledge_removal(self, removal_id, user_id):
        ok = ForumRepository.acknowledge_removal(removal_id, user_id)
        return {"success": ok}

    # ── Admin moderation ────────────────────────────────────────────────────

    def admin_list_posts(self):
        posts = ForumRepository.admin_list_posts()
        return {"success": True, "posts": posts, "total": len(posts)}

    def admin_flagged_posts(self):
        posts = ForumRepository.admin_flagged_posts()
        return {"success": True, "posts": posts, "total": len(posts)}

    def admin_delete_post(self, post_id, admin_user_id=None, reason="Violated community guidelines"):
        # Get post owner + title before deleting so we can notify them and log a removal record
        owner_info = ForumRepository.get_post_owner_info(post_id)
        if not owner_info:
            return {"success": False, "message": "Post not found."}

        owner_id = owner_info.get("user_id")
        post_title = owner_info.get("title") or ""

        deleted = ForumRepository.delete_post(post_id, is_admin=True)
        if not deleted:
            return {"success": False, "message": "Failed to delete post."}

        # Log a removal record so the author can see why their post was taken down
        # even after it's gone from the forum
        if owner_id:
            try:
                ForumRepository.create_removal_record(owner_id, post_title, reason)
            except Exception as e:
                print(f"[FORUM POST DELETE] Removal record FAILED: {e}")

            try:
                create_notification(
                    user_id=owner_id,
                    type="moderation",
                    title="Your post has been removed",
                    message=f"Your community post was removed by our moderation team. Reason: {reason}. "
                            f"If you believe this was a mistake, please contact support.",
                )
            except Exception as e:
                print(f"[FORUM POST DELETE] Notification FAILED: {e}")

        return {
            "success": True,
            "message": "Post removed. User has been notified.",
            "post_id": post_id,
            "reason": reason,
        }
