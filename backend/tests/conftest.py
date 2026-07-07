import os

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.database import Base, get_db
from core.config import settings

# Use a file-based SQLite DB for tests to avoid in-memory connection quirks
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///./test.db")

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables at import time so they exist before any fixtures/tests run
import models.models  # noqa: F401
# Ensure a fresh schema for each test run
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def setup_module(module):
    # kept for pytest compatibility
    return


def teardown_module(module):
    # Drop all tables after tests (clean slate)
    Base.metadata.drop_all(bind=engine)


def create_test_client(app):
    """Returns a TestClient with DB dependency overridden to use the test DB."""
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


import pytest


@pytest.fixture(scope="session")
def client():
    # Import app lazily so environment overrides can be applied beforehand if needed
    from main import app

    return create_test_client(app)


@pytest.fixture()
def db_session():
    # Provide a transactional scope for tests that need DB access directly
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
