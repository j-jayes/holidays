"""Email sending service — supports Azure Communication Services and SendGrid."""

from app.config import settings


async def send_email(to: str, subject: str, html_body: str) -> None:
    """
    Send a transactional email.

    The provider is selected via the EMAIL_PROVIDER environment variable:
    - "acs"      → Azure Communication Services
    - "sendgrid" → SendGrid
    """
    if settings.email_provider == "acs":
        await _send_via_acs(to=to, subject=subject, html_body=html_body)
    elif settings.email_provider == "sendgrid":
        await _send_via_sendgrid(to=to, subject=subject, html_body=html_body)
    else:
        raise ValueError(f"Unknown EMAIL_PROVIDER: {settings.email_provider}")


async def _send_via_acs(to: str, subject: str, html_body: str) -> None:
    """Send email using Azure Communication Services."""
    # TODO: import azure.communication.email and send the message
    raise NotImplementedError


async def _send_via_sendgrid(to: str, subject: str, html_body: str) -> None:
    """Send email using SendGrid."""
    # TODO: import sendgrid and send the message
    raise NotImplementedError
