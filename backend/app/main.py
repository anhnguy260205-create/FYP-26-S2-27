import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.boundary.userb import router as user_router
from app.boundary.adminb import router as admin_router
from app.entity.database.connection import engine
from app.entity.database.base import Base
from app.entity.models.userprofile import seed_profiles
from app.entity.models.useraccount import seed_admin_account
from app.entity.models.investor import seed_investor_account
from app.entity.models.expert import seed_expert_account
from app.entity.models.subscription import Subscription
from app.entity.models.investmentarticle import InvestmentArticle
from app.boundary.stock_ws import router as stock_ws_router
from app.entity.models.watchlist import Watchlist
from app.entity.models.holding import Holding
from app.entity.models.transaction import Transaction
from app.entity.models.password_reset import PasswordReset
from app.entity.models.article import Article
from app.entity.models.forumquestion import ForumQuestion, ForumReply
from app.entity.models.expertportfolio import ExpertPortfolio, ExpertPortfolioHolding
from app.boundary.stock_ws import router as stock_ws_router, stock_pool, get_snapshot_yfinance
from app.boundary.predictionb import router as prediction_router
from app.boundary.payment_service import router as payment_router
from app.boundary.alertb import router as alertb
from app.boundary.passwordresetb import router as password_reset_router
from app.boundary.tradingb import router as trading_router
from app.boundary.knowledgehub_b import router as knowledge_router
from app.boundary.expertb import router as expert_router
from app.control.controller.alertc import CheckAndTriggerAlertsController

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def yfinance_alert_poller():
    """Check alerts every 60 s using yfinance prices — works even when no browser tab is open."""
    await asyncio.sleep(10)  # wait for server to fully start
    while True:
        for symbol in stock_pool:
            try:
                snapshot = await asyncio.to_thread(get_snapshot_yfinance, symbol)
                price = snapshot.get("p")
                prev_close = snapshot.get("previousClose")
                if price is not None:
                    await asyncio.to_thread(
                        CheckAndTriggerAlertsController().check,
                        symbol, float(price), float(prev_close) if prev_close else None
                    )
            except Exception as e:
                print(f"[ALERT-POLL] Error checking {symbol}: {e}")
        await asyncio.sleep(60)


def lightweight_schema_migration():
    """Add forum/expert portfolio columns if an existing dev DB already has older tables."""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    def add_missing_columns(table_name, column_sql_by_name):
        if table_name not in tables:
            return
        existing = {col["name"] for col in inspector.get_columns(table_name)}
        with engine.begin() as conn:
            for column_name, column_sql in column_sql_by_name.items():
                if column_name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")

    add_missing_columns("forum_questions", {
        "tags": "tags TEXT NULL",
        "image_url": "image_url VARCHAR(500) NULL",
        "urgency": "urgency VARCHAR(30) NULL DEFAULT 'normal'",
        "tickers": "tickers TEXT NULL",
        "investment_goal": "investment_goal TEXT NULL",
        "views": "views INTEGER NULL DEFAULT 0",
        "likes": "likes INTEGER NULL DEFAULT 0",
        "edited": "edited BOOL NULL DEFAULT 0",
    })
    add_missing_columns("forum_replies", {
        "likes": "likes INTEGER NULL DEFAULT 0",
    })
    add_missing_columns("expert_portfolio_holdings", {
        "company_name": "company_name VARCHAR(150) NULL",
        "purchase_rationale": "purchase_rationale TEXT NULL",
    })


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(yfinance_alert_poller())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables based on the defined models
Base.metadata.create_all(bind=engine)
lightweight_schema_migration()
seed_profiles()
seed_admin_account()
seed_investor_account()
seed_expert_account()
seed_articles()

app.include_router(user_router)
app.include_router(admin_router)
app.include_router(stock_ws_router)
app.include_router(prediction_router)
app.include_router(payment_router)
app.include_router(alertb)
app.include_router(password_reset_router)
app.include_router(trading_router)
app.include_router(knowledge_router)
app.include_router(expert_router)


@app.get("/")
def home():
    return {"message": "Backend connected successfully"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("422 VALIDATION ERROR:", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
