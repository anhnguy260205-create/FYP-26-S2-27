import os
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
    "basic": {"name": "Basic Subscription", "amount": 0000},
    "premium": {"name": "Premium Subscription", "amount": 2099},
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
        return self.create_investor_controller.createSubscription(
            transaction_id, plan_type, investor.investor_id
        )


create_subscription_service = CreateSubscription()


@router.post("/create-checkout-session")
def create_checkout_session(request: SubscriptionRequest):

    # Basic plan
    if request.plan_type == "basic":

        result = create_subscription_service.createSubscription(
            request.user_id, request.plan_type, request.user_id
        )
        if not result:
            raise HTTPException(
                status_code=400, detail="Failed to activate basic subscription")
        else:
            return {
                "success": True,
                "message": "Basic subscription activated",
                "checkout_url": FRONTEND_URL + "/investor/payment-success"
            }

    # Premium plan
    elif request.plan_type == "premium":

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "sgd",
                    "product_data": {
                        "name": "Premium Subscription"
                    },
                    "unit_amount": 000,
                },
                "quantity": 1,
            }],
            mode="payment",
            metadata={
                "user_id": request.user_id,
                "plan_type": "premium"
            },
            success_url=f"{FRONTEND_URL}/investor/payment-success",
            cancel_url=f"{FRONTEND_URL}/investor/payment-fail",
        )
        result = create_subscription_service.createSubscription(
            request.user_id, request.plan_type, request.user_id
        )
        if not result:
            raise HTTPException(
                status_code=400, detail="Failed to activate premium subscription")
        else:
            return {
                "success": True,
                "message": "Premium subscription activated",
                "checkout_url": checkout_session.url
            }


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe calls this after a successful payment.
    This is the correct place to record the subscription in your DB.
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
        user_id = str(session["metadata"]["user_id"])
        plan_type = session["metadata"]["plan_type"]
        transaction_id = session["id"]

        success = create_subscription_service.createSubscription(
            transaction_id, plan_type, user_id)
        if not success:
            # Log this — don't raise, Stripe will retry if you return non-200
            print(
                f"[WARN] Failed to record subscription for user_id={user_id}, session={transaction_id}")

    return {"status": "ok"}
