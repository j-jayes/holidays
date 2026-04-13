# Team Vacation Tracker

A modern web application to replace a manual Excel-based vacation tracking system. Built with React (frontend), FastAPI (backend), and Azure Cosmos DB, hosted on Azure Container Apps with Microsoft Entra ID authentication.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Repository Structure](#3-repository-structure)
4. [Getting Started](#4-getting-started)
5. [Core Features](#5-core-features)
6. [Leave Categories](#6-leave-categories)
7. [Roles & Permissions](#7-roles--permissions)
8. [Workflow & Notifications](#8-workflow--notifications)
9. [Agile Sprint Plan](#9-agile-sprint-plan)
10. [Contributing](#10-contributing)

---

## 1. Project Overview

This application replaces a complex, manual Excel-based vacation tracking system with a modern, scalable web application. It streamlines the leave request process, automates manager approvals via email workflows, provides transparent team availability, and reduces administrative overhead.

---

## 2. Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React (TypeScript) — component-based, highly responsive UI |
| **Backend** | FastAPI (Python) — async REST APIs |
| **Database** | Azure Cosmos DB (Serverless Free Tier), NoSQL or PostgreSQL API |
| **Hosting** | Azure Container Apps (serverless containers) |
| **Authentication** | Microsoft Entra ID (Single Sign-On) |
| **Email Service** | Azure Communication Services (or SendGrid) |
| **Backups** | Cosmos DB Continuous Backup (Point-in-Time Restore) |
| **CI/CD** | GitHub Actions |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Azure Container Apps                │
│  ┌──────────────┐          ┌──────────────────────┐ │
│  │  React App   │ <──────> │  FastAPI Backend     │ │
│  │  (Frontend)  │  REST    │  (Backend)           │ │
│  └──────────────┘          └──────────┬───────────┘ │
│                                       │             │
│                             ┌─────────▼──────────┐  │
│                             │  Azure Cosmos DB   │  │
│                             └────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
  Microsoft Entra ID       Azure Communication Services
  (Authentication)         (Email Notifications)
```

---

## 3. Repository Structure

```
holidays/
├── README.md                        # This file
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci-backend.yml           # Backend lint, test, build
│       └── ci-frontend.yml          # Frontend lint, test, build
│
├── backend/                         # FastAPI Python application
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── config.py                # Settings / environment variables
│   │   ├── auth/
│   │   │   └── entra.py             # Microsoft Entra ID integration
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── users.py         # User endpoints
│   │   │       ├── leave_requests.py# Leave request CRUD endpoints
│   │   │       ├── business_units.py# Business unit endpoints
│   │   │       └── public_holidays.py # Public holiday proxy endpoints
│   │   ├── core/
│   │   │   └── dependencies.py     # Shared FastAPI dependencies
│   │   ├── db/
│   │   │   └── cosmos.py           # Cosmos DB client & helpers
│   │   ├── models/
│   │   │   ├── user.py             # User domain model
│   │   │   ├── leave_request.py    # LeaveRequest domain model
│   │   │   └── business_unit.py    # BusinessUnit domain model
│   │   ├── schemas/
│   │   │   ├── user.py             # Pydantic request/response schemas
│   │   │   ├── leave_request.py
│   │   │   └── business_unit.py
│   │   ├── services/
│   │   │   ├── email.py            # Email sending via ACS / SendGrid
│   │   │   └── notifications.py    # Notification trigger logic
│   │   └── utils/
│   │       └── holidays.py         # Public holiday API client (Nager.Date)
│   └── tests/
│       ├── conftest.py
│       └── test_leave_requests.py
│
├── frontend/                        # React TypeScript application
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.tsx                # App entry point
│       ├── App.tsx                  # Root component + routing
│       ├── api/
│       │   ├── client.ts           # Axios/fetch base client
│       │   └── leaveRequests.ts    # Leave request API calls
│       ├── auth/
│       │   └── msalConfig.ts       # MSAL (Entra ID) configuration
│       ├── components/
│       │   ├── Calendar/
│       │   │   ├── Calendar.tsx    # Interactive calendar component
│       │   │   └── Calendar.css
│       │   ├── TeamView/
│       │   │   └── TeamView.tsx    # Read-only team calendar
│       │   └── ManagerDashboard/
│       │       └── ManagerDashboard.tsx # Approval dashboard
│       ├── hooks/
│       │   └── usePublicHolidays.ts # Hook to fetch public holidays
│       ├── pages/
│       │   ├── Home.tsx
│       │   └── Dashboard.tsx
│       └── types/
│           └── index.ts            # Shared TypeScript types
│
├── scripts/
│   ├── migrate_legacy_data.py       # One-time Excel → Cosmos DB migration
│   └── seed_db.py                   # Seed database with test data
│
├── infra/
│   ├── main.bicep                   # Azure Bicep IaC for all resources
│   └── README.md                    # Infrastructure deployment guide
│
└── docs/
    ├── architecture.md              # Detailed architecture decisions
    ├── api.md                       # API reference
    └── sprint-plan.md               # Agile sprint breakdown
```

---

## 4. Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- Azure CLI (for infrastructure provisioning)

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Fill in your environment variables
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`

### Frontend (React)

```bash
cd frontend
npm install
cp .env.example .env.local       # Fill in your environment variables
npm run dev
```

App available at `http://localhost:5173`

### Running with Docker Compose

```bash
docker compose up --build
```

### Running Tests

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

---

## 5. Core Features

### Interactive Calendar View
- Full-page calendar UI for viewing the current month and year.
- **Drag-and-Drop / Multi-Select:** Click and drag across multiple days to bulk-request leave.
- **Public Holiday Integration:** Automatically fetches Swedish (and eventually Polish) public holidays via the [Nager.Date API](https://date.nager.at/). These days are pre-colored red to prevent employees from wasting vacation days.
- **Team View:** A toggleable read-only calendar showing colleagues' approved leaves to ensure adequate project coverage.

### Leave Request Workflow
1. Employee selects date range and leave type on the calendar.
2. A `POST /api/v1/leave-requests` call creates the request with status `A` (Requested).
3. FastAPI triggers an email to the assigned manager with a magic link to the approval dashboard.
4. Manager approves or denies the request via the Manager Dashboard.
5. Employee receives a confirmation email.

---

## 6. Leave Categories

| Code | Description |
|------|-------------|
| `A` | Requested — pending manager approval |
| `B` | Approved — official vacation |
| `FL` | Parental Leave (*Föräldraledighet*) |
| `C` | Comp time (*Kompis* / free comp hours) |

---

## 7. Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Employee** | View team calendar; request leave; cancel own *pending* requests |
| **Manager** | View department requests; approve/deny leaves; view historical team data |
| **Admin** | Manually adjust balances; assign managers; manage system settings |

---

## 8. Workflow & Notifications

### Automated Manager Routing (by Business Unit)

| Business Unit | Manager |
|---|---|
| CU Malmö | Rasmus Bodin Löfgren |
| CU Göteborg | Magnus Hillman |
| CU Stockholm | Christian Carlborg |
| OH / PL | *Admin-configurable* |

### Email Magic Links
When an employee requests leave, FastAPI sends a rich-text email to the designated manager containing:
- Employee name
- Requested dates
- Leave type
- A direct magic link to the approval dashboard

---

## 9. Agile Sprint Plan

### Sprint 1 — Infrastructure & Authentication (Weeks 1–2)
- Provision Azure Container Apps, Cosmos DB Serverless.
- Set up GitHub Actions CI/CD pipeline.
- Initialize React frontend and FastAPI backend.
- Implement Microsoft Entra ID authentication on both frontend and backend.

### Sprint 2 — Database Schema & Legacy Import (Weeks 3–4)
- Design Cosmos DB schemas for `Users`, `LeaveRequests`, and `BusinessUnits`.
- Write one-time Python migration script (`scripts/migrate_legacy_data.py`) to parse Excel/CSV files and seed Cosmos DB with historical data.
- Implement basic CRUD endpoints in FastAPI.

### Sprint 3 — Frontend Calendar & Public Holidays (Weeks 5–6)
- Build the core React `Calendar` component.
- Integrate the Nager.Date public holiday API to dynamically block red days.
- Connect the calendar to the backend to render existing user data.

### Sprint 4 — Request Workflow & Team View (Weeks 7–8)
- Implement drag-and-drop / multi-select UI for requesting leave.
- Build the "Team View" interface for employees.
- Develop backend logic to capture requests and set them to state `A` (Requested).

### Sprint 5 — Notifications & Manager Approvals (Weeks 9–10)
- Set up Azure Communication Services / SendGrid email provider.
- Build notification trigger in FastAPI to email managers when requests arrive.
- Develop the Manager Dashboard in React for reviewing and approving/denying requests.

### Sprint 6 — Polish, UAT & Launch (Weeks 11–12)
- Enable Cosmos DB Point-in-Time Restore (PITR) backups.
- Finalize UI/UX design (colors, loading states, error handling).
- Conduct User Acceptance Testing (UAT) with a small group of employees.
- Final deployment to Azure Container Apps and full team rollout.

---

## 10. Contributing

1. Fork the repository and create a feature branch from `main`.
2. Follow the coding standards described in `docs/architecture.md`.
3. Ensure all tests pass before opening a pull request.
4. Reference the relevant sprint/issue in your PR description.
