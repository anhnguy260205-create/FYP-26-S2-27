from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.boundary.userb import router as user_router
from app.boundary.adminb import router as admin_router
from app.entity.database.connection import engine
from app.entity.database.base import Base
from app.entity.models.userprofile import seed_profiles
from app.entity.models.useraccount import seed_admin_account
from app.entity.models.subscription import Subscription
from app.boundary.stock_ws import router as stock_ws_router
from app.boundary.predictionb import router as prediction_router
from app.boundary.payment_service import router as payment_router


from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
app = FastAPI()

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
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(stock_ws_router)
app.include_router(prediction_router)
app.include_router(payment_router)


@app.get("/")
def home():
    return {"message": "Backend connected successfully"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("422 VALIDATION ERROR:", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
