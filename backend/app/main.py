import os
import certifi
# Point Python's SSL stack at certifi's CA bundle (fixes Windows cert errors with Google APIs)
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())

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
from app.entity.models.subscription import Subscription
from app.entity.models.watchlist import Watchlist
from app.entity.models.holding import Holding
from app.entity.models.transaction import Transaction
from app.entity.models.password_reset import PasswordReset
from app.entity.models.article import Article, seed_articles
from app.entity.models.expertportfolio import ExpertPortfolio, ExpertPortfolioHolding
from app.entity.models.forumquestion import (
    ForumPost, ForumReply, ForumPostLike, ForumPostSave,
    ForumReplyLike, ForumPostView,
    seed_forum_posts, ensure_forum_schema,
)
from app.entity.models.contentmanagement import ContentManagement, seed_landing_content
from app.entity.models.emailalert import StockAlert
from app.entity.models.order_book import OrderBook
from app.entity.models.predictionusage import PredictionUsage
from app.entity.models.review import Review, ReviewHelpful, seed_reviews
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
from app.boundary.passwordresetb import router as password_reset_router
from app.boundary.tradingb import router as trading_router
from app.boundary.knowledgehub_b import router as knowledge_router
from app.boundary.expertb import router as expert_router
from app.boundary.consultant_forumb import router as consultant_forum_router
from app.boundary.contentb import router as content_router
from app.boundary.chatbotb import router as chatbot_router
from app.boundary.reviewb import router as review_router
from app.control.controller.alertc import CheckAndTriggerAlertsController
from app.control.services.firebase_admin_service import seed_all_firebase_accounts
from app.control.services.email_service import send_renewal_reminder_email

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.control.services.rate_limit import limiter


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
        ("subscription", "renewal_reminder_sent", "ALTER TABLE subscription ADD COLUMN renewal_reminder_sent TINYINT(1) NOT NULL DEFAULT 0"),
        ("transaction",  "realized_pnl",          "ALTER TABLE transaction ADD COLUMN realized_pnl FLOAT NULL"),
        ("article",      "author_type",           "ALTER TABLE article ADD COLUMN author_type VARCHAR(20) NOT NULL DEFAULT 'expert'"),
        ("article",      "author_name",           "ALTER TABLE article ADD COLUMN author_name VARCHAR(100) NULL"),
        ("expert",       "documents",             "ALTER TABLE expert ADD COLUMN documents TEXT NULL"),
        ("forum_post",   "is_featured",           "ALTER TABLE forum_post ADD COLUMN is_featured INTEGER DEFAULT 0"),
        ("forum_post",   "is_closed",             "ALTER TABLE forum_post ADD COLUMN is_closed INTEGER DEFAULT 0"),
        ("forum_post",   "ticker_tags",           "ALTER TABLE forum_post ADD COLUMN ticker_tags VARCHAR(255) DEFAULT ''"),
        ("forum_reply",  "is_edited",             "ALTER TABLE forum_reply ADD COLUMN is_edited INTEGER DEFAULT 0"),
        ("forum_reply",  "updated_at",            "ALTER TABLE forum_reply ADD COLUMN updated_at DATETIME NULL"),
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
    print("[SCHEMA] All schema patches complete.")


async def yfinance_alert_poller():
    """Check alerts using cached snapshots — avoids duplicate yfinance calls.
    Polls every 60s when market is open, every 300s when closed."""
    await asyncio.sleep(10)  # wait for server to fully start
    while True:
        market_open = get_market_status() == "OPEN"
        # One batched refresh fills the cache for the whole pool — no
        # per-symbol yfinance calls even when no client is connected.
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    task1 = asyncio.create_task(yfinance_alert_poller())
    task2 = asyncio.create_task(renewal_reminder_poller())
    yield
    task1.cancel()
    task2.cancel()


app = FastAPI(lifespan=lifespan, redirect_slashes=False)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "https://fyp-26-s2-27.web.app",
        "https://fyp-26-s2-27.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 1. Create brand-new tables ────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
ensure_forum_schema(engine)

# ── 2. Patch existing tables (MySQL-version-safe) ─────────────────────────────
ensure_all_schemas(engine)
ensure_forum_schema(engine)

# ── 3. Seed data ──────────────────────────────────────────────────────────────
seed_profiles()
seed_admin_account()
seed_investor_account()
seed_expert_account()
seed_jordan_account()
seed_articles()
seed_landing_content()
seed_forum_posts()
seed_reviews()
try:
    seed_all_firebase_accounts()
except Exception as _e:
    print(f"[SEED] Firebase seeding skipped (network/SSL issue): {_e}")

# ── 4. Routers ────────────────────────────────────────────────────────────────
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(stock_ws_router)
app.include_router(prediction_router)
app.include_router(rating_router)
app.include_router(payment_router)
app.include_router(alertb)
app.include_router(password_reset_router)
app.include_router(trading_router)
app.include_router(knowledge_router)
app.include_router(expert_router)
app.include_router(consultant_forum_router)
app.include_router(content_router)
app.include_router(chatbot_router)
app.include_router(review_router)


@app.get("/")
def home():
    return {"message": "Backend connected successfully"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("422 VALIDATION ERROR:", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
