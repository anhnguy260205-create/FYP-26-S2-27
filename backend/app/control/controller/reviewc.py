from app.entity.models.review import ReviewRepository


class ReviewController:

    def get_stats(self):
        stats = ReviewRepository.get_stats()
        return {"success": True, **stats}

    def list_reviews(self, user_id=None, sort="latest", page=1, page_size=10, rating_filter=None):
        result = ReviewRepository.list_reviews(
            user_id=user_id, sort=sort, page=page, page_size=page_size, rating_filter=rating_filter
        )
        return {"success": True, **result}

    def get_my_review(self, user_id):
        review = ReviewRepository.get_my_review(user_id)
        return {"success": True, "review": review}

    def create_review(self, user_id, role, rating, title, comment):
        if role == "admin":
            return {"success": False, "message": "Admin accounts cannot post platform reviews."}
        if not rating or int(rating) < 1 or int(rating) > 5:
            return {"success": False, "message": "Rating must be between 1 and 5 stars."}
        if not comment or not str(comment).strip():
            return {"success": False, "message": "Please write a comment for your review."}

        result = ReviewRepository.create_review(user_id, rating, title, comment)
        if result == "duplicate":
            return {"success": False, "message": "You've already reviewed RocketTrade — edit your existing review instead.", "duplicate": True}
        if not result:
            return {"success": False, "message": "Failed to create review."}
        return {"success": True, "review": result, "message": "Thanks for your review!"}

    def update_review(self, review_id, user_id, rating=None, title=None, comment=None):
        if rating is not None and (int(rating) < 1 or int(rating) > 5):
            return {"success": False, "message": "Rating must be between 1 and 5 stars."}
        review = ReviewRepository.update_review(review_id, user_id, rating=rating, title=title, comment=comment)
        if not review:
            return {"success": False, "message": "Review not found or you can only edit your own review."}
        return {"success": True, "review": review, "message": "Review updated."}

    def delete_review(self, review_id, user_id=None, is_admin=False):
        deleted = ReviewRepository.delete_review(review_id, user_id=user_id, is_admin=is_admin)
        if not deleted:
            return {"success": False, "message": "Review not found or you don't have permission to delete it."}
        return {"success": True, "message": "Review deleted."}

    def toggle_helpful(self, review_id, user_id):
        review = ReviewRepository.toggle_helpful(review_id, user_id)
        if not review:
            return {"success": False, "message": "Unable to update helpful vote."}
        return {"success": True, "review": review}

    def flag_review(self, review_id, user_id, reason):
        if not user_id:
            return {"success": False, "message": "Must be logged in to report a review."}
        result = ReviewRepository.flag_review(review_id, user_id, reason)
        if not result:
            return {"success": False, "message": "Review not found."}
        if result.get("unflagged"):
            return {"success": True, "unflagged": True, "message": "Report removed."}
        return {"success": True, "flagged": True, "message": "Review reported. Our moderation team will look into it."}

    def admin_flagged_reviews(self):
        reviews = ReviewRepository.admin_flagged_reviews()
        return {"success": True, "reviews": reviews, "total": len(reviews)}

    def admin_list_reviews(self):
        reviews = ReviewRepository.admin_list_reviews()
        return {"success": True, "reviews": reviews, "total": len(reviews)}

    def admin_delete_review(self, review_id, admin_user_id=None, reason="Violated community guidelines"):
        # Get review owner before deleting so we can notify them
        review = ReviewRepository.get_review_by_id(review_id)
        if not review:
            return {"success": False, "message": "Review not found."}

        deleted = ReviewRepository.delete_review(review_id, is_admin=True)
        if not deleted:
            return {"success": False, "message": "Failed to delete review."}

        # Notify the review author
        owner_id = review.get("user_id")
        if owner_id:
            try:
                from app.control.controller.notificationc import create_notification
                create_notification(
                    user_id=owner_id,
                    type="moderation",
                    title="Your review has been removed",
                    message=f"Your platform review was removed by our moderation team. Reason: {reason}. "
                            f"If you believe this was a mistake, please contact support.",
                )
            except Exception as e:
                print(f"[REVIEW] Notification failed: {e}")

        return {
            "success": True,
            "message": f"Review removed. User has been notified.",
            "review_id": review_id,
            "reason": reason,
        }
