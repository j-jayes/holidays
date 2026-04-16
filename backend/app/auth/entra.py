"""Microsoft Entra ID (Azure AD) token validation for FastAPI.

While Entra ID app registrations are pending, auth is optional:
- Requests without a Bearer token are accepted and treated as anonymous ({}).
- When a valid token IS provided it is decoded (signature check disabled until
  JWKS rotation is wired up) and the claims are returned.

TODO: Once app registrations exist, flip `auto_error=True` and enable
      `verify_signature` + proper JWKS validation.
"""

from fastapi import Depends
from fastapi.security import OAuth2AuthorizationCodeBearer
from jose import JWTError, jwt

from app.config import settings

# auto_error=False → returns None instead of 401 when the header is absent
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=(
        f"https://login.microsoftonline.com/{settings.azure_tenant_id or 'common'}"
        "/oauth2/v2.0/authorize"
    ),
    tokenUrl=(
        f"https://login.microsoftonline.com/{settings.azure_tenant_id or 'common'}"
        "/oauth2/v2.0/token"
    ),
    auto_error=False,
)


async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict:
    """Return decoded token claims, or {} if no token is present."""
    if not token:
        return {}
    try:
        return jwt.decode(token, options={"verify_signature": False})
    except JWTError:
        return {}
