"""Shared FastAPI dependencies."""

from fastapi import Depends, HTTPException, status

from app.auth.entra import get_current_user

ROLE_MANAGER = "Manager"
ROLE_ADMIN = "Admin"


def require_manager(current_user: dict = Depends(get_current_user)) -> dict:
    """Raise 403 if the current user is not a Manager or Admin."""
    roles: list[str] = current_user.get("roles", [])
    if ROLE_MANAGER not in roles and ROLE_ADMIN not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or Admin role required.",
        )
    return current_user


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Raise 403 if the current user is not an Admin."""
    roles: list[str] = current_user.get("roles", [])
    if ROLE_ADMIN not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required.",
        )
    return current_user
