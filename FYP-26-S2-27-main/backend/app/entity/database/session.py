# database.py or session.py
from sqlalchemy.orm import sessionmaker
from app.entity.database.connection import engine
from contextlib import contextmanager

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False
)


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
