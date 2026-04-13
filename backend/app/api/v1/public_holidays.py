"""Public holiday proxy endpoints — wraps the Nager.Date API."""

from fastapi import APIRouter, Depends

from app.auth.entra import get_current_user
from app.utils.holidays import fetch_public_holidays

router = APIRouter()


@router.get("/{country_code}/{year}")
async def get_public_holidays(
    country_code: str,
    year: int,
    current_user: dict = Depends(get_current_user),
) -> list[dict]:
    """
    Return public holidays for a given country and year.

    Supported country codes: SE (Sweden), PL (Poland).
    Data sourced from https://date.nager.at/api/v3/PublicHolidays/{year}/{countryCode}
    """
    return await fetch_public_holidays(country_code=country_code, year=year)
