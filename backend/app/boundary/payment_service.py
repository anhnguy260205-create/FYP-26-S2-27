import os
import threading
from uuid import uuid4

from pydantic import BaseModel
import stripe
from fastapi import APIRouter, HTTPException, Request

from app.control.controller.investorc import (
    GetInvestorController,
    CreateInvestorController,
)
from app.entity.models.useraccount import UserAccount
from app.control.services.email_service import (
    send_subscription_email,
    send_cancellation_email,
)
from app.control.controller.notificationc import create_notification


# Send the subscription email in the background so the API does not have to wait for it.
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


# Load the Stripe settings once when the application starts.
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


router = APIRouter(prefix="/user", tags=["User"])


# Prices are stored in cents because that is what Stripe expects.
PLAN_CONFIG = {
    "basic": {"name": "Basic Subscription", "amount": 0},
    "premium": {"name": "Premium Subscription", "amount": 2099},  # S$20.99
}


class SubscriptionRequest(BaseModel):
    user_id: str
    plan_type: str  # "basic" or "premium"


# Handles the subscription creation flow between the API and investor controllers.
class CreateSubscription:
    def __init__(self):
        self.get_investor_controller = GetInvestorController()
        self.create_investor_controller = CreateInvestorController()

    def createSubscription(self, transaction_id: str, plan_type: str, user_id: str):
        investor = self.get_investor_controller.getInvestorByUserId(user_id)
        if not investor:
            return False

        subscription = self.create_investor_controller.createSubscription(
            transaction_id,
            plan_type,
            investor["investor_id"]
        )

        # Let the user know when the subscription has been activated.
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

    # Basic is free, so it can be activated without going through Stripe.
    if request.plan_type == "basic":
        result = create_subscription_service.createSubscription(
            f"basic_{uuid4()}",
            request.plan_type,
            request.user_id
        )

        if result is False:
            return {
                "success": False,
                "message": "The account already has an active basic subscription. Do you want to upgrade to premium?"
            }

        if not result:
            raise HTTPException(
                status_code=400,
                detail="Failed to activate basic subscription"
            )

        _email_subscription(request.user_id, "basic")

        return {
            "success": True,
            "message": "Basic subscription activated",
            "checkout_url": FRONTEND_URL + "/investor/payment-success"
        }

    # Premium payments are handled through a Stripe checkout session.
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

    investor = create_subscription_service.get_investor_controller.getInvestorByUserId(
        user_id
    )

    if not investor:
        return {"success": False, "message": "Investor not found"}

    latest = SubscriptionModel.getLatestByInvestorId(
        investor["investor_id"]
    )

    # Cancel the active subscription and get the plan that was cancelled.
    cancelled_plan = SubscriptionModel.cancelSubscription(
        investor["investor_id"]
    )

    if cancelled_plan == "premium_locked":
        return {
            "success": False,
            "message": "Premium subscriptions cannot be cancelled."
        }

    if not cancelled_plan:
        return {
            "success": False,
            "message": "No active subscription to cancel"
        }

    # Send the cancellation email without delaying the API response.
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

    return {
        "success": True,
        "message": "Subscription cancelled successfully",
        "new_status": "inactive"
    }


# Send a confirmation email after a subscription is cancelled.
def _email_cancellation(user_id: str, plan_type: str):
    try:
        info = UserAccount.get_user_information(user_id)
        if info:
            send_cancellation_email(
                info["email_address"],
                info["username"],
                plan_type
            )
    except Exception as e:
        print(f"[EMAIL] Failed to send cancellation email: {e}")


@router.get("/subscription-details/{user_id}")
def get_subscription_details(user_id: str):
    from app.entity.models.subscription import Subscription as SubscriptionModel

    investor = create_subscription_service.get_investor_controller.getInvestorByUserId(
        user_id
    )

    if not investor:
        return {
            "success": False,
            "latest": None,
            "history": []
        }

    investor_id = investor["investor_id"]
    latest = SubscriptionModel.getLatestByInvestorId(investor_id)
    history = SubscriptionModel.getAllByInvestorId(investor_id)

    return {
        "success": True,
        "latest": latest,
        "history": history
    }


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # Make sure the webhook actually came from Stripe.
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Webhook error: {str(e)}"
        )

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # Only activate the subscription after Stripe confirms the payment.
        payment_status = session["payment_status"]

        if payment_status not in ("paid", "no_payment_required"):
            print("[INFO] Session not paid yet — skipping activation")
            return {"status": "ok"}

        user_id = str(session["metadata"]["user_id"])
        plan_type = session["metadata"]["plan_type"]
        transaction_id = session["id"]

        success = create_subscription_service.createSubscription(
            transaction_id,
            plan_type,
            user_id
        )

        if not success:
            print(
                f"[WARN] Failed to record subscription for "
                f"user_id={user_id}, session={transaction_id}"
            )
        else:
            print(
                f"[INFO] Premium subscription activated "
                f"for user_id={user_id}"
            )

    return {"status": "ok"}


class VerifySessionRequest(BaseModel):
    session_id: str


@router.post("/verify-session")
def verify_session(request: VerifySessionRequest):

    # Check the Stripe session again before activating the subscription.
    try:
        session = stripe.checkout.Session.retrieve(request.session_id)
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Stripe error: {str(e)}"
        )

    payment_status = getattr(session, "payment_status", None)

    if payment_status not in ("paid", "no_payment_required"):
        return {
            "success": False,
            "message": "Payment not completed"
        }

    user_id = str(session.metadata["user_id"])
    plan_type = session.metadata["plan_type"]

    result = create_subscription_service.createSubscription(
        session.id,
        plan_type,
        user_id
    )

    if not result and result is not False:
        raise HTTPException(
            status_code=400,
            detail="Failed to activate subscription"
        )

    # Send the confirmation email even if the subscription was already active.
    _email_subscription(user_id, plan_type)

    if result is False:
        return {
            "success": True,
            "already_active": True
        }

    return {"success": True}