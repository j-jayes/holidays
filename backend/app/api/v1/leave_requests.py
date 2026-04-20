"""Leave request CRUD endpoints."""

import uuid
from datetime import date as _date

from fastapi import APIRouter, HTTPException, Path, status

from app.db.cosmos import (
    delete_item,
    get_item,
    list_items,
    upsert_item,
    LEAVE_REQUESTS_CONTAINER,
    USERS_CONTAINER,
)
from app.models.leave_request import LeaveRequest, LeaveStatus
from app.models.user import User, UserRole
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestRead, LeaveRequestUpdate
from app.services.notifications import notify_employee_decision

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
    """Update the status and/or notes of a leave request.

    When a manager approves (status → B) or denies (status → C), an email
    notification is sent to the employee.  Undo actions (status → A) are
    silent — no email is sent.  Notification failures are swallowed so they
    never prevent the status update from persisting.
    """
    item = await get_item(LEAVE_REQUESTS_CONTAINER, request_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")
    item["status"] = payload.status
    if payload.notes:
        item["notes"] = payload.notes
    saved = await upsert_item(LEAVE_REQUESTS_CONTAINER, item)

    # ── Fire-and-forget employee notification ────────────────────────────────
    # Only send for actionable decisions; never for undo (A) or other codes.
    if payload.status in ("B", "C"):
        user_doc = await get_item(USERS_CONTAINER, item.get("userId", ""))
        if user_doc:
            employee = User(
                id=user_doc["id"],
                email=user_doc.get("email", ""),
                display_name=user_doc.get("displayName", ""),
                role=UserRole(user_doc.get("role", "Employee")),
                business_unit_id=user_doc.get("businessUnitId", ""),
                entra_oid=user_doc.get("entraOid", ""),
                annual_leave_balance=user_doc.get("annualLeaveBalance", 0.0),
                comp_time_balance=user_doc.get("compTimeBalance", 0.0),
            )
            req_obj = LeaveRequest(
                id=saved["id"],
                user_id=saved.get("userId", ""),
                business_unit_id=saved.get("businessUnitId", ""),
                start_date=_date.fromisoformat(saved.get("startDate", "1970-01-01")),
                end_date=_date.fromisoformat(saved.get("endDate", "1970-01-01")),
                leave_type=LeaveStatus(saved.get("leaveType", "A")),
                status=LeaveStatus(saved.get("status", "A")),
                notes=saved.get("notes", ""),
            )
            try:
                await notify_employee_decision(req_obj, employee, payload.status)
            except Exception:  # noqa: BLE001 — notification must not block the response
                pass

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
