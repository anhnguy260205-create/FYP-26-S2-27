from app.entity.models.notification import Notification, NotificationBroadcast
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.database.session import get_session


def create_notification(user_id: str, type: str, title: str, message: str):
    """Insert a notification row. Call this from wherever a real user-facing
    event happens (alert triggered, forum reply received, subscription renewed, ...).
    Works for both investor and expert user_ids."""
    if not user_id:
        return None
    with get_session() as session:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
        )
        session.add(notif)
        session.flush()
        return notif.notification_id


class GetNotificationsController:
    def get_notifications(self, user_id):
        with get_session() as session:
            return session.query(Notification).filter_by(
                user_id=user_id
            ).order_by(Notification.created_at.desc()).all()


class MarkNotificationReadController:
    def mark_read(self, notification_id, user_id):
        with get_session() as session:
            notif = session.query(Notification).filter_by(
                notification_id=notification_id, user_id=user_id
            ).first()
            if not notif:
                return False
            notif.is_unread = False
            return True


class MarkAllNotificationsReadController:
    def mark_all_read(self, user_id):
        with get_session() as session:
            session.query(Notification).filter_by(
                user_id=user_id, is_unread=True
            ).update({"is_unread": False})
            return True


class BroadcastNotificationController:
    def broadcast(self, audience: str, title: str, message: str, sent_by: str = None):
        with get_session() as session:
            user_ids = set()
            if audience in ("investor", "both"):
                user_ids.update(uid for (uid,) in session.query(Investor.user_id).all() if uid)
            if audience in ("expert", "both"):
                user_ids.update(uid for (uid,) in session.query(Expert.user_id).all() if uid)

            log = NotificationBroadcast(
                sent_by=sent_by,
                audience=audience,
                title=title,
                message=message,
                recipient_count=len(user_ids),
            )
            session.add(log)
            session.flush()

            for uid in user_ids:
                session.add(Notification(
                    user_id=uid,
                    type="announcement",
                    title=title,
                    message=message,
                    broadcast_id=log.broadcast_id,
                ))
            return len(user_ids)


class GetBroadcastHistoryController:
    def get_history(self, search: str = None):
        with get_session() as session:
            query = session.query(NotificationBroadcast)
            if search:
                like = f"%{search}%"
                query = query.filter(
                    (NotificationBroadcast.title.like(like)) |
                    (NotificationBroadcast.message.like(like))
                )
            return query.order_by(NotificationBroadcast.created_at.desc()).all()


class DeleteBroadcastController:
    def delete_broadcast(self, broadcast_id: int):
        with get_session() as session:
            log = session.query(NotificationBroadcast).filter_by(
                broadcast_id=broadcast_id
            ).first()
            if not log:
                return False
            session.query(Notification).filter_by(broadcast_id=broadcast_id).delete()
            session.delete(log)
            return True


class DeleteNotificationController:
    def delete_notification(self, notification_id, user_id):
        with get_session() as session:
            notif = session.query(Notification).filter_by(
                notification_id=notification_id, user_id=user_id
            ).first()
            if not notif:
                return False
            session.delete(notif)
            return True
