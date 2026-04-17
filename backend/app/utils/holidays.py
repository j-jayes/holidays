"""Public holiday API client wrapping https://date.nager.at/api/v3.

Results are cached in-process for the lifetime of the container.
Public holidays are immutable once published for a given (country, year)
pair, so there is no need to ever invalidate the cache.
"""

import httpx

from app.config import settings

SUPPORTED_COUNTRIES = {"SE", "PL"}

# (country_code_upper, year) -> list[dict]
_CACHE: dict[tuple[str, int], list[dict]] = {}


async def fetch_public_holidays(country_code: str, year: int) -> list[dict]:
    """
    Fetch public holidays from Nager.Date for the given country and year.

    Results are cached in-process; Nager.Date is only called once per
    (country, year) pair for the lifetime of the container process.

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

    cache_key = (country_code, year)
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    url = f"{settings.public_holiday_api_base}/PublicHolidays/{year}/{country_code}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=10.0)
        response.raise_for_status()
        data: list[dict] = response.json()

    _CACHE[cache_key] = data
    return data
