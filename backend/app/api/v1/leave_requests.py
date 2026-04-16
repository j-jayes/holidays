"""Leave request CRUD endpoints."""

import uuid

from fastapi import APIRouter, HTTPException, Path, status

from app.db.cosmos import (
    delete_item,
    get_item,
    list_items,
    upsert_item,
    LEAVE_REQUESTS_CONTAINER,
    USERS_CONTAINER,
)
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestRead, LeaveRequestUpdate

router = APIRouter()


@router.get("/", response_model=list[LeaveRequestRead])
async def list_leave_requests() -> list[LeaveRequestRead]:
    """Return all leave requests."""
    items = await list_items(LEAVE_REQUESTS_CONTAINER)
    return [LeaveRequestRead(**_from_cosmos(item)) for item in items]


@router.post("/", response_model=LeaveRequestRead, status_code=201)
async def create_leave_request(payload: LeaveRequestCreate) -> LeaveRequestRead:
    """Create a new leave request, deriving businessUnitId from the user record."""
    user = await get_item(USERS_CONTAINER, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    doc = {
        "id": str(uuid.uuid4()),
        "userId": payload.user_id,
        "businessUnitId": user.get("businessUnitId", ""),
        "startDate": payload.start_date.isoformat(),
        "endDate": payload.end_date.isoformat(),
        "leaveType": payload.leave_type,
        "status": "A",
        "notes": payload.notes,
    }
    saved = await upsert_item(LEAVE_REQUESTS_CONTAINER, doc)
    return LeaveRequestRead(**_from_cosmos(saved))


@router.get("/{request_id}", response_model=LeaveRequestRead)
async def get_leave_request(request_id: str = Path(...)) -> LeaveRequestRead:
    """Return a single leave request by ID."""
    item = await get_item(LEAVE_REQUESTS_CONTAINER, request_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    return LeaveRequestRead(**_from_cosmos(item))


@router.patch("/{request_id}", response_model=LeaveRequestRead)
async def update_leave_request(
    payload: LeaveRequestUpdate,
    request_id: str = Path(...),
) -> LeaveRequestRead:
    """Update the status and/or notes of a leave request."""
    item = await get_item(LEAVE_REQUESTS_CONTAINER, request_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    item["status"] = payload.status
    if payload.notes:
        item["notes"] = payload.notes
    saved = await upsert_item(LEAVE_REQUESTS_CONTAINER, item)
    return LeaveRequestRead(**_from_cosmos(saved))


@router.delete("/{request_id}", status_code=204)
async def cancel_leave_request(request_id: str = Path(...)) -> None:
    """Delete a leave request."""
    await delete_item(LEAVE_REQUESTS_CONTAINER, request_id)


def _from_cosmos(doc: dict) -> dict:
    """Map camelCase Cosmos fields to Pydantic model fields."""
    return {
        "id": doc["id"],
        "userId": doc.get("userId", ""),
        "businessUnitId": doc.get("businessUnitId", ""),
        "startDate": doc.get("startDate", ""),
        "endDate": doc.get("endDate", ""),
        "leaveType": doc.get("leaveType", "A"),
        "status": doc.get("status", "A"),
        "notes": doc.get("notes", ""),
    }
