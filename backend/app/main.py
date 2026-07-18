import os
import time
import certifi
from pathlib import Path
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

_ca_bundle = os.environ.get("LOCAL_CA_BUNDLE") or certifi.where()
os.environ.setdefault("SSL_CERT_FILE", _ca_bundle)
os.environ.setdefault("REQUESTS_CA_BUNDLE", _ca_bundle)
os.environ.setdefault("CURL_CA_BUNDLE", _ca_bundle)

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.boundary.userb import router as user_router
from app.boundary.adminb import router as admin_router
from app.entity.database.connection import engine
from app.entity.database.base import Base
from app.entity.models.userprofile import seed_profiles
from app.entity.models.useraccount import seed_admin_account
from app.entity.models.investor import seed_investor_account
from app.entity.models.expert import seed_expert_account, seed_jordan_account
from app.entity.models.expertverification import ExpertVerification
from app.entity.models.subscription import Subscription
from app.entity.models.watchlist import Watchlist
from app.entity.models.holding import Holding
from app.entity.models.transaction import Transaction
from app.entity.models.password_reset import PasswordReset
from app.entity.models.article import Article, seed_articles
from app.entity.models.expertportfolio import ExpertPortfolio, ExpertPortfolioHolding
from app.entity.models.review import Review, ReviewHelpful, ReviewFlag, ReviewRemoval, seed_reviews
from app.entity.models.forumquestion import (
    ForumPost, ForumReply, ForumPostLike, ForumPostSave,
    ForumReplyLike, ForumPostView,
    seed_forum_posts, ensure_forum_schema,
)
from app.entity.models.contentmanagement import ContentManagement, seed_landing_content
from app.entity.models.emailalert import StockAlert
from app.entity.models.notification import Notification, NotificationBroadcast
from app.entity.models.order_book import OrderBook
from app.entity.models.predictionusage import PredictionUsage
from app.entity.models.login_mfa import LoginMfaOtp, LoginMfaSession
from app.entity.models.expertfollow import ExpertFollow
from app.entity.models.expertportfolioreview import ExpertPortfolioReview
from app.entity.models.expertcompensation import ExpertCompensationLedger
from app.boundary.stock_ws import (
    router as stock_ws_router,
    stock_pool,
    get_market_status,
    ensure_snapshots_fresh,
    _snapshot_cache,
)
from app.boundary.predictionb import router as prediction_router
from app.boundary.ratingb import router as rating_router
from app.boundary.payment_service import router as payment_router
from app.boundary.alertb import router as alertb
from app.boundary.notificationb import router as notification_router
from app.boundary.passwordresetb import router as password_reset_router
from app.boundary.tradingb import router as trading_router
from app.boundary.knowledgehub_b import router as knowledge_router
from app.boundary.expertb import router as expert_router
from app.boundary.expertcompensationb import router as expert_compensation_router
from app.boundary.consultant_forumb import router as consultant_forum_router
from app.boundary.contentb import router as content_router
from app.boundary.chatbotb import router as chatbot_router
from app.boundary.reviewb import router as review_router
from app.boundary.chatb import router as chat_router
from app.control.controller.alertc import CheckAndTriggerAlertsController
from app.control.services.firebase_admin_service import seed_all_firebase_accounts
from app.control.services.email_service import send_renewal_reminder_email

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.control.services.rate_limit import limiter


def _env_true(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _running_on_managed_host() -> bool:
    """True on Railway, or when ENVIRONMENT=production is set explicitly."""
    return bool(
        os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID")
        or os.getenv("ENVIRONMENT", "").strip().lower() == "production"
    )


DEFAULT_HEAVY_STARTUP = not _running_on_managed_host()
RUN_SCHEMA_PATCHES = _env_true("RUN_SCHEMA_PATCHES", DEFAULT_HEAVY_STARTUP)
RUN_SEEDS = _env_true("RUN_SEEDS", DEFAULT_HEAVY_STARTUP)
RUN_FIREBASE_SEED = _env_true("RUN_FIREBASE_SEED", False)
ENABLE_BACKGROUND_JOBS = _env_true("ENABLE_BACKGROUND_JOBS", DEFAULT_HEAVY_STARTUP)
LOG_SLOW_REQUESTS = _env_true("LOG_SLOW_REQUESTS", True)



def _env_list(name: str) -> list[str]:
    raw = os.getenv(name, "")
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]


