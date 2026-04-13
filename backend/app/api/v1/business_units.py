"""Business unit endpoints."""

from fastapi import APIRouter, Depends

from app.auth.entra import get_current_user
from app.schemas.business_unit import BusinessUnitRead

router = APIRouter()


@router.get("/", response_model=list[BusinessUnitRead])
async def list_business_units(
    current_user: dict = Depends(get_current_user),
) -> list[BusinessUnitRead]:
    """List all business units and their assigned managers."""
    # TODO: implement
    raise NotImplementedError
