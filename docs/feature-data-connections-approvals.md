# Feature Spec — Data Connections Tab, Approvals UX & Power Query Connector

**Sprint:** 7  
**Date:** 2026-04-20

---

## Overview

Three coordinated improvements targeting manager productivity and data access:

1. **Power Query OData connector** — backend endpoint that exposes live enriched data to Excel's "Get & Transform" feature.
2. **Data Connections tab** — dedicated UI for all exports and the new connector; moved out of the Approvals tab.
3. **Approvals UX overhaul** — pending requests grouped by Business Unit in separate columns; scrollable "Recent Decisions" strip with one-click undo.

---

## 1. Backend — OData v4 Endpoint

### Goal

Allow Excel users to import live leave-request data via **Data → Get Data → From OData Feed** (Power Query / Get & Transform) without any additional middleware.

### New file: `backend/app/api/v1/odata.py`

OData v4 is the format Excel natively recognises; three endpoints are required:

| Endpoint | Returns | Purpose |
|---|---|---|
| `GET /api/v1/odata/` | JSON service root document | Lists available entity sets |
| `GET /api/v1/odata/$metadata` | CSDL XML | Schema that Excel parses to infer column types |
| `GET /api/v1/odata/LeaveRequests` | JSON `{ "@odata.context": "...", "value": [...] }` | Entity collection |

**Service root response:**
```json
{
  "@odata.context": "https://<host>/api/v1/odata/$metadata",
  "value": [{ "name": "LeaveRequests", "url": "LeaveRequests", "kind": "EntitySet" }]
}
```

**CSDL `$metadata` (XML):** defines `LeaveRequestRow` with the 12 fields from `FIELDS` in `exports.py`, all typed as `Edm.String` except `start_date`/`end_date` (`Edm.Date`) and `request_id` as the entity key.

**Entity response (`LeaveRequests`):** same rows as `leave-requests.json`, wrapped in the OData envelope. Support basic query options:
- `$top` / `$skip` for pagination
- `$select` to return only named columns
- `$orderby` for sorting (default: `employee_email,start_date`)

### Shared helper

Extract `_fetch_enriched_rows()` from `exports.py` into `backend/app/api/v1/_export_utils.py` so both `exports.py` and `odata.py` can import it without duplication.

### Registration

```python
# backend/app/main.py
from app.api.v1 import odata
app.include_router(odata.router, prefix="/api/v1/odata", tags=["odata"])
```

### Connection instructions for users

> **Excel step-by-step:**  
> 1. Data → Get Data → From Other Sources → From OData Feed  
> 2. Paste: `https://ca-holidays-backend.nicegrass-38567ece.northeurope.azurecontainerapps.io/api/v1/odata`  
> 3. Select the `LeaveRequests` table → Load or Transform  
> 4. Refresh any time with **Data → Refresh All**

---

## 2. Frontend — "Data Connections" Tab

### New tab in `Dashboard.tsx`

Add a third tab to the `TABS` constant:

```ts
{ key: "data", label: "📊 Data" }
```

Full tab list: `[ Team Calendar ] [ Approvals (N) ] [ 📊 Data ]`

### Shortcut button in header (top-right)

Place a small pill button **outside** the tab-nav, on the right side of the header, that jumps straight to the data tab from anywhere:

```tsx
<button
  onClick={() => setTab("data")}
  className="ml-auto px-3 py-1.5 rounded-lg bg-nexer-light-blue text-nexer-blue text-xs font-semibold hover:bg-nexer-blue hover:text-white transition-colors"
>
  📊 Data Connections
</button>
```

Positioned between the app title and the tab-nav pill, so it doesn't crowd the nav.

### New component: `frontend/src/components/DataConnections/DataConnections.tsx`

Three sections, stacked vertically:

#### 2a. Download Exports

Moved verbatim from `ManagerDashboard`; remove the original export section there. Cards:

