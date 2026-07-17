"""
captcha.py
==========
Google reCAPTCHA v2 server-side verification for the registration endpoint.

Setup: create keys at https://www.google.com/recaptcha/admin (choose
"Challenge (v2)" → "I'm not a robot" checkbox, add localhost + your domain),
then put the SECRET key in backend/.env:

    RECAPTCHA_SECRET_KEY=...

and the SITE key in frontend/.env:

    VITE_RECAPTCHA_SITE_KEY=...

If RECAPTCHA_SECRET_KEY is not set, verification is SKIPPED (dev convenience)
— a warning is printed so this can't go unnoticed in production logs.
"""

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
