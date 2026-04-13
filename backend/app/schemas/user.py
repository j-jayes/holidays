"""Pydantic schemas for User request/response."""

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserRead(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    role: UserRole
    business_unit_id: str
    annual_leave_balance: float
    comp_time_balance: float


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str
    role: UserRole
    business_unit_id: str
    entra_oid: str