| Icon | Label | Description | Endpoint |
|---|---|---|---|
| 📊 | CSV — Tidy Data | Flat table, one row per request. Opens directly in Excel. | `/api/v1/exports/leave-requests.csv` |
| `{ }` | JSON | Machine-readable array, same enriched fields as the CSV. | `/api/v1/exports/leave-requests.json` |
| 🔗 | Excel Live Link (.iqy) | Open once in Excel — then use Data → Refresh All. | `/api/v1/exports/leave-requests.iqy` |

#### 2b. Power Query — Get & Transform

New card with title "🔌 Power Query (Get & Transform)".

Content:
- Brief description: "Connect Excel directly to live data. Updates whenever you Refresh All — no re-downloading needed."
- Read-only URL input showing the OData feed URL, with a **Copy** button (uses `navigator.clipboard.writeText`).
- Step-by-step numbered instructions (see §1 above).
- Subtle note: "Use **Data → Get Data → From OData Feed** in Excel 2016 or later / Microsoft 365."

---

## 3. Frontend — Approvals: Multi-Column by Business Unit

### What changes

`ManagerDashboard` currently renders all pending requests in a 2-column responsive grid.  
New layout: **one column per Business Unit**, with the BU name as a column header.

### Prop change

```ts
// Before
interface Props { pendingRequests, users, onUpdate }

// After
interface Props { pendingRequests, users, businessUnits, onUpdate }
```

`Dashboard.tsx` already holds `businessUnits` in state — pass it down:

```tsx
<ManagerDashboard
  pendingRequests={pendingRequests}
  users={users}
  businessUnits={businessUnits}   // new
  onUpdate={reloadLeave}
/>
```

### Column layout

```tsx
const buColumns = businessUnits.map((bu) => ({
  ...bu,
  requests: pendingRequests.filter((r) => r.businessUnitId === bu.id),
}));
```

Render as a horizontal scroll container (on small screens) or CSS grid with `grid-cols-{n}` matching the BU count:

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  Nordic          │  Baltic          │  Finance         │  Tech            │
│  (2 pending)     │  (0 pending)     │  (1 pending)     │  (3 pending)     │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ [card]           │ — none —         │ [card]           │ [card]           │
│ [card]           │                  │                  │ [card]           │
│                  │                  │                  │ [card]           │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

Empty columns show a small italic "No pending requests" placeholder rather than collapsing, so managers can tell at a glance that a BU is clear.

---

## 4. Frontend — Approvals: Recent Decisions + Undo

### State

```ts
interface Decision {
  requestId: string;
  requestSnapshot: LeaveRequest; // copy at time of action
  userName: string;
  action: "approved" | "denied";
  decidedAt: number; // Date.now()
}

const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);
```

Populate inside `handle()` **before** calling the API (so the snapshot is the pre-action state). Cap at 20 items; drop items older than 2 hours.

### Undo action

```ts
const handleUndo = async (decision: Decision) => {
  await leaveRequestsApi.update(decision.requestId, { status: "A" });
  setRecentDecisions((prev) => prev.filter((d) => d.requestId !== decision.requestId));
  onUpdate();
  toast.success("Decision reversed — request is pending again");
};
```

`status: "A"` is a valid `LeaveStatus` value and `LeaveRequestUpdate` accepts it — no backend change required.

### UI

Placed below the BU columns, inside a collapsible section:

