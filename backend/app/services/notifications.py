"""Notification trigger logic — routes emails to the correct manager."""

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
