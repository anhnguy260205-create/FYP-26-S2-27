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

# ── shared SMTP helper (Gmail) ─────────────────────────────────────────────────

GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 587


def _send(msg: MIMEMultipart, to_email: str, label: str = "email"):
    """Send via Gmail's SMTP server, authenticated with a Gmail App Password.

    GMAIL_USER must be a real Gmail address, and GMAIL_APP_PASSWORD must be a
    16-character App Password generated from the Google Account's Security
    settings (this requires 2-Step Verification to be turned on). A normal
    Gmail login password will NOT work here.
    """
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        print(f"[EMAIL] Credentials not set — skipping {label}")
        return False
    try:
        with smtplib.SMTP(GMAIL_SMTP_HOST, GMAIL_SMTP_PORT) as server:
            server.starttls()
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"[EMAIL] {label} sent to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"[EMAIL] Gmail auth failed for {label}: {e}. "
              f"Check that GMAIL_APP_PASSWORD is a 16-char App Password, not your normal Gmail password.")
        return False
    except Exception as e:
        print(f"[EMAIL] Failed to send {label}: {e}")
        return False


# ── Password reset OTP ────────────────────────────────────────────────────────

def send_password_reset_email(to_email: str, otp_code: str):
    subject = "Deskstock Password Reset Code"
    body = (
        f"<p>We received a request to reset your Deskstock account password.</p>"
        f"<p>Your verification code is:</p>"
        f"<h2 style='letter-spacing:4px;font-family:monospace;'>{otp_code}</h2>"
        f"<p>This code will expire in <b>10 minutes</b>. "
        f"If you did not request this, you can safely ignore this email.</p>"
    )
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(body, "html"))
    _send(msg, to_email, label="password reset OTP")


# ── Password changed confirmation ────────────────────────────────────────────

def send_password_changed_email(to_email: str):
    subject = "Your DeskStock Password Was Changed"
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
          <tr>
            <td style="background:linear-gradient(135deg,#0092b8,#155dfc);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Password Changed</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Your DeskStock account password was updated</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0;font-size:15px;color:#e2e8f0;line-height:1.6;">
                Your password has been successfully changed. You can now log in with your new password.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;">
              <div style="background:#1e2d5a;border-left:3px solid #f59e0b;border-radius:6px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#fbbf24;font-weight:600;">Security Notice</p>
                <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                  If you did not make this change, your account may be compromised. Please contact us immediately or reset your password again.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1635;padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:#334155;">© 2025 DeskStock · You received this because your password was changed.</p>
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
    msg["From"] = f"DeskStock <{GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))
    return _send(msg, to_email, label="password changed confirmation")


# ── Welcome email ─────────────────────────────────────────────────────────────

def send_welcome_email(to_email: str, username: str, role: str):
    role_label = role.capitalize()
    subject = f"Welcome to DeskStock, {username}!"
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
          <tr>
            <td style="background:linear-gradient(135deg,#0092b8,#155dfc);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Welcome to DeskStock</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Your account has been created successfully</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0;font-size:16px;color:#e2e8f0;">Hi <b>{username}</b>,</p>
              <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
                Your <b style="color:#60a5fa;">{role_label}</b> account has been registered on DeskStock.
                You can now log in and start exploring the platform.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#162040;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Account Type</p>
                    <p style="margin:6px 0 0;font-size:18px;font-weight:600;color:#34d399;">{role_label}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                If you did not create this account, please contact us immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1635;padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:#334155;">© 2025 DeskStock · You received this because you registered an account.</p>
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
    msg["From"] = f"DeskStock <{GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))
    return _send(msg, to_email, label=f"welcome email for {username}")


def send_subscription_email(to_email: str, username: str, plan_type: str):
    plan_label = plan_type.capitalize()
    plan_color = "#f59e0b" if plan_type == "premium" else "#34d399"
    plan_desc = (
        "You now have access to all premium features including AI predictions, expert portfolios, and advanced analytics."
        if plan_type == "premium"
        else "You now have access to DeskStock's core features including paper trading and stock watchlists."
    )
    subject = f"DeskStock {plan_label} Subscription Activated"
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
          <tr>
            <td style="background:linear-gradient(135deg,#0092b8,#155dfc);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Subscription Activated</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Your DeskStock plan is now active</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0;font-size:16px;color:#e2e8f0;">Hi <b>{username}</b>,</p>
              <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">{plan_desc}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#162040;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Active Plan</p>
                    <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:{plan_color};">{plan_label}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                If you did not make this change, please contact us immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1635;padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:#334155;">© 2025 DeskStock · You received this because your subscription was updated.</p>
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
    msg["From"] = f"DeskStock <{GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))
    return _send(msg, to_email, label=f"{plan_label} subscription email for {username}")


