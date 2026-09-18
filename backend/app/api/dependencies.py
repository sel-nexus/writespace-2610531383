"""Resolve authenticated active accounts from bearer credentials."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.session import get_session
from app.security.jwt import TokenError, verify_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_db_session(request: Request):
    """Yield a session from the application's configured factory.

    Args:
        request: Incoming FastAPI request with application state.

    Yields:
        An open request-scoped database session.
    """
    yield from get_session(request.app.state.session_factory)


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: Annotated[Session, Depends(get_db_session)],
) -> User:
    """Load an active persisted account from a verified subject-only token.

    Args:
        request: Incoming request that provides configured security settings.
        credentials: Optional bearer credential parsed by FastAPI.
        session: Request-scoped database session.

    Returns:
        The active persisted user.

    Raises:
        HTTPException: If the credential is absent, invalid, or belongs to an inactive account.
    """
    if credentials is None:
        raise HTTPException(401, detail={"code": "AUTH_REQUIRED", "message": "Authentication required."})
    try:
        subject = verify_token(credentials.credentials, request.app.state.settings.jwt_secret)
    except TokenError:
        raise HTTPException(401, detail={"code": "AUTH_INVALID", "message": "Authentication required."}) from None
    user = session.get(User, subject)
    if user is None or not user.is_active:
        raise HTTPException(401, detail={"code": "ACCOUNT_INACTIVE", "message": "Authentication required."})
    return user
