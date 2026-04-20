"""Shared data-enrichment helper for exports and OData endpoints.

Extracted from exports.py so that odata.py can reuse the same join logic
without coupling the two router modules to each other.
"""

import asyncio

from app.db.cosmos import (
    BUSINESS_UNITS_CONTAINER,
    LEAVE_REQUESTS_CONTAINER,
    USERS_CONTAINER,
    list_items,
)

# ─── Human-readable label maps ────────────────────────────────────────────────

LEAVE_TYPE_LABELS: dict[str, str] = {
    "A": "Requested",
    "B": "Approved",
    "FL": "Parental Leave",
    "C": "Comp Time",
}

STATUS_LABELS: dict[str, str] = LEAVE_TYPE_LABELS  # same codeset

# ─── Canonical column order ───────────────────────────────────────────────────

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


# ─── Public API ───────────────────────────────────────────────────────────────


async def fetch_enriched_rows() -> list[dict]:
    """Join leave-requests with users and business-units.

    Returns a list of flat dicts in FIELDS column order.
    Unique employee identifier is email (not UUID).
    Dates are ISO 8601 strings (YYYY-MM-DD) as stored in Cosmos.

    NOTE: When MSAL integration is complete, email/displayName will be sourced
    directly from the Entra ID token claims rather than the Users container,
    removing the need for a separate user lookup here.
    """
    leave_items, user_items = await asyncio.gather(
        list_items(LEAVE_REQUESTS_CONTAINER),
        list_items(USERS_CONTAINER),
    )

    user_by_id: dict[str, dict] = {u["id"]: u for u in user_items}

    bu_ids_needed: set[str] = {item.get("businessUnitId", "") for item in leave_items}
    bu_by_id = await _fetch_business_units(bu_ids_needed)

    rows: list[dict] = []
    for item in leave_items:
        user = user_by_id.get(item.get("userId", ""), {})
        bu_id = item.get("businessUnitId", "")
        bu = bu_by_id.get(bu_id, {})
        leave_type = item.get("leaveType", "")
        status_val = item.get("status", "")

        rows.append({
            "request_id": item.get("id", ""),
            "employee_email": user.get("email", ""),
            "employee_name": user.get("displayName", ""),
            "business_unit_id": bu_id,
            "business_unit_name": bu.get("name", ""),
            "start_date": item.get("startDate", ""),
            "end_date": item.get("endDate", ""),
            "leave_type": leave_type,
            "leave_type_label": LEAVE_TYPE_LABELS.get(leave_type, leave_type),
            "status": status_val,
            "status_label": STATUS_LABELS.get(status_val, status_val),
            "notes": item.get("notes", ""),
        })

    rows.sort(key=lambda r: (r["employee_email"], r["start_date"]))
    return rows


async def _fetch_business_units(bu_ids: set[str]) -> dict[str, dict]:
    try:
        bu_items = await list_items(BUSINESS_UNITS_CONTAINER)
        return {bu["id"]: bu for bu in bu_items}
    except Exception:  # noqa: BLE001
        return {}