# ── Subscription renewal reminder ────────────────────────────────────────────

def send_renewal_reminder_email(to_email: str, username: str, renewal_date: str, days_remaining: int):
    subject = f"Your DeskStock Premium expires in {days_remaining} day{'s' if days_remaining != 1 else ''}"
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
          <tr>
            <td style="background:linear-gradient(135deg,#b8860b,#FFD700);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f1b2d;">Premium Renewal Reminder</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(15,27,45,0.75);">Your plan is expiring soon</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0;font-size:16px;color:#e2e8f0;">Hi <b>{username}</b>,</p>
              <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
                Your <b style="color:#FFD700;">Premium</b> subscription will expire on
                <b style="color:#e2e8f0;">{renewal_date}</b> — that's in
                <b style="color:#f87171;">{days_remaining} day{'s' if days_remaining != 1 else ''}</b>.
              </p>
              <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
                Renew now to keep enjoying unlimited AI predictions, expert portfolios, and advanced analytics without interruption.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;">
              <div style="background:#1e2d5a;border-left:3px solid #FFD700;border-radius:6px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#fbbf24;font-weight:600;">Don't lose access to Premium features</p>
                <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                  After expiry, your account will revert to the free plan. Log in to DeskStock to renew your subscription.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1635;padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:#334155;">© 2025 DeskStock · You received this because your Premium subscription is expiring soon.</p>
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
    msg["From"] = f"DeskStock <{GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))
    return _send(msg, to_email, label=f"renewal reminder for {username}")


# ── Subscription cancellation confirmation ────────────────────────────────────

def send_cancellation_email(to_email: str, username: str, plan_type: str):
    plan_label = plan_type.capitalize()
    subject = f"Your DeskStock {plan_label} Subscription Has Been Cancelled"
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
          <tr>
            <td style="background:linear-gradient(135deg,#1e2d5a,#2d1a1a);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Subscription Cancelled</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">Your {plan_label} plan has been deactivated</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0;font-size:16px;color:#e2e8f0;">Hi <b>{username}</b>,</p>
              <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
                Your <b style="color:#f87171;">{plan_label}</b> subscription has been successfully cancelled.
                Your account has been reverted to the free plan.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;">
              <div style="background:#1e2d5a;border-left:3px solid #f59e0b;border-radius:6px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#fbbf24;font-weight:600;">Changed your mind?</p>
                <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                  You can re-subscribe at any time from your profile page to regain access to all {plan_label} features.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1635;padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:#334155;">© 2025 DeskStock · You received this because your subscription was cancelled.</p>
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
    msg["From"] = f"DeskStock <{GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))
    return _send(msg, to_email, label=f"cancellation email for {username}")


# ── Price alert ───────────────────────────────────────────────────────────────

def send_alert_email(to_email: str, stock_symbol: str, current_price: float,
                     condition: str, custom_message: str = None):
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
          <tr>
            <td style="background:linear-gradient(135deg,#0092b8,#155dfc);padding:28px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">DeskStock Alert</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Your price condition has been triggered</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;">
              <span style="display:inline-block;background:rgba(96,165,250,0.15);color:#60a5fa;
                           font-size:13px;font-weight:700;letter-spacing:0.08em;
                           padding:5px 14px;border-radius:8px;">{stock_symbol}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#162040;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Condition</p>
                    <p style="margin:6px 0 0;font-size:16px;font-weight:600;color:#e2e8f0;">{condition}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Current Price</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#34d399;">${current_price:.2f}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          {custom_block}
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                This alert has been deactivated. Log in to DeskStock to create a new alert.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1635;padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:#334155;">© 2025 DeskStock · You received this because you set up a price alert.</p>
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
    return _send(msg, to_email, label=f"price alert for {stock_symbol}")