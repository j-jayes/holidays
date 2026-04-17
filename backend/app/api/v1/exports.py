"""Manager data-export endpoints.

Three formats are provided:
- CSV  (tidy data, flat, email as unique identifier)
- JSON (same shape, downloadable)
- IQY  (Excel Web Query live-link pointing at the CSV endpoint)

All three endpoints join leave-requests → users → business-units so the
consumer receives a fully enriched, human-readable table with no raw UUIDs.
ISO 8601 date strings are used throughout.
"""

import asyncio
import csv
import io
import json

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.db.cosmos import (
    BUSINESS_UNITS_CONTAINER,
    LEAVE_REQUESTS_CONTAINER,
    USERS_CONTAINER,
    list_items,
)

router = APIRouter()

# ─── Human-readable label maps ────────────────────────────────────────────────

LEAVE_TYPE_LABELS: dict[str, str] = {
    "A": "Requested",
    "B": "Approved",
    "FL": "Parental Leave",
    "C": "Comp Time",
}

STATUS_LABELS: dict[str, str] = LEAVE_TYPE_LABELS  # same codeset

# ─── Column order for the tidy CSV / JSON ─────────────────────────────────────

FIELDS = [
    "request_id",
    "employee_email",
    "employee_name",
    "business_unit_id",
    "business_unit_name",
    "start_date",
    "end_date",
    "leave_type",
    "leave_type_label",
    "status",
    "status_label",
    "notes",
]


# ─── Internal helpers ─────────────────────────────────────────────────────────


async def _fetch_enriched_rows() -> list[dict]:
    """Join leave-requests with users and business-units.

    Returns a list of flat dicts in FIELDS column order.
    Unique employee identifier is email (not UUID).
    Dates are ISO 8601 strings (YYYY-MM-DD) as stored in Cosmos.
    """
    leave_items, user_items = await _fetch_leave_and_users()

    # Build lookup maps from Cosmos documents
    user_by_id: dict[str, dict] = {u["id"]: u for u in user_items}

    # Collect all businessUnitIds referenced in the leave requests
    bu_ids_needed = {item.get("businessUnitId", "") for item in leave_items}
    bu_by_id = await _fetch_business_units(bu_ids_needed)

    rows: list[dict] = []
    for item in leave_items:
        user = user_by_id.get(item.get("userId", ""), {})
        bu_id = item.get("businessUnitId", "")
        bu = bu_by_id.get(bu_id, {})

        leave_type = item.get("leaveType", "")
        status = item.get("status", "")

        row = {
            "request_id": item.get("id", ""),
            "employee_email": user.get("email", ""),
            "employee_name": user.get("displayName", ""),
            "business_unit_id": bu_id,
            "business_unit_name": bu.get("name", ""),
            "start_date": item.get("startDate", ""),
            "end_date": item.get("endDate", ""),
            "leave_type": leave_type,
            "leave_type_label": LEAVE_TYPE_LABELS.get(leave_type, leave_type),
            "status": status,
            "status_label": STATUS_LABELS.get(status, status),
            "notes": item.get("notes", ""),
        }
        rows.append(row)

    # Sort for stable output: employee email, then start date
    rows.sort(key=lambda r: (r["employee_email"], r["start_date"]))
    return rows


async def _fetch_leave_and_users() -> tuple[list[dict], list[dict]]:
    leave_items, user_items = await asyncio.gather(
        list_items(LEAVE_REQUESTS_CONTAINER),
        list_items(USERS_CONTAINER),
    )
    return leave_items, user_items


async def _fetch_business_units(bu_ids: set[str]) -> dict[str, dict]:
    """Fetch business units.  Falls back gracefully if the constant is missing."""
    try:
        bu_items = await list_items(BUSINESS_UNITS_CONTAINER)
        return {bu["id"]: bu for bu in bu_items}
    except Exception:  # noqa: BLE001
        return {}


# ─── CSV endpoint ─────────────────────────────────────────────────────────────


@router.get(
    "/leave-requests.csv",
    summary="Download all leave requests as tidy-data CSV",
    response_description="CSV file with one row per leave request, enriched with employee and business-unit details.",
)
async def export_csv() -> StreamingResponse:
    """Return all leave requests as a flat tidy-data CSV.

    Each row is one leave request.  The employee's *email* is used as the
    unique human identifier.  All dates are ISO 8601 (YYYY-MM-DD).
    """
    rows = await _fetch_enriched_rows()

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=FIELDS, lineterminator="\r\n")
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="leave-requests.csv"'},
    )


# ─── JSON endpoint ────────────────────────────────────────────────────────────


@router.get(
    "/leave-requests.json",
    summary="Download all leave requests as JSON",
    response_description="JSON array with one object per leave request, enriched with employee and business-unit details.",
)
async def export_json() -> JSONResponse:
    """Return all leave requests as a downloadable JSON array.

    Same enriched, flat shape as the CSV export.  Dates are ISO 8601.
    """
    rows = await _fetch_enriched_rows()
    content = json.dumps(rows, ensure_ascii=False, indent=2)
    return JSONResponse(
        content=rows,
        headers={"Content-Disposition": 'attachment; filename="leave-requests.json"'},
    )


# ─── IQY (Excel Web Query) endpoint ──────────────────────────────────────────


@router.get(
    "/leave-requests.iqy",
    summary="Download an Excel Web Query (.iqy) live-link file",
    response_description=".iqy file that, when opened in Excel, imports the CSV and supports one-click Refresh.",
)
async def export_iqy(request: Request) -> StreamingResponse:
    """Return an Excel Web Query file pointing at the CSV export endpoint.

    Opening the .iqy file in Excel imports the leave-request data immediately.
    The manager can then press Data → Refresh All to pull the latest data at
    any time without re-downloading the file.

    The absolute CSV URL is derived from the incoming request's base URL so
    that the link is correct in every deployment environment (local, staging,
    production, custom domain, HTTPS-terminated proxy, etc.).
    """
    # Strip trailing slash from base_url so we don't get double slashes
    base = str(request.base_url).rstrip("/")
    csv_url = f"{base}/api/v1/exports/leave-requests.csv"

    # Classic Excel Web Query format:
    #   Line 1: WEB
    #   Line 2: 1  (version)
    #   Line 3: <URL>
    #   Line 4: (blank — required by Excel)
    iqy_content = f"WEB\n1\n{csv_url}\n\n"

    return StreamingResponse(
        iter([iqy_content]),
        media_type="text/x-ms-iqy",
        headers={"Content-Disposition": 'attachment; filename="leave-requests.iqy"'},
    )
