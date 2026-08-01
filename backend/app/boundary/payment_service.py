import os
import threading
from uuid import uuid4
from pydantic import BaseModel
import stripe
from fastapi import APIRouter, HTTPException, Request
from app.control.controller.investorc import GetInvestorController, CreateInvestorController
from app.entity.models.useraccount import UserAccount
from app.control.services.email_service import send_subscription_email, send_cancellation_email
from app.control.controller.notificationc import create_notification


def _email_subscription(user_id: str, plan_type: str):
    try:
        info = UserAccount.get_user_information(user_id)
        if info:
            threading.Thread(
                target=send_subscription_email,
                args=(info["email_address"], info["username"], plan_type),
                daemon=True
            ).start()
    except Exception as e:
        print(f"[EMAIL] Failed to queue subscription email: {e}")


# Set once at module load, not per-request
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(prefix="/user", tags=["User"])

PLAN_CONFIG = {
    "basic": {"name": "Basic Subscription", "amount": 0},
    "premium": {"name": "Premium Subscription", "amount": 2099},  # S$20.99
}


class SubscriptionRequest(BaseModel):
    user_id: str
    plan_type: str  # "basic" or "premium"


class CreateSubscription:
    def __init__(self):
        self.get_investor_controller = GetInvestorController()
        self.create_investor_controller = CreateInvestorController()

    def createSubscription(self, transaction_id: str, plan_type: str, user_id: str):
        investor = self.get_investor_controller.getInvestorByUserId(user_id)
        if not investor:
            return False
        subscription = self.create_investor_controller.createSubscription(
            transaction_id, plan_type, investor["investor_id"])
        if subscription:
            create_notification(
                user_id,
                "subscription",
                f"{plan_type.capitalize()} subscription activated",
                f"Your {plan_type} membership is now active.",
            )
        return subscription


create_subscription_service = CreateSubscription()


@router.post("/create-checkout-session")
def create_checkout_session(request: SubscriptionRequest):

    # Basic plan — no payment required, activate immediately
    if request.plan_type == "basic":
        result = create_subscription_service.createSubscription(
            f"basic_{uuid4()}", request.plan_type, request.user_id
        )
        if result is False:
            return {
                "success": False,
                "message": "The account already has an active basic subscription. Do you want to upgrade to premium?"
            }
        if not result:
            raise HTTPException(
                status_code=400, detail="Failed to activate basic subscription")
        _email_subscription(request.user_id, "basic")
        return {
            "success": True,
            "message": "Basic subscription activated",
            "checkout_url": FRONTEND_URL + "/investor/payment-success"
        }

    # Premium plan — create Stripe session only.

    elif request.plan_type == "premium":
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "sgd",
                    "product_data": {
                        "name": "Premium Subscription"
                    },
                    "unit_amount": PLAN_CONFIG["premium"]["amount"],
                },
                "quantity": 1,
            }],
            mode="payment",
            metadata={
                "user_id": request.user_id,
                "plan_type": "premium"
            },
            success_url=f"{FRONTEND_URL}/investor/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/investor/payment-fail",
        )
        return {
            "success": True,
            "message": "Checkout session created. Awaiting payment confirmation.",
            "checkout_url": checkout_session.url
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid plan type")


@router.get("/subscription-status/{user_id}")
def get_subscription_status(user_id: str):
    investor = create_subscription_service.get_investor_controller.getInvestorByUserId(
        user_id
    )
    if not investor:
        return {
            "success": False,
            "message": "Investor not found",
            "subscription_status": "inactive"
        }

    return {
        "success": True,
        "subscription_status": investor["investor_subscription_status"] or "inactive"
    }


@router.post("/cancel-subscription/{user_id}")
def cancel_subscription(user_id: str):
    from app.entity.models.subscription import Subscription as SubscriptionModel
    investor = create_subscription_service.get_investor_controller.getInvestorByUserId(user_id)
    if not investor:
        return {"success": False, "message": "Investor not found"}
    latest = SubscriptionModel.getLatestByInvestorId(investor["investor_id"])
    cancelled_plan = SubscriptionModel.cancelSubscription(investor["investor_id"])
    if cancelled_plan == "premium_locked":
        return {"success": False, "message": "Premium subscriptions cannot be cancelled."}
    if not cancelled_plan:
        return {"success": False, "message": "No active subscription to cancel"}
    if latest:
        threading.Thread(
            target=_email_cancellation,
            args=(user_id, latest["plan_type"]),
            daemon=True,
        ).start()
        create_notification(
            user_id,
            "subscription",
            f"{latest['plan_type'].capitalize()} subscription cancelled",
            "Your subscription has been cancelled.",
        )
    return {"success": True, "message": "Subscription cancelled successfully", "new_status": "inactive"}


def _email_cancellation(user_id: str, plan_type: str):
    try:
        info = UserAccount.get_user_information(user_id)
        if info:
            send_cancellation_email(info["email_address"], info["username"], plan_type)
    except Exception as e:
        print(f"[EMAIL] Failed to send cancellation email: {e}")


@router.get("/subscription-details/{user_id}")
def get_subscription_details(user_id: str):
    from app.entity.models.subscription import Subscription as SubscriptionModel
    investor = create_subscription_service.get_investor_controller.getInvestorByUserId(user_id)
    if not investor:
        return {"success": False, "latest": None, "history": []}
    investor_id = investor["investor_id"]
    latest = SubscriptionModel.getLatestByInvestorId(investor_id)
    history = SubscriptionModel.getAllByInvestorId(investor_id)
    return {"success": True, "latest": latest, "history": history}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe calls this after a successful payment.
    This is the ONLY place premium subscriptions are activated.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # Activate on paid OR no_payment_required (zero-amount test/free sessions)
        payment_status = session["payment_status"]
        if payment_status not in ("paid", "no_payment_required"):
            print(f"[INFO] Session not paid yet — skipping activation")
            return {"status": "ok"}

        user_id = str(session["metadata"]["user_id"])
        plan_type = session["metadata"]["plan_type"]
        transaction_id = session["id"]

        success = create_subscription_service.createSubscription(
            transaction_id, plan_type, user_id)
        if not success:
            print(
                f"[WARN] Failed to record subscription for user_id={user_id}, session={transaction_id}")
        else:
            print(f"[INFO] Premium subscription activated for user_id={user_id}")

    return {"status": "ok"}


class VerifySessionRequest(BaseModel):
    session_id: str


@router.post("/verify-session")
def verify_session(request: VerifySessionRequest):
    """
    Called from the payment success page to activate a premium subscription
    by retrieving the Stripe session directly — no webhook dependency.
    """
    try:
        session = stripe.checkout.Session.retrieve(request.session_id)
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

    payment_status = getattr(session, "payment_status", None)
    if payment_status not in ("paid", "no_payment_required"):
        return {"success": False, "message": "Payment not completed"}

    user_id = str(session.metadata["user_id"])
    plan_type = session.metadata["plan_type"]

    result = create_subscription_service.createSubscription(
        session.id, plan_type, user_id)

    if not result and result is not False:
        raise HTTPException(
            status_code=400, detail="Failed to activate subscription")

    # Send email regardless of whether subscription was just created or already active
    _email_subscription(user_id, plan_type)

    if result is False:
        return {"success": True, "already_active": True}
    return {"success": True}
