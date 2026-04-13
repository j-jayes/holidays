"""Tests for leave request schema validation."""

from datetime import date

import pytest

from app.models.leave_request import LeaveStatus
from app.schemas.leave_request import LeaveRequestCreate


def test_leave_request_create_valid() -> None:
    """A request with end_date >= start_date should be accepted."""
    req = LeaveRequestCreate(
        start_date=date(2025, 7, 14),
        end_date=date(2025, 7, 18),
        leave_type=LeaveStatus.APPROVED,
    )
    assert req.start_date == date(2025, 7, 14)
    assert req.end_date == date(2025, 7, 18)
    assert req.leave_type == LeaveStatus.APPROVED


def test_leave_request_create_end_before_start_raises() -> None:
    """A request with end_date before start_date should be rejected."""
    with pytest.raises(ValueError, match="end_date must be on or after start_date"):
        LeaveRequestCreate(
            start_date=date(2025, 7, 18),
            end_date=date(2025, 7, 14),
            leave_type=LeaveStatus.REQUESTED,
        )


def test_leave_request_create_same_day() -> None:
    """A single-day request (start == end) should be valid."""
    req = LeaveRequestCreate(
        start_date=date(2025, 12, 24),
        end_date=date(2025, 12, 24),
        leave_type=LeaveStatus.COMP_TIME,
    )
    assert req.start_date == req.end_date


def test_health_endpoint(client) -> None:
    """The /health endpoint should return 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
