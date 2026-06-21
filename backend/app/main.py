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
from app.entity.models.expert import seed_expert_account, seed_jordan_account
from app.entity.models.subscription import Subscription
from app.entity.models.investmentarticle import InvestmentArticle
from app.boundary.stock_ws import router as stock_ws_router
from app.entity.models.watchlist import Watchlist
from app.entity.models.holding import Holding
from app.entity.models.transaction import Transaction
from app.entity.models.password_reset import PasswordReset
from app.entity.models.article import Article, seed_articles
from app.entity.models.expertportfolio import ExpertPortfolio, ExpertPortfolioHolding
from app.entity.models.forumquestion import ForumPost, ForumReply, ForumPostLike, ForumPostSave, ExpertQuestion
from app.boundary.stock_ws import router as stock_ws_router, stock_pool, get_snapshot_yfinance
from app.boundary.predictionb import router as prediction_router
from app.boundary.payment_service import router as payment_router
from app.boundary.alertb import router as alertb
from app.boundary.passwordresetb import router as password_reset_router
from app.boundary.tradingb import router as trading_router
from app.boundary.knowledgehub_b import router as knowledge_router
from app.boundary.expertb import router as expert_router
from app.boundary.consultant_forumb import router as consultant_forum_router
from app.boundary.contentb import router as content_router
from app.entity.models.landingcontent import LandingContent, seed_landing_content
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
seed_profiles()
seed_admin_account()
seed_investor_account()
seed_expert_account()
seed_jordan_account()
seed_articles()
seed_landing_content()

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
app.include_router(consultant_forum_router)
app.include_router(content_router)


@app.get("/")
def home():
    return {"message": "Backend connected successfully"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("422 VALIDATION ERROR:", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
