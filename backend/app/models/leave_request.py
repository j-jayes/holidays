"""Leave request domain model."""

from datetime import date
from enum import StrEnum


class LeaveStatus(StrEnum):
    """Maps to the legacy Excel leave codes."""

    REQUESTED = "A"       # Pending manager approval
    APPROVED = "B"        # Official approved vacation
    PARENTAL = "FL"       # Föräldraledighet (parental leave)
    COMP_TIME = "C"       # Kompis / comp time


class LeaveRequest:
    """Represents a leave request stored in the LeaveRequests Cosmos DB container."""

    def __init__(
        self,
        id: str,
        user_id: str,
        business_unit_id: str,
        start_date: date,
        end_date: date,
        leave_type: LeaveStatus,
        status: LeaveStatus,
        notes: str = "",
    ) -> None:
        self.id = id
        self.user_id = user_id
        self.business_unit_id = business_unit_id
        self.start_date = start_date
        self.end_date = end_date
        self.leave_type = leave_type
        self.status = status
        self.notes = notes
