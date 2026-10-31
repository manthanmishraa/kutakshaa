import os
import tempfile
from pathlib import Path

# Point the app at a throwaway database BEFORE app.database is imported,
# so tests never touch the committed backend/kutaksha.db.
_TEST_DB = Path(tempfile.gettempdir()) / "kutaksha_test.db"
if _TEST_DB.exists():
    _TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_token(client):
    """Register + log in a real user and return a real JWT."""
    credentials = {
        "email": "rag-tester@kutaksha.com",
        "username": "rag-tester",
        "password": "test-pass-123",
        "role": "doctor",
        "full_name": "Dr. Test",
    }
    client.post("/auth/register", json=credentials)
    response = client.post(
        "/auth/login",
        json={"username": credentials["username"], "password": credentials["password"]},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}
