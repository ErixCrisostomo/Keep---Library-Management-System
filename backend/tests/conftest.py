import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from database.database import get_db, SessionLocal
from models import models  # noqa: F401 - Ensures models are registered with SQLAlchemy


@pytest.fixture(scope="session")
def client():
    """Provides a FastAPI TestClient with a database dependency override."""
    from main import app

    # Override the get_db dependency to use our actual test database session
    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Create the test client
    with TestClient(app) as test_client:
        yield test_client

    # Clean up overrides after tests finish
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def db_session():
    """
    Provides a direct database session for ORM operations in tests.
    (e.g., manually creating a Student or Librarian before hitting an API endpoint).
    
    Note: Because your tests use unique UUIDs for data like login_ids, 
    we don't need complex transaction rollbacks. The data stays in the DB 
    but won't conflict with anything.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()