"""Reusable API dependencies."""
import logging
from typing import Optional
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.merchant import Merchant

logger = logging.getLogger(__name__)

# HTTPBearer security scheme integration for OpenAPI documentation
security_scheme = HTTPBearer(auto_error=False)


def get_current_merchant(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    token: Optional[str] = Query(None, description="Optional access token for browser media streaming"),
    db: Session = Depends(get_db),
) -> Merchant:
    """Validate Bearer token (via Authorization header or ?token query param) and retrieve active merchant account."""
    raw_token: Optional[str] = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif token and token.strip():
        raw_token = token.strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(raw_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    merchant_id = payload.get("sub")
    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    merchant = db.execute(
        select(Merchant).where(Merchant.id == str(merchant_id))
    ).scalar_one_or_none()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Merchant account does not exist",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not merchant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant account is inactive",
        )

    return merchant