DEFAULT_CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
    "https://fyp-26-s2-27.web.app",
    "https://fyp-26-s2-27.firebaseapp.com",
]

CORS_ORIGINS = list(dict.fromkeys(
    DEFAULT_CORS_ORIGINS
    + _env_list("CORS_ORIGINS")
    + _env_list("FRONTEND_URL")
))

# Allows Vite dev ports even if the port changes. Keep exact production
# origins in CORS_ORIGINS above / the CORS_ORIGINS env var.
CORS_ALLOW_ORIGIN_REGEX = os.getenv(
    "CORS_ALLOW_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
)


def _col_exists(conn, table, col):
    """Check column existence via information_schema — works on ALL MySQL versions."""
    from sqlalchemy import text
    r = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
    ), {"t": table, "c": col})
    return r.scalar() > 0


def ensure_all_schemas(engine):
    """
    Patch ALL tables with new columns added by teammates.
    Uses information_schema check — compatible with ALL MySQL versions.
    Safe to run every startup — silently skips columns that already exist.
    """
    from sqlalchemy import text

    patches = [
        ("investor",     "risk_tolerance",        "ALTER TABLE investor ADD COLUMN risk_tolerance VARCHAR(30) NULL"),
        ("expert",       "risk_tolerance",        "ALTER TABLE expert ADD COLUMN risk_tolerance VARCHAR(30) NULL"),
        ("expert",       "interests",             "ALTER TABLE expert ADD COLUMN interests VARCHAR(255) NULL"),
        ("subscription", "renewal_reminder_sent", "ALTER TABLE subscription ADD COLUMN renewal_reminder_sent TINYINT(1) NOT NULL DEFAULT 0"),
        ("subscription", "amount",                "ALTER TABLE subscription ADD COLUMN amount INT NOT NULL DEFAULT 0"),
        ("transaction",  "realized_pnl",          "ALTER TABLE transaction ADD COLUMN realized_pnl FLOAT NULL"),
        ("article",      "author_type",           "ALTER TABLE article ADD COLUMN author_type VARCHAR(20) NOT NULL DEFAULT 'expert'"),
        ("article",      "author_name",           "ALTER TABLE article ADD COLUMN author_name VARCHAR(100) NULL"),
        ("expert",       "documents",             "ALTER TABLE expert ADD COLUMN documents TEXT NULL"),
        ("forum_post",   "is_featured",           "ALTER TABLE forum_post ADD COLUMN is_featured INTEGER DEFAULT 0"),
        ("forum_post",   "is_closed",             "ALTER TABLE forum_post ADD COLUMN is_closed INTEGER DEFAULT 0"),
        ("forum_post",   "ticker_tags",           "ALTER TABLE forum_post ADD COLUMN ticker_tags VARCHAR(255) DEFAULT ''"),
        ("forum_reply",  "is_edited",             "ALTER TABLE forum_reply ADD COLUMN is_edited INTEGER DEFAULT 0"),
        ("forum_reply",  "updated_at",            "ALTER TABLE forum_reply ADD COLUMN updated_at DATETIME NULL"),
        ("watchlist",    "user_id",               "ALTER TABLE watchlist ADD COLUMN user_id VARCHAR(50) NULL"),
        ("notification", "broadcast_id",           "ALTER TABLE notification ADD COLUMN broadcast_id INT NULL"),
        ("expert_follow", "follower_user_id",      "ALTER TABLE expert_follow ADD COLUMN follower_user_id VARCHAR(50) NULL"),
    ]

    with engine.connect() as conn:
        for table, col, stmt in patches:
            try:
                if not _col_exists(conn, table, col):
                    conn.execute(text(stmt))
                    conn.commit()
                    print(f"[SCHEMA] Added {table}.{col}")
            except Exception as e:
                print(f"[SCHEMA] Skipped {table}.{col}: {e}")


        try:
            result = conn.execute(text(
                "UPDATE subscription SET amount = 900 WHERE plan_type = 'premium' AND amount = 0"))
            conn.commit()
            if result.rowcount:
                print(f"[SCHEMA] Backfilled amount for {result.rowcount} existing premium subscription(s)")
        except Exception as e:
            print(f"[SCHEMA] Skipped subscription.amount backfill: {e}")


        try:
            if not _col_exists(conn, "user_account", "has_welcomed"):
                conn.execute(text(
                    "ALTER TABLE user_account ADD COLUMN has_welcomed TINYINT(1) NOT NULL DEFAULT 0"))
                conn.execute(text("UPDATE user_account SET has_welcomed = 1"))
                conn.commit()
                print("[SCHEMA] Added user_account.has_welcomed (existing accounts backfilled)")
        except Exception as e:
            print(f"[SCHEMA] Skipped user_account.has_welcomed: {e}")


        try:
            if _col_exists(conn, "expert", "verification_status"):
                conn.execute(text(
                    "INSERT INTO expert_verification "
                    "(verification_id, expert_id, verification_status, documents, approved_date) "
                    "SELECT CONCAT('ever_', e.expert_id), e.expert_id, "
                    "CASE "
                    "  WHEN LOWER(REPLACE(COALESCE(e.verification_status, ''), ' ', '_')) = 'pending' "
                    "       AND (e.documents IS NULL OR e.documents = '' OR e.documents = '[]') "
                    "  THEN 'not_submitted' "
                    "  ELSE LOWER(REPLACE(COALESCE(e.verification_status, 'not_submitted'), ' ', '_')) "
                    "END, "
                    "e.documents, e.approved_date "
                    "FROM expert e "
                    "WHERE NOT EXISTS ("
                    "  SELECT 1 FROM expert_verification ev WHERE ev.expert_id = e.expert_id"
                    ")"
                ))
                conn.commit()
        except Exception as e:
            print(f"[SCHEMA] Skipped expert_verification backfill: {e}")


        try:
            conn.execute(text("ALTER TABLE watchlist MODIFY investor_id VARCHAR(50) NULL"))
            conn.execute(text(
                "UPDATE watchlist w JOIN investor i ON w.investor_id = i.investor_id "
                "SET w.user_id = i.user_id WHERE w.user_id IS NULL"
            ))
            conn.commit()
        except Exception as e:
            print(f"[SCHEMA] Skipped watchlist investor_id/user_id backfill: {e}")


        try:
            conn.execute(text("ALTER TABLE expert_follow MODIFY investor_id VARCHAR(50) NULL"))
            conn.execute(text(
                "UPDATE expert_follow ef JOIN investor i ON ef.investor_id = i.investor_id "
                "SET ef.follower_user_id = i.user_id WHERE ef.follower_user_id IS NULL"
            ))
            conn.commit()
        except Exception as e:
            print(f"[SCHEMA] Skipped expert_follow investor_id/follower_user_id backfill: {e}")
    print("[SCHEMA] All schema patches complete.")