```
Recent Decisions                          [v collapse]
┌──────────────────────────────────────────────────────────────────┐
│ horizontal scroll of cards (max ~4 visible, overflow-x-auto)     │
│                                                                  │
│ ┌────────────────────────────┐  ┌────────────────────────────┐  │
│ │ [JD] Jane Doe              │  │ [MS] Martin S.             │  │
│ │ Apr 15 – Apr 19  ✓ Approved│  │ Apr 22 – Apr 23  ✗ Denied │  │
│ │                 [Undo]     │  │                   [Undo]   │  │
│ └────────────────────────────┘  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

Cards use green (`bg-green-50`) for approved and muted red (`bg-red-50`) for denied. The **Undo** button is small and tertiary-styled.

---

## 5. Additional Functionality Worth Adding

These are not in Sprint 7 scope but are natural follow-ons — each could be a separate small sprint or task:

### High priority

| Feature | Why | Effort |
|---|---|---|
| **Leave balance on approval card** | Manager sees remaining days (`annualLeaveBalance`) before approving — avoids over-approving | S |
| **Coverage / conflict warning** | Inline badge on a card if approving would leave a BU with fewer than N people available that week | M |
| **Mandatory denial reason modal** | Currently `cancel` (DELETE) discards context; force a short reason stored in `notes` | S |
| **Pending age badge** | Cards older than 3 days show "waiting N days" in amber | XS |
| **Date range filter on exports** | `?from=&to=` query params on CSV/JSON/OData so managers can export a single year or quarter | S |

### Medium priority

| Feature | Why | Effort |
|---|---|---|
| **Employee status view** | Employees can see whether their own request is pending / approved / denied in the calendar without asking their manager | M |
| **Bulk approve** | Checkbox multi-select + "Approve selected" — high ROI at month-start when many requests land at once | M |
| **iCal export** | Download `.ics` for approved leave, addable to Outlook/Google Calendar | S |
| **Email notification to employee** | Notify employee when their request is approved or denied (ACS/SendGrid already wired) | S |
| **Power Automate webhook** | `POST /api/v1/webhooks/leave-status-changed` so managers can trigger Teams alerts or downstream flows | M |

### Nice to have

| Feature | Why | Effort |
|---|---|---|
| **Annual utilisation chart** | Bar chart (days used / allocated) per BU — shown in Data Connections as a live preview | L |
| **Delegation** | Manager can temporarily hand approvals to a deputy while on leave | L |
| **Headcount widget on calendar** | "N people on leave this week" bubble per BU, visible from the calendar tab | M |
| **Manager comment separate from employee notes** | Manager can leave an internal note that doesn't show to the employee | S |

---

## Technical Checklist

### Backend
- [ ] Extract `_fetch_enriched_rows()` → `backend/app/api/v1/_export_utils.py`
- [ ] Create `backend/app/api/v1/odata.py` (service root, $metadata, LeaveRequests collection)
- [ ] Register OData router in `backend/app/main.py`
- [ ] Verify `PATCH /api/v1/leave-requests/:id` accepts `{ "status": "A" }` for undo (no schema change expected)

### Frontend
- [ ] Add `"data"` tab to `TABS` in `Dashboard.tsx`
- [ ] Add "📊 Data Connections" shortcut button in header
- [ ] Create `frontend/src/components/DataConnections/DataConnections.tsx`
- [ ] Remove export section from `ManagerDashboard.tsx`
- [ ] Add `businessUnits` prop to `ManagerDashboard`; pass from `Dashboard.tsx`
- [ ] Refactor pending requests grid → BU column layout
- [ ] Add `recentDecisions` state + `handleUndo()` to `ManagerDashboard`
- [ ] Render "Recent Decisions" horizontal scroll strip

---

## Data Flow Diagram

```
Excel / Power Query
  └─ GET /api/v1/odata/$metadata  ──────────────────────┐
  └─ GET /api/v1/odata/LeaveRequests?$top=1000           │
                                                         ▼
Backend (/api/v1/odata/)                    _fetch_enriched_rows()
  ├─ joins LeaveRequests (Cosmos)                        │
  ├─ joins Users (Cosmos)                                │
  └─ joins BusinessUnits (Cosmos)  ◄─────────────────────┘

Frontend (DataConnections tab)
  └─ Shows OData URL + copy button
  └─ Step-by-step Excel instructions
  └─ CSV / JSON download links
```
