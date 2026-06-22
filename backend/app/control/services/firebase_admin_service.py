import firebase_admin
from firebase_admin import credentials, auth
import os

_initialized = False

def _init():
    global _initialized
    if not _initialized:
        key_path = os.path.join(os.path.dirname(__file__), "../../../serviceAccountKey.json")
        cred = credentials.Certificate(os.path.abspath(key_path))
        firebase_admin.initialize_app(cred)
        _initialized = True


def update_password_by_email(email: str, new_password: str) -> bool:
    _init()
    try:
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, password=new_password)
        return True
    except Exception as e:
        print(f"[FIREBASE ADMIN] Failed to update password for {email}: {e}")
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
    """Seed all default accounts into Firebase. Safe to call on every startup."""
    seed_firebase_user("admin@gmail.com",   "admin123",    "Admin")
    seed_firebase_user("kim@gmail.com",     "password",    "Kim")
    seed_firebase_user("kimhi@gmail.com",   "password",    "Anh")
    seed_firebase_user("jordan@gmail.com",  "password123", "Jordan")
