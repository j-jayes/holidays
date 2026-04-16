"""Business unit endpoints."""

from fastapi import APIRouter

from app.db.cosmos import list_items, BUSINESS_UNITS_CONTAINER
from app.schemas.business_unit import BusinessUnitRead

router = APIRouter()


@router.get("/", response_model=list[BusinessUnitRead])
async def list_business_units() -> list[BusinessUnitRead]:
    """List all business units and their assigned managers."""
    items = await list_items(BUSINESS_UNITS_CONTAINER)
    return [
        BusinessUnitRead(
            id=item["id"],
            name=item.get("name", ""),
            managerUserId=item.get("managerUserId", ""),
        )
        for item in items
    ]
