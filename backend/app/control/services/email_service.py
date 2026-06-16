import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / ".env")

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")


def send_alert_email(to_email: str, stock_symbol: str, current_price: float,
                     condition: str, custom_message: str = None):
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        print("Email credentials not set — skipping alert email")
        return

    subject = f"Stock Alert Triggered: {stock_symbol}"

    body_lines = [
        f"Your price alert for <b>{stock_symbol}</b> has been triggered.",
        f"<br><br><b>Condition:</b> {condition}",
        f"<br><b>Current Price:</b> ${current_price:.2f}",
    ]
    if custom_message:
        body_lines.append(f"<br><br><i>{custom_message}</i>")

    body = "".join(body_lines)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"Alert email sent to {to_email} for {stock_symbol}")
    except Exception as e:
        print(f"Failed to send alert email: {e}")
