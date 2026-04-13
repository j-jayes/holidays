# Agile Sprint Plan

## Sprint 1 — Infrastructure & Authentication (Weeks 1–2)

**Goal:** The team can log in and a working deployment pipeline exists.

| Task | Owner | Status |
|------|-------|--------|
| Provision Azure Container Apps environment | DevOps | 🔲 |
| Provision Cosmos DB Serverless (Free Tier) | DevOps | 🔲 |
| Set up GitHub Actions CI/CD (`.github/workflows/`) | DevOps | 🔲 |
| Initialise FastAPI project skeleton | Backend | ✅ |
| Initialise React + TypeScript project skeleton | Frontend | ✅ |
| Implement Entra ID auth on backend (`/app/auth/entra.py`) | Backend | 🔲 |
| Implement MSAL login on frontend (`/src/auth/msalConfig.ts`) | Frontend | 🔲 |

---

## Sprint 2 — Database Schema & Legacy Import (Weeks 3–4)

**Goal:** Historical data is available in Cosmos DB; basic CRUD works.

| Task | Owner | Status |
|------|-------|--------|
| Finalise Cosmos DB schemas (Users, LeaveRequests, BusinessUnits) | Backend | 🔲 |
| Write migration script (`scripts/migrate_legacy_data.py`) | Backend | ✅ |
| Write seed script (`scripts/seed_db.py`) | Backend | ✅ |
| Implement `GET/POST /api/v1/users` | Backend | 🔲 |
| Implement `GET/POST/PATCH/DELETE /api/v1/leave-requests` | Backend | 🔲 |

---

## Sprint 3 — Frontend Calendar & Public Holidays (Weeks 5–6)

**Goal:** Employees can see their calendar with red public holidays.

| Task | Owner | Status |
|------|-------|--------|
| Build `Calendar` component | Frontend | ✅ |
| Integrate Nager.Date API via `usePublicHolidays` hook | Frontend | ✅ |
| Connect calendar to backend leave requests | Frontend | 🔲 |

---

## Sprint 4 — Request Workflow & Team View (Weeks 7–8)

**Goal:** Employees can request leave; managers see pending requests.

| Task | Owner | Status |
|------|-------|--------|
| Implement drag-to-select date range in `Calendar` | Frontend | ✅ (skeleton) |
| Build `TeamView` component | Frontend | ✅ |
| Backend: set new requests to status `A` | Backend | 🔲 |

---

## Sprint 5 — Notifications & Manager Approvals (Weeks 9–10)

**Goal:** Managers receive emails and can approve/deny via the dashboard.

| Task | Owner | Status |
|------|-------|--------|
| Configure ACS / SendGrid email provider | Backend | 🔲 |
| Implement `notify_manager()` in `services/notifications.py` | Backend | ✅ (skeleton) |
| Build `ManagerDashboard` component | Frontend | ✅ |
| Wire up approve/deny API calls | Frontend | ✅ |

---

## Sprint 6 — Polish, UAT & Launch (Weeks 11–12)

**Goal:** Production-ready, user-tested, fully deployed.

| Task | Owner | Status |
|------|-------|--------|
| Enable Cosmos DB PITR in Bicep (`infra/main.bicep`) | DevOps | ✅ |
| UI/UX polish (loading states, error boundaries) | Frontend | 🔲 |
| User Acceptance Testing (UAT) | QA / All | 🔲 |
| Final deployment and rollout | DevOps | 🔲 |
