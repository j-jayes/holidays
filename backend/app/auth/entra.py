"""Microsoft Entra ID (Azure AD) token validation for FastAPI."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from jose import JWTError, jwt

from app.config import settings

oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=(
        f"https://login.microsoftonline.com/{settings.azure_tenant_id}/oauth2/v2.0/authorize"
    ),
    tokenUrl=(
        f"https://login.microsoftonline.com/{settings.azure_tenant_id}/oauth2/v2.0/token"
    ),
)

JWKS_URL = (
    f"https://login.microsoftonline.com/{settings.azure_tenant_id}/discovery/v2.0/keys"
)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Validate the Bearer token and return the decoded claims."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # In production, fetch the JWKS and verify the signature.
        payload = jwt.decode(
            token,
            options={"verify_signature": False},  # TODO: enable in production
        )
        return payload
    except JWTError:
        raise credentials_exception
