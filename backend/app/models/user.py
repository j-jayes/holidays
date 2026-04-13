"""User domain model."""

from enum import StrEnum


class UserRole(StrEnum):
    EMPLOYEE = "Employee"
    MANAGER = "Manager"
    ADMIN = "Admin"


class User:
    """Represents an employee stored in the Users Cosmos DB container."""

    def __init__(
        self,
        id: str,
        email: str,
        display_name: str,
        role: UserRole,
        business_unit_id: str,
        entra_oid: str,
        annual_leave_balance: float = 0.0,
        comp_time_balance: float = 0.0,
    ) -> None:
        self.id = id
        self.email = email
        self.display_name = display_name
        self.role = role
        self.business_unit_id = business_unit_id
        self.entra_oid = entra_oid
        self.annual_leave_balance = annual_leave_balance
        self.comp_time_balance = comp_time_balance