async def yfinance_alert_poller():
    """Check alerts using cached snapshots — avoids duplicate yfinance calls.
    Polls every 60s when market is open, every 300s when closed."""
    await asyncio.sleep(int(os.getenv("STOCK_POLLER_START_DELAY_SECONDS", "90")))
    while True:
        market_open = get_market_status() == "OPEN"

        await ensure_snapshots_fresh()
        for symbol in stock_pool:
            try:
                snapshot = _snapshot_cache.get(symbol)
                if not snapshot:
                    continue
                price = snapshot.get("p")
                prev_close = snapshot.get("previousClose")
                if price is not None:
                    await asyncio.to_thread(
                        CheckAndTriggerAlertsController().check,
                        symbol, float(price), float(
                            prev_close) if prev_close else None
                    )
            except Exception as e:
                print(f"[ALERT-POLL] Error checking {symbol}: {e}")
        # Poll every 60s when market is open, every 300s when closed
        await asyncio.sleep(60 if market_open else 300)


async def renewal_reminder_poller():
    """Check every hour for premium subscriptions expiring within 3 days and send reminder emails."""
    await asyncio.sleep(30)  # short delay after server start
    while True:
        try:
            expiring = await asyncio.to_thread(Subscription.getExpiringPremium, 3)
            for record in expiring:
                renewal_dt = record["sub_renewal_date"]
                if renewal_dt:
                    from datetime import datetime
                    renewal_date_obj = datetime.fromisoformat(renewal_dt)
                    days_remaining = max(0, (renewal_date_obj - datetime.now()).days)
                    renewal_date_str = renewal_date_obj.strftime("%B %d, %Y")
                    sent = await asyncio.to_thread(
                        send_renewal_reminder_email,
                        record["email_address"],
                        record["username"],
                        renewal_date_str,
                        days_remaining,
                    )
                    if sent:
                        await asyncio.to_thread(Subscription.markReminderSent, record["sub_id"])
                        print(f"[RENEWAL] Reminder sent to {record['email_address']}")
        except Exception as e:
            print(f"[RENEWAL] Poller error: {e}")
        await asyncio.sleep(3600)  # check every hour


