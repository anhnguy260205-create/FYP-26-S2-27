from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.boundary.adminb import router as admin_router
from app.entity.database.connection import engine
from app.entity.database.base import Base
from app.entity.models.user import User
from app.entity.models.userprofile import UserProfile


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

app.include_router(admin_router)

@app.get("/")
def home():
    return {"message": "Backend connected successfully"}
