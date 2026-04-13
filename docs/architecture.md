# Architecture Decisions

## Overview

The Team Vacation Tracker follows a classic **frontend / backend / database** separation, deployed as containers on Azure Container Apps.

## Key Decisions

### Why FastAPI?
- Native async support for non-blocking I/O (Cosmos DB, email, external APIs).
- Automatic OpenAPI/Swagger docs generation.
- Python ecosystem makes integration with data tooling (pandas, openpyxl) straightforward for the legacy migration script.

### Why React + TypeScript?
- Component-based architecture simplifies building the interactive calendar.
- TypeScript provides end-to-end type safety, reducing runtime errors.
- Large ecosystem: MSAL React for Entra ID, react-router for navigation.

### Why Cosmos DB (Serverless)?
- Schema-flexible NoSQL suits the evolving data model during early sprints.
- Serverless Free Tier keeps costs at zero for low traffic.
- Built-in Continuous Backup / PITR meets the backup requirement with no additional setup.

### Why Azure Container Apps?
- Fully managed; no Kubernetes cluster to maintain.
- Scales to zero, minimising cost for an internal tool.
- Integrated with Azure Managed Identity for secret-free Cosmos DB access.

### Why Microsoft Entra ID (SSO)?
- Employees already have company accounts — zero registration friction.
- MSAL handles token refresh automatically on the frontend.
- Backend validates JWT tokens from Entra, extracting roles assigned in the Azure AD app registration.

## Data Model

### Users Container
```json
{
  "id": "uuid",
  "email": "alice@company.com",
  "displayName": "Alice Svensson",
  "role": "Employee | Manager | Admin",
  "businessUnitId": "bu-malmo",
  "entraOid": "<azure-ad-object-id>",
  "annualLeaveBalance": 25,
  "compTimeBalance": 8
}
```

### LeaveRequests Container
```json
{
  "id": "uuid",
  "userId": "uuid",
  "businessUnitId": "bu-malmo",
  "startDate": "2025-07-14",
  "endDate": "2025-07-18",
  "leaveType": "A | B | FL | C",
  "status": "A | B | FL | C",
  "notes": "Summer holiday"
}
```

### BusinessUnits Container
```json
{
  "id": "bu-malmo",
  "name": "CU Malmö",
  "managerUserId": "uuid"
}
```

## Leave Status State Machine

```
[Employee creates request]
        │
        ▼
    Status = A (Requested)
        │
        ├─── Manager Approves ──► Status = B (Approved)
        │
        └─── Manager Denies / Employee Cancels ──► Deleted
```