async def expert_compensation_poller():
    """Once a day, materialize any completed calendar months of expert
    compensation that haven't been recorded yet (idempotent — safe to run
    repeatedly)."""
    await asyncio.sleep(45)  # short delay after server start
    while True:
        try:
            await asyncio.to_thread(ExpertCompensationLedger.materialize_completed_months)
        except Exception as e:
            print(f"[COMPENSATION] Poller error: {e}")
        await asyncio.sleep(86400)  # once a day


@asynccontextmanager
async def lifespan(app: FastAPI):
    tasks = []
    if ENABLE_BACKGROUND_JOBS:
        tasks = [
            asyncio.create_task(yfinance_alert_poller()),
            asyncio.create_task(renewal_reminder_poller()),
            asyncio.create_task(expert_compensation_poller()),
        ]
        print("[STARTUP] Background jobs enabled")
    else:
        print("[STARTUP] Background jobs disabled")

    try:
        yield
    finally:
        for task in tasks:
            task.cancel()


app = FastAPI(lifespan=lifespan, redirect_slashes=False)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Create/patch/seed data only when enabled 
if RUN_SCHEMA_PATCHES:
    Base.metadata.create_all(bind=engine)
    ensure_forum_schema(engine)
    ensure_all_schemas(engine)
    ensure_forum_schema(engine)
else:
    print("[STARTUP] Schema patches skipped")

if RUN_SEEDS:
    seed_profiles()
    seed_admin_account()
    seed_investor_account()
    seed_expert_account()
    seed_jordan_account()
    seed_articles()
    seed_landing_content()
    seed_forum_posts()
    seed_reviews()
else:
    print("[STARTUP] Seed data skipped")

if RUN_FIREBASE_SEED:
    try:
        seed_all_firebase_accounts()
    except Exception as _e:
        print(f"[SEED] Firebase seeding skipped (network/SSL issue): {_e}")
else:
    print("[STARTUP] Firebase seeding skipped")

#  2. Routers 
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(stock_ws_router)
app.include_router(prediction_router)
app.include_router(rating_router)
app.include_router(payment_router)
app.include_router(alertb)
app.include_router(notification_router)
app.include_router(password_reset_router)
app.include_router(trading_router)
app.include_router(knowledge_router)
app.include_router(expert_router)
app.include_router(expert_compensation_router)
app.include_router(consultant_forum_router)
app.include_router(content_router)
app.include_router(chatbot_router)
app.include_router(review_router)
app.include_router(chat_router)


@app.middleware("http")
async def log_request_time(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    if LOG_SLOW_REQUESTS and duration_ms > int(os.getenv("SLOW_REQUEST_MS", "500")):
        print(f"[SLOW] {request.method} {request.url.path} {response.status_code} {duration_ms:.0f}ms")
    return response


@app.get("/")
def home():
    return {"message": "Backend connected successfully"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("422 VALIDATION ERROR:", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
