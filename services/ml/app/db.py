from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

# `satps_ml` is a dedicated Postgres role with SELECT-only grants (see
# ARCHITECTURE.md's "ML integration boundary") — a write attempt from this
# service fails at the database level, not just by convention.
engine = create_engine(settings.sqlalchemy_database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True
