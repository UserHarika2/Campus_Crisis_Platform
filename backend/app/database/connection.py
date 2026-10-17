import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:Harika13@localhost:5432/campus_crisis")

try:
    engine = create_engine(DATABASE_URL, echo=False)
    with engine.connect() as conn:
        pass
except Exception:
    SQLITE_URL = "sqlite:///./campus_crisis.db"
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False}, echo=False)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()