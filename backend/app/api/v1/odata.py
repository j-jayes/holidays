"""OData v4 feed endpoints — Power Query / Get & Transform connector.

Exposes three endpoints that Excel's "Get Data → From OData Feed" requires:

  GET /api/v1/odata/            Service-root document (entity-set list)
  GET /api/v1/odata/$metadata   CSDL XML schema (column types)
  GET /api/v1/odata/LeaveRequests  Entity collection (pageable, filterable)

Usage in Excel (2016+ / Microsoft 365):
  Data → Get Data → From Other Sources → From OData Feed
  URL: https://<backend-host>/api/v1/odata/

Supported OData query options on /LeaveRequests:
  $top, $skip   — pagination
  $select       — comma-separated column names
  $orderby      — e.g. "employee_name asc,start_date desc"

NOTE: When MSAL integration is complete, authenticated OData requests will
carry a Bearer token (handled upstream by the auth middleware) and
email/displayName will be sourced from Entra ID claims rather than the
Users container.  No structural change to these endpoints is needed at that
point — only the _export_utils.fetch_enriched_rows() helper changes.
"""

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse, Response

from app.api.v1._export_utils import FIELDS, fetch_enriched_rows

router = APIRouter()

# ─── CSDL / $metadata ─────────────────────────────────────────────────────────

# Static CSDL XML describing the LeaveRequestRow entity type.
# Field types are aligned with what Power Query infers most usefully:
#   - Dates as Edm.Date   → Excel renders them as proper date columns
#   - Everything else as Edm.String
_METADATA_XML = """\
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="VacationTracker" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="LeaveRequestRow">
        <Key>
          <PropertyRef Name="request_id" />
        </Key>
        <Property Name="request_id"        Type="Edm.String" Nullable="false" />
        <Property Name="employee_email"    Type="Edm.String" />
        <Property Name="employee_name"     Type="Edm.String" />
        <Property Name="business_unit_id"  Type="Edm.String" />
        <Property Name="business_unit_name" Type="Edm.String" />
        <Property Name="start_date"        Type="Edm.Date" />
        <Property Name="end_date"          Type="Edm.Date" />
        <Property Name="leave_type"        Type="Edm.String" />
        <Property Name="leave_type_label"  Type="Edm.String" />
        <Property Name="status"            Type="Edm.String" />
        <Property Name="status_label"      Type="Edm.String" />
        <Property Name="notes"             Type="Edm.String" />
      </EntityType>
      <EntityContainer Name="Default">
        <EntitySet Name="LeaveRequests" EntityType="VacationTracker.LeaveRequestRow" />
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>"""


# ─── Service root ─────────────────────────────────────────────────────────────


@router.get(
    "/",
    summary="OData service root",
    response_description="OData v4 service document listing available entity sets.",
)
async def odata_service_root(request: Request) -> JSONResponse:
    """Return the OData v4 service document.

    Excel's Power Query wizard reads this to discover available entity sets.
    """
    base = str(request.base_url).rstrip("/")
    odata_base = f"{base}/api/v1/odata"
    return JSONResponse(
        content={
            "@odata.context": f"{odata_base}/$metadata",
            "value": [
                {
                    "name": "LeaveRequests",
                    "url": "LeaveRequests",
                    "kind": "EntitySet",
                },
            ],
        },
        headers={"OData-Version": "4.0"},
    )


# ─── $metadata ────────────────────────────────────────────────────────────────


@router.get(
    "/$metadata",
    summary="OData CSDL metadata document",
    response_description="CSDL XML describing the LeaveRequests entity type.",
)
async def odata_metadata() -> Response:
    """Return the CSDL XML schema consumed by Power Query to infer column types."""
    return Response(
        content=_METADATA_XML,
        media_type="application/xml",
        headers={"OData-Version": "4.0"},
    )


# ─── LeaveRequests entity set ─────────────────────────────────────────────────


@router.get(
    "/LeaveRequests",
    summary="OData LeaveRequests entity set",
    response_description="OData v4 JSON collection of all enriched leave requests.",
)
async def odata_leave_requests(
    request: Request,
    top: int | None = Query(None, alias="$top", ge=1, le=10_000),
    skip: int | None = Query(None, alias="$skip", ge=0),
    select: str | None = Query(None, alias="$select"),
    orderby: str | None = Query(None, alias="$orderby"),
) -> JSONResponse:
    """Return all leave requests as an OData v4 JSON entity collection.

    Supports a useful subset of OData system query options:
    - **$top** / **$skip** for pagination
    - **$select** to return only named columns (comma-separated)
    - **$orderby** for sorting, e.g. ``employee_name asc,start_date desc``

    All fields are strings in the FIELDS list except start_date / end_date
    which are YYYY-MM-DD ISO 8601 strings mapped to ``Edm.Date`` in $metadata.
    """
    rows = await fetch_enriched_rows()

    # ── $orderby ──────────────────────────────────────────────────────────────
    if orderby:
        sort_keys: list[tuple[str, bool]] = []
        for clause in orderby.split(","):
            parts = clause.strip().split()
            col = parts[0].strip()
            ascending = (len(parts) < 2) or (parts[1].lower() != "desc")
            if col in FIELDS:
                sort_keys.append((col, ascending))
        if sort_keys:
            # Apply in reverse so primary sort ends up on top
            for col, asc in reversed(sort_keys):
                rows.sort(key=lambda r, c=col: r.get(c, ""), reverse=not asc)

    # ── $skip / $top ──────────────────────────────────────────────────────────
    if skip:
        rows = rows[skip:]
    if top:
        rows = rows[:top]

    # ── $select ───────────────────────────────────────────────────────────────
    if select:
        wanted = {f.strip() for f in select.split(",") if f.strip() in FIELDS}
        rows = [{k: v for k, v in row.items() if k in wanted} for row in rows]

    base = str(request.base_url).rstrip("/")
    odata_context = f"{base}/api/v1/odata/$metadata#LeaveRequests"

    return JSONResponse(
        content={"@odata.context": odata_context, "value": rows},
        headers={"OData-Version": "4.0"},
    )
