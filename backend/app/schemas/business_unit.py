"""Pydantic schemas for BusinessUnit request/response."""

from pydantic import BaseModel


class BusinessUnitRead(BaseModel):
    id: str
    name: str
    manager_user_id: str
