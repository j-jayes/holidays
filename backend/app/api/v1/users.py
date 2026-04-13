"""User endpoints."""

from fastapi import APIRouter, Depends

from app.auth.entra import get_current_user
from app.schemas.user import UserCreate, UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
) -> UserRead:
    """Return the profile of the authenticated user."""
    # TODO: look up full user record from Cosmos DB
    raise NotImplementedError


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> UserRead:
    """Return a single user by ID (manager/admin only)."""
    # TODO: implement
    raise NotImplementedError


@router.post("/", response_model=UserRead, status_code=201)
async def create_user(
    payload: UserCreate,
    current_user: dict = Depends(get_current_user),
) -> UserRead:
    """Create a new user (admin only)."""
    # TODO: implement
    raise NotImplementedError
