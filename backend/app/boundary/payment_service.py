import os
from uuid import uuid4
from pydantic import BaseModel
import stripe
from fastapi import APIRouter, HTTPException, Request
from app.control.controller.investorc import GetInvestorController, CreateInvestorController

# Set once at module load, not per-request
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(prefix="/user", tags=["User"])

PLAN_CONFIG = {
    "basic": {"name": "Basic Subscription", "amount": 0},
    "premium": {"name": "Premium Subscription", "amount": 0},  # S$9.90
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
            transaction_id, plan_type, investor["investor_id"])  # ✅ dict access

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
            print(
                f"[INFO] Premium subscription activated for user_id={user_id}")

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

    if result is False:
        # Already activated (webhook may have fired first — that's fine)
        return {"success": True, "already_active": True}
    if not result:
        raise HTTPException(
            status_code=400, detail="Failed to activate subscription")

    return {"success": True}
