
import os
import requests

_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


def verify_recaptcha(token: str | None, remote_ip: str | None = None) -> bool:
    secret = os.getenv("RECAPTCHA_SECRET_KEY")
    if not secret:
        print("[CAPTCHA] RECAPTCHA_SECRET_KEY not set — skipping verification (dev mode)")
        return True
    if not token:
        return False
    try:
        payload = {"secret": secret, "response": token}
        if remote_ip:
            payload["remoteip"] = remote_ip
        resp = requests.post(_VERIFY_URL, data=payload, timeout=10)
        result = resp.json()
        if not result.get("success"):
            print(f"[CAPTCHA] verification failed: {result.get('error-codes')}")
        return bool(result.get("success"))
    except Exception as e:
        # Network hiccup verifying with Google — fail closed for safety.
        print(f"[CAPTCHA] verify error: {e}")
        return False
