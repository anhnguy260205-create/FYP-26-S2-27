from sqlalchemy.exc import IntegrityError
from app.entity.models.emailalert import StockAlert
from app.entity.database.session import get_session
from app.control.services.email_service import send_alert_email
from app.control.controller.notificationc import create_notification


class CreateAlertController:
    def create_alert(self, user_id, stock_symbol, price_above, price_below,
                     increase_percent, decrease_percent, custom_message, notification_email):
        already_exists_msg = (
            f"You already have an alert set for {stock_symbol} — "
            "delete it before creating a new one."
        )
        with get_session() as session:
            existing = session.query(StockAlert).filter_by(
                user_id=user_id, stock_symbol=stock_symbol
            ).first()
            if existing:
                return {"success": False, "message": already_exists_msg}

            alert = StockAlert(
                user_id=user_id,
                stock_symbol=stock_symbol,
                price_above=price_above,
                price_below=price_below,
                increase_percent=increase_percent,
                decrease_percent=decrease_percent,
                custom_message=custom_message,
                notification_email=notification_email,
            )
            session.add(alert)
            try:
                session.flush()
            except IntegrityError:
                # If the user already has an alert for this stock, rollback the session and return an err...
                session.rollback()
                return {"success": False, "message": already_exists_msg}
            return {"success": True, "alert_id": alert.alert_id}


class GetAlertsController:
    def get_alerts(self, user_id):
        with get_session() as session:
            return session.query(StockAlert).filter_by(
                user_id=user_id, is_active=True
            ).all()


class DeleteAlertController:
    def delete_alert(self, alert_id, user_id):
        with get_session() as session:
            alert = session.query(StockAlert).filter_by(
                alert_id=alert_id, user_id=user_id
            ).first()
            if not alert:
                return False
            session.delete(alert)
            return True


class CheckAndTriggerAlertsController:

    @staticmethod
    def get_active_alert_symbols() -> set:
        # # Get a set of all stock symbols that have active, untriggered alerts.
        with get_session() as session:
            rows = session.query(StockAlert.stock_symbol).filter_by(
                is_active=True, is_triggered=False
            ).distinct().all()
            return {r[0] for r in rows}

    def check(self, symbol: str, current_price: float, previous_close: float | None):
        with get_session() as session:
            alerts = session.query(StockAlert).filter_by(
                stock_symbol=symbol, is_active=True, is_triggered=False
            ).all()

            for alert in alerts:
                condition = None

                if alert.price_above and current_price >= float(alert.price_above):
                    condition = f"Price rose above ${float(alert.price_above):.2f}"

                elif alert.price_below and current_price <= float(alert.price_below):
                    condition = f"Price fell below ${float(alert.price_below):.2f}"

                elif alert.increase_percent and previous_close:
                    pct = ((current_price - previous_close) / previous_close) * 100
                    if pct >= float(alert.increase_percent):
                        condition = f"Price increased {pct:.2f}% (threshold: {float(alert.increase_percent):.2f}%)"

                elif alert.decrease_percent and previous_close:
                    pct = ((previous_close - current_price) / previous_close) * 100
                    if pct >= float(alert.decrease_percent):
                        condition = f"Price decreased {pct:.2f}% (threshold: {float(alert.decrease_percent):.2f}%)"

                if not condition:
                    continue

                # Claim the alert to prevent other processes from sending duplicate emails.
                claimed = session.query(StockAlert).filter_by(
                    alert_id=alert.alert_id, is_triggered=False
                ).update({"is_triggered": True}, synchronize_session=False)
                session.commit()
                if not claimed:
                    continue

                sent = send_alert_email(
                    to_email=alert.notification_email,
                    stock_symbol=symbol,
                    current_price=current_price,
                    condition=condition,
                    custom_message=alert.custom_message,
                )
                if sent:
                   # Remove the alert from the database after sending the email, and create a notification f...
                    session.query(StockAlert).filter_by(
                        alert_id=alert.alert_id
                    ).delete(synchronize_session=False)
                    session.commit()
                    create_notification(
                        alert.user_id,
                        "stock",
                        f"{symbol} triggered your price alert",
                        condition,
                    )
                else:
                    # Send failed — release the claim so it can retry on a later tick.
                    session.query(StockAlert).filter_by(
                        alert_id=alert.alert_id
                    ).update({"is_triggered": False}, synchronize_session=False)
                    session.commit()
