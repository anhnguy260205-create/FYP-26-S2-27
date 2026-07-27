from sqlalchemy import or_

from app.entity.models.notification import Notification, NotificationBroadcast
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount
from app.entity.models.contentmanagement import ContentManagement
from app.entity.database.session import get_session


DEFAULT_NOTIFICATION_TEMPLATES = [
    {
        "content_id": "notification_welcome_investor",
        "section": "notification_template",
        "title": "Welcome to RocketTrade!",
        "description": (
            "👋 Welcome to RocketTrade! Explore the latest market trends, "
            "manage your portfolio, and discover new investment opportunities "
            "with AI-powered insights."
        ),
        "order_index": 0,
        "template_type": "welcome",
        "audience": "investor",
        "label": "New investor welcome",
    },
    {
        "content_id": "notification_welcome_expert",
        "section": "notification_template",
        "title": "Welcome to RocketTrade!",
        "description": (
            "👋 Welcome to RocketTrade! Share your market expertise, connect "
            "with investors, and help the community make informed investment decisions."
        ),
        "order_index": 1,
        "template_type": "welcome",
        "audience": "expert",
        "label": "New expert welcome",
    },
]

_TEMPLATE_META = {item["content_id"]: item for item in DEFAULT_NOTIFICATION_TEMPLATES}


def _ensure_notification_templates(session):
    """Create any missing editable notification templates.

    The content is stored in content_management so admin edits persist in the
    database and future welcome notifications use the latest saved wording.
    """
    template_ids = list(_TEMPLATE_META)
    existing = {
        row.content_id: row
        for row in session.query(ContentManagement).filter(
            ContentManagement.content_id.in_(template_ids)
        ).all()
    }
    for template_id, defaults in _TEMPLATE_META.items():
        if template_id not in existing:
            row = ContentManagement(
                content_id=template_id,
                section=defaults["section"],
                title=defaults["title"],
                description=defaults["description"],
                order_index=defaults["order_index"],
            )
            session.add(row)
            existing[template_id] = row
    session.flush()
    return existing


def get_welcome_notification(role: str) -> tuple[str, str]:
    """Return the admin-editable welcome notification for a user role."""
    role_key = "expert" if str(role).lower() == "expert" else "investor"
    template_id = f"notification_welcome_{role_key}"
    with get_session() as session:
        templates = _ensure_notification_templates(session)
        row = templates[template_id]
        return row.title, row.description or ""


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


class UpdateBroadcastController:
    def update_broadcast(self, broadcast_id: int, title: str, message: str):
        """Update the broadcast log and every delivered copy in one transaction."""
        with get_session() as session:
            log = session.query(NotificationBroadcast).filter_by(
                broadcast_id=broadcast_id
            ).first()
            if not log:
                return False
            log.title = title
            log.message = message
            session.query(Notification).filter_by(broadcast_id=broadcast_id).update({
                "title": title,
                "message": message,
            }, synchronize_session=False)
            return True


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


class GetAllNotificationsAdminController:
    def get_notifications(self, search: str = None):
        """Return delivered notifications across every user for admin review."""
        with get_session() as session:
            query = session.query(Notification, UserAccount).outerjoin(
                UserAccount, Notification.user_id == UserAccount.user_id
            )
            if search:
                like = f"%{search.strip()}%"
                query = query.filter(or_(
                    Notification.title.like(like),
                    Notification.message.like(like),
                    Notification.type.like(like),
                    UserAccount.username.like(like),
                    UserAccount.full_name.like(like),
                    UserAccount.email_address.like(like),
                ))
            rows = query.order_by(Notification.created_at.desc()).all()
            return [
                {
                    "notification_id": notification.notification_id,
                    "user_id": notification.user_id,
                    "recipient_name": (
                        (user.full_name or user.username) if user else notification.user_id
                    ),
                    "recipient_email": user.email_address if user else None,
                    "type": notification.type,
                    "title": notification.title,
                    "message": notification.message,
                    "is_unread": bool(notification.is_unread),
                    "broadcast_id": notification.broadcast_id,
                    "created_at": notification.created_at.isoformat() if notification.created_at else None,
                }
                for notification, user in rows
            ]


class UpdateNotificationAdminController:
    def update_notification(self, notification_id: int, title: str, message: str):
        with get_session() as session:
            notification = session.query(Notification).filter_by(
                notification_id=notification_id
            ).first()
            if not notification:
                return False
            notification.title = title
            notification.message = message
            return True


class GetNotificationTemplatesController:
    def get_templates(self):
        with get_session() as session:
            templates = _ensure_notification_templates(session)
            result = []
            for template_id, defaults in sorted(
                _TEMPLATE_META.items(), key=lambda item: item[1]["order_index"]
            ):
                row = templates[template_id]
                result.append({
                    "template_id": template_id,
                    "label": defaults["label"],
                    "template_type": defaults["template_type"],
                    "audience": defaults["audience"],
                    "title": row.title,
                    "message": row.description or "",
                })
            return result


class UpdateNotificationTemplateController:
    def update_template(self, template_id: str, title: str, message: str):
        with get_session() as session:
            templates = _ensure_notification_templates(session)
            row = templates.get(template_id)
            if not row:
                return False
            row.title = title
            row.description = message
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
