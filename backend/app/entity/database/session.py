# database.py or session.py
from sqlalchemy.orm import sessionmaker
from app.entity.database.connection import engine
from contextlib import contextmanager

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
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
