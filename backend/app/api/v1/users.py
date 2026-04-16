"""User endpoints."""

import uuid

from fastapi import APIRouter, HTTPException, status

from app.db.cosmos import list_items, get_item, upsert_item, USERS_CONTAINER
from app.schemas.user import UserCreate, UserRead

router = APIRouter()

PL_BU_ID = "bu-pl"


@router.get("/", response_model=list[UserRead])
async def list_users() -> list[UserRead]:
    """Return all users, excluding the PL business unit."""
    items = await list_items(
        USERS_CONTAINER,
        query="SELECT * FROM c WHERE c.businessUnitId != @pl_bu",
        params=[{"name": "@pl_bu", "value": PL_BU_ID}],
    )
    return [UserRead(**_from_cosmos(item)) for item in items]


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: str) -> UserRead:
    """Return a single user by ID."""
    item = await get_item(USERS_CONTAINER, user_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserRead(**_from_cosmos(item))


@router.post("/", response_model=UserRead, status_code=201)
async def create_user(payload: UserCreate) -> UserRead:
    """Create a new user."""
    doc = {
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "displayName": payload.display_name,
        "role": payload.role,
        "businessUnitId": payload.business_unit_id,
        "entraOid": payload.entra_oid,
        "annualLeaveBalance": 25.0,
        "compTimeBalance": 0.0,
    }
    saved = await upsert_item(USERS_CONTAINER, doc)
    return UserRead(**_from_cosmos(saved))


def _from_cosmos(doc: dict) -> dict:
    """Map camelCase Cosmos fields to Pydantic model fields."""
    return {
        "id": doc["id"],
        "email": doc.get("email", ""),
        "displayName": doc.get("displayName", ""),
        "role": doc.get("role", "Employee"),
        "businessUnitId": doc.get("businessUnitId", ""),
        "annualLeaveBalance": doc.get("annualLeaveBalance", 0.0),
        "compTimeBalance": doc.get("compTimeBalance", 0.0),
    }
