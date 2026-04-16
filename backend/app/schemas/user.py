"""Pydantic schemas for User request/response."""

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserRead(BaseModel):
    id: str
    email: EmailStr
    displayName: str
    role: UserRole
    businessUnitId: str
    annualLeaveBalance: float
    compTimeBalance: float


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str
    role: UserRole
    business_unit_id: str
    entra_oid: str = ""
