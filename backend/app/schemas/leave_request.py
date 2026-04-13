"""Pydantic schemas for LeaveRequest request/response."""

from datetime import date

from pydantic import BaseModel, model_validator

from app.models.leave_request import LeaveStatus


class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    leave_type: LeaveStatus
    notes: str = ""

    @model_validator(mode="after")
    def end_after_start(self) -> "LeaveRequestCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class LeaveRequestRead(BaseModel):
    id: str
    user_id: str
    business_unit_id: str
    start_date: date
    end_date: date
    leave_type: LeaveStatus
    status: LeaveStatus
    notes: str


class LeaveRequestUpdate(BaseModel):
    """Used by managers to approve / deny a request."""

    status: LeaveStatus
    notes: str = ""
