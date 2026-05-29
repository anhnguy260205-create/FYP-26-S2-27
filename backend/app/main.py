from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.boundary.userb import router as user_router
from app.entity.database.connection import engine
from app.entity.database.base import Base
from app.entity.models.userprofile import seed_profiles
from app.entity.models.useraccount import seed_account
from app.boundary.stock_ws import router as stock_ws_router
from app.boundary.predictionb import router as prediction_router


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
seed_account()
app.include_router(user_router)
app.include_router(stock_ws_router)
app.include_router(prediction_router)


@app.get("/")
def home():
    return {"message": "Backend connected successfully"}
