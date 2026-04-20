"""Team Vacation Tracker — FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.v1 import business_units, exports, leave_requests, odata, public_holidays, users
from app.config import settings

app = FastAPI(
    title="Team Vacation Tracker API",
    description="REST API for managing employee leave requests.",
    version="0.1.0",
)

# Trust proxy headers (X-Forwarded-Proto etc.) so redirects use https://
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(
    leave_requests.router,
    prefix="/api/v1/leave-requests",
    tags=["Leave Requests"],
)
app.include_router(
    business_units.router,
    prefix="/api/v1/business-units",
    tags=["Business Units"],
)
app.include_router(
    public_holidays.router,
    prefix="/api/v1/public-holidays",
    tags=["Public Holidays"],
)
app.include_router(
    exports.router,
    prefix="/api/v1/exports",
    tags=["Exports"],
)
app.include_router(
    odata.router,
    prefix="/api/v1/odata",
    tags=["OData"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Liveness probe for container health checks."""
    return {"status": "ok"}
