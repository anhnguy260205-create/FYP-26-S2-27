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

    subject = f"DeskStock Price Alert: {stock_symbol} reached your target"

    custom_block = ""
    if custom_message:
        custom_block = f"""
        <tr>
          <td style="padding: 0 32px 20px;">
            <div style="background:#1e2d5a;border-left:3px solid #0092b8;border-radius:6px;padding:14px 16px;
                        font-size:14px;color:#94a3b8;font-style:italic;">
              {custom_message}
            </div>
          </td>
        </tr>
        """

    html = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b1124;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b1124;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#0f1b3d;border-radius:16px;overflow:hidden;
                      border:1px solid rgba(255,255,255,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0092b8,#155dfc);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">
                DeskStock Alert
              </h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">
                Your price condition has been triggered
              </p>
            </td>
          </tr>

          <!-- Symbol badge -->
          <tr>
            <td style="padding:28px 32px 12px;">
              <span style="display:inline-block;background:rgba(96,165,250,0.15);color:#60a5fa;
                           font-size:13px;font-weight:700;letter-spacing:0.08em;
                           padding:5px 14px;border-radius:8px;">
                {stock_symbol}
              </span>
            </td>
          </tr>

          <!-- Condition row -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#162040;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;
                               letter-spacing:0.08em;">Condition</p>
                    <p style="margin:6px 0 0;font-size:16px;font-weight:600;color:#e2e8f0;">
                      {condition}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;
                               letter-spacing:0.08em;">Current Price</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#34d399;">
                      ${current_price:.2f}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {custom_block}

          <!-- Footer note -->
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                This alert has been deactivated. Log in to DeskStock to create a new alert.
              </p>
            </td>
          </tr>

          <!-- Footer bar -->
          <tr>
            <td style="background:#0b1635;padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:#334155;">
                © 2025 DeskStock · You received this because you set up a price alert.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    """.strip()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"DeskStock Alerts <{GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"[ALERT] Email sent to {to_email} for {stock_symbol}")
        return True
    except Exception as e:
        print(f"[ALERT] Failed to send email: {e}")
        return False
