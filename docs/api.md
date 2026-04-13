# API Reference

Base URL: `https://<backend-url>/api/v1`

Interactive docs: `https://<backend-url>/docs` (Swagger UI)

---

## Authentication

All endpoints (except `/health`) require a Bearer token obtained via Microsoft Entra ID.

```
Authorization: Bearer <access_token>
```

---

## Users

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET` | `/users/me` | Get current user's profile | Any |
| `GET` | `/users/{id}` | Get a user by ID | Manager, Admin |
| `POST` | `/users/` | Create a new user | Admin |

---

## Leave Requests

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET` | `/leave-requests/` | List leave requests (scoped by role) | Any |
| `POST` | `/leave-requests/` | Create a leave request | Employee |
| `GET` | `/leave-requests/{id}` | Get a single request | Any |
| `PATCH` | `/leave-requests/{id}` | Approve / deny a request | Manager, Admin |
| `DELETE` | `/leave-requests/{id}` | Cancel a pending request | Employee (own only) |

### Leave Request Status Codes

| Code | Meaning |
|------|---------|
| `A` | Requested — awaiting approval |
| `B` | Approved — official vacation |
| `FL` | Parental Leave (*Föräldraledighet*) |
| `C` | Comp Time (*Kompis*) |

---

## Business Units

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET` | `/business-units/` | List all business units | Any |

---

## Public Holidays

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| `GET` | `/public-holidays/{country}/{year}` | Fetch public holidays | Any |

Supported country codes: `SE` (Sweden), `PL` (Poland).

Data sourced from [Nager.Date](https://date.nager.at/).

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
