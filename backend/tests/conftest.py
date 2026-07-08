import os

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from database.database import Base, get_db
import models.models  # noqa: F401


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
