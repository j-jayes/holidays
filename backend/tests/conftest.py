"""Pytest fixtures shared across the test suite."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    """Return a synchronous test client with auth bypassed."""
    # Override authentication so tests don't need a real Entra ID token.
    from app.auth.entra import get_current_user
    from app.core.dependencies import require_manager

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "test-user-id",
        "email": "employee@test.com",
        "roles": ["Employee"],
    }
    app.dependency_overrides[require_manager] = lambda: {
        "sub": "test-manager-id",
        "email": "manager@test.com",
        "roles": ["Manager"],
    }

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
