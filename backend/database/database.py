from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from core.config import settings

# Try to create an engine for the configured DATABASE_URL. If the
# necessary DB driver (for example `psycopg2` for Postgres) is not
# installed in the developer environment, fall back to a local SQLite
# database so the app can run for development and testing.
try:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
except Exception as exc:  # pragma: no cover - dev fallback
    # Fallback to SQLite local file when the primary DB driver is missing.
    import warnings

    warnings.warn(f"Could not initialize engine for {settings.DATABASE_URL}: {exc}. Falling back to ./dev.db SQLite.")
    engine = create_engine("sqlite:///./dev.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
