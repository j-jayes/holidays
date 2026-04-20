"""Notification trigger logic — routes emails to the correct manager or employee."""

from app.config import settings
from app.models.leave_request import LeaveRequest
from app.models.user import User
from app.services.email import send_email


async def notify_manager(request: LeaveRequest, employee: User, manager: User) -> None:
    """
    Send a rich-text email to the manager when a new leave request is created.

    The email contains employee name, requested dates, leave type, and a
    magic link to the approval dashboard.
    """
    approval_url = f"{settings.normalized_frontend_url}/dashboard/requests/{request.id}"

    subject = f"Leave Request from {employee.display_name}"
    html_body = f"""
    <h2>New Leave Request</h2>
    <p><strong>Employee:</strong> {employee.display_name} ({employee.email})</p>
    <p><strong>Dates:</strong> {request.start_date} → {request.end_date}</p>
    <p><strong>Leave Type:</strong> {request.leave_type}</p>
    <p><strong>Notes:</strong> {request.notes or "—"}</p>
    <p>
      <a href="{approval_url}" style="background:#0078d4;color:#fff;padding:10px 20px;
        border-radius:4px;text-decoration:none;">Review &amp; Approve</a>
    </p>
    """

    await send_email(to=manager.email, subject=subject, html_body=html_body)


# ─── Leave status change notification ────────────────────────────────────────

_STATUS_SUBJECT: dict[str, str] = {
    "B": "Your leave request has been approved",
    "C": "Your leave request was not approved",
    # "A" is used internally for undo — no email sent for that
}

_STATUS_HEADING: dict[str, str] = {
    "B": "Good news — your leave request has been approved! ✅",
    "C": "Your leave request was not approved",
}

_STATUS_COLOR: dict[str, str] = {
    "B": "#0078d4",
    "C": "#d83b01",
}


async def notify_employee_decision(
    request: LeaveRequest,
    employee: User,
    new_status: str,
) -> None:
    """Send a decision notification email to the employee.

    Called after a manager approves (status → "B") or denies (status → "C")
    a leave request.  If the manager later undoes the decision (status → "A")
    no email is sent — the employee retains their most recent outcome email
    until a fresh decision is made.

    NOTE: When MSAL integration ships, ``employee.email`` will be populated
    directly from the Entra ID token rather than the Users container, so
    delivery reliability will improve without any change to this function.
    """
    subject = _STATUS_SUBJECT.get(new_status)
    if not subject:
        # No notification for intermediate or unsupported statuses
        return

    heading = _STATUS_HEADING[new_status]
    accent = _STATUS_COLOR[new_status]
    dashboard_url = f"{settings.normalized_frontend_url}/dashboard"

    html_body = f"""
    <h2 style="color:{accent}">{heading}</h2>
    <p>Hi {employee.display_name},</p>
    <p>Your leave request for
       <strong>{request.start_date}</strong> → <strong>{request.end_date}</strong>
       has been reviewed.</p>
    <p><strong>Status:</strong> {"Approved" if new_status == "B" else "Not approved"}</p>
    {"<p>Your balance has been updated accordingly.</p>" if new_status == "B" else ""}
    <p>
      <a href="{dashboard_url}" style="background:{accent};color:#fff;padding:10px 20px;
        border-radius:4px;text-decoration:none;">View Dashboard</a>
    </p>
    <p style="color:#888;font-size:0.85em">
      If you believe this is a mistake, please contact your manager directly.
    </p>
    """

    await send_email(to=employee.email, subject=subject, html_body=html_body)

