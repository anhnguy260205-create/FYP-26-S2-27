import firebase_admin
from firebase_admin import credentials, auth
import os
import json
import requests

_initialized = False

def _init():
    global _initialized
    if not _initialized:
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if service_account_json:
            cred = credentials.Certificate(json.loads(service_account_json))
        else:
            key_path = os.path.join(os.path.dirname(__file__), "../../../serviceAccountKey.json")
            cred = credentials.Certificate(os.path.abspath(key_path))
        firebase_admin.initialize_app(cred)
        _initialized = True


def verify_firebase_token(token: str):
    try:
        _init()
    except Exception as e:
        print(f"[FIREBASE AUTH] Init failed: {e}")
        return None
    try:
        return auth.verify_id_token(token, clock_skew_seconds=10)
    except Exception as e:
        print(f"[FIREBASE AUTH] Token verification failed: {e}")
        return None


def update_password_by_email(email: str, new_password: str) -> bool:
    _init()
    try:
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, password=new_password)
        return True
    except Exception as e:
        print(f"[FIREBASE ADMIN] Failed to update password for {email}: {e}")
        return False


def delete_firebase_user_by_email(email: str) -> bool:
    try:
        _init()
    except Exception as e:
        print(f"[FIREBASE ADMIN] Init failed, skipping Firebase deletion for {email}: {e}")
        return False
    try:
        user = auth.get_user_by_email(email)
        auth.delete_user(user.uid)
        return True
    except auth.UserNotFoundError:
        return True  # already gone — not an error for our purposes
    except Exception as e:
        print(f"[FIREBASE ADMIN] Failed to delete user {email}: {e}")
        return False


def verify_password_firebase(email: str, password: str) -> bool:
    api_key = os.getenv("FIREBASE_WEB_API_KEY")
    if not api_key:
        print("[FIREBASE] FIREBASE_WEB_API_KEY not set — cannot verify current password")
        return False
    try:
        resp = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
            json={"email": email, "password": password, "returnSecureToken": False},
            timeout=5,
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"[FIREBASE] Password verification failed: {e}")
        return False


def seed_firebase_user(email: str, password: str, display_name: str = None) -> bool:
    """Create a Firebase user if they don't already exist."""
    _init()
    try:
        auth.get_user_by_email(email)
        print(f"[FIREBASE SEED] {email} already exists — skipping.")
        return True
    except auth.UserNotFoundError:
        pass

    try:
        kwargs = {"email": email, "password": password, "email_verified": True}
        if display_name:
            kwargs["display_name"] = display_name
        auth.create_user(**kwargs)
        print(f"[FIREBASE SEED] Created {email}")
        return True
    except Exception as e:
        print(f"[FIREBASE SEED] Failed to create {email}: {e}")
        return False


def seed_all_firebase_accounts():
    """Seed default accounts. Passwords come from env vars; dev fallbacks are intentionally weak."""
    seed_firebase_user("fyphd3009@gmail.com", os.getenv("SEED_ADMIN_PASSWORD", "admin123"),    "Admin")
    seed_firebase_user("jordan@gmail.com", os.getenv("SEED_JORDAN_PASSWORD",   "password123"), "Jordan")
    seed_firebase_user("fyphr123@gmail.com", os.getenv("SEED_HR_PASSWORD",    "password"),     "Finance Admin")
