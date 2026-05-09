# This module sets up the database connection using SQLAlchemy and loads configuration from environment variables.  
# It also includes a function to check the database connection and prints a success message if the connection is established.
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / ".env")

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

missing_values = [
    name
    for name, value in {
        "DB_HOST": DB_HOST,
        "DB_PORT": DB_PORT,
        "DB_NAME": DB_NAME,
        "DB_USER": DB_USER,
        "DB_PASSWORD": DB_PASSWORD,
    }.items()
    if not value
]

if missing_values:
    raise RuntimeError(
        "Missing database environment variables: "
        + ", ".join(missing_values)
    )

DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT),
    database=DB_NAME,
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def check_database_connection():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

print("Database connection successful")