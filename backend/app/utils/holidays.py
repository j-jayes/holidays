"""Public holiday API client wrapping https://date.nager.at/api/v3."""

import httpx

from app.config import settings

SUPPORTED_COUNTRIES = {"SE", "PL"}


async def fetch_public_holidays(country_code: str, year: int) -> list[dict]:
    """
    Fetch public holidays from Nager.Date for the given country and year.

    Args:
        country_code: ISO 3166-1 alpha-2 country code, e.g. "SE" or "PL".
        year:         The calendar year, e.g. 2025.

    Returns:
        A list of holiday objects as returned by the Nager.Date API.
    """
    country_code = country_code.upper()
    if country_code not in SUPPORTED_COUNTRIES:
        raise ValueError(
            f"Country code '{country_code}' is not supported. "
            f"Supported codes: {', '.join(sorted(SUPPORTED_COUNTRIES))}"
        )

    url = f"{settings.public_holiday_api_base}/PublicHolidays/{year}/{country_code}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=10.0)
        response.raise_for_status()
        return response.json()
