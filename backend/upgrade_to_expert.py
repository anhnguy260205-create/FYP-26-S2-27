
import sys

from app.entity.database.session import get_session
from app.entity.models.useraccount import UserAccount
from app.entity.models.investor import Investor
from app.entity.models.expert import Expert
from app.entity.models.expertverification import ExpertVerification


def upgrade(email: str):
    email = email.strip().lower()

    with get_session() as session:
        user = session.query(UserAccount).filter(
            UserAccount.email_address == email).first()
        if not user:
            print(f"[ERROR] No account found for {email}")
            return False
        user_id = user.user_id
        username = user.username

    # 1. Ensure investor row
    with get_session() as session:
        investor = session.query(Investor).filter(
            Investor.user_id == user_id).first()
        if not investor:
            session.add(Investor(user_id=user_id))
            print("[OK] Created investor row")

    # 2. Ensure expert row + verification record
    result = Expert.create_for_existing_user(user_id)
    expert_id = result["expert_id"]
    print(f"[OK] Expert row {'created' if result['created'] else 'already exists'}: {expert_id}")

    # 3. Approve verification
    ExpertVerification.set_status(expert_id, "approved")
    print("[OK] Verification status set to approved")

    # 4. Complimentary premium
    Investor.setSubscriptionStatus(user_id, "premium")
    print("[OK] Subscription status set to premium")

    print(f"\nDone — {username} <{email}> is now a verified expert.")
    print("Ask them to log out and log back in so the new role flags load.")
    return True


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    sys.exit(0 if upgrade(sys.argv[1]) else 1)
