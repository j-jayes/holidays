"""Leave request CRUD endpoints."""

from fastapi import APIRouter, Depends, Path

from app.auth.entra import get_current_user
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestRead, LeaveRequestUpdate

router = APIRouter()


@router.get("/", response_model=list[LeaveRequestRead])
async def list_leave_requests(
    current_user: dict = Depends(get_current_user),
) -> list[LeaveRequestRead]:
    """List all leave requests visible to the current user."""
    # TODO: filter by role (employee sees own, manager sees team, admin sees all)
    raise NotImplementedError


@router.post("/", response_model=LeaveRequestRead, status_code=201)
async def create_leave_request(
    payload: LeaveRequestCreate,
    current_user: dict = Depends(get_current_user),
) -> LeaveRequestRead:
    """
    Create a new leave request (status defaults to 'A' — Requested).

    Triggers an email notification to the responsible manager.
    """
    # TODO: persist to Cosmos DB, then call notifications.notify_manager()
    raise NotImplementedError


@router.get("/{request_id}", response_model=LeaveRequestRead)
async def get_leave_request(
    request_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
) -> LeaveRequestRead:
    """Return a single leave request by ID."""
    # TODO: implement
    raise NotImplementedError


@router.patch("/{request_id}", response_model=LeaveRequestRead)
async def update_leave_request(
    payload: LeaveRequestUpdate,
    request_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
) -> LeaveRequestRead:
    """
    Update a leave request (e.g., manager approves → status 'B').

    Only the assigned manager or admin may change the status.
    """
    # TODO: implement
    raise NotImplementedError


@router.delete("/{request_id}", status_code=204)
async def cancel_leave_request(
    request_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
) -> None:
    """Cancel a *pending* leave request (employee cancels own request only)."""
    # TODO: implement
    raise NotImplementedError
