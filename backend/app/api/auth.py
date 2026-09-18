"""Expose registration, login, and current-profile API operations."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db_session
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, SafeProfile
from app.services.auth import AuthService, to_safe_profile

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def get_auth_service(request: Request, session: Annotated[Session, Depends(get_db_session)]) -> AuthService:
    """Build the request's authentication service.

    Args:
        request: Incoming request with application settings.
        session: Request-scoped database session.

    Returns:
        Configured authentication service.
    """
    return AuthService(session, request.app.state.settings.jwt_secret, request.app.state.settings.jwt_expires_minutes)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, service: Annotated[AuthService, Depends(get_auth_service)]) -> AuthResponse:
    """Register a writer account.

    Args:
        request: Validated registration payload.
        service: Configured authentication service.

    Returns:
        Access token and safe profile for the new writer.
    """
    return service.register(request)


@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
def login(request: LoginRequest, service: Annotated[AuthService, Depends(get_auth_service)]) -> AuthResponse:
    """Authenticate a writer with generic credential failures.

    Args:
        request: Validated login payload.
        service: Configured authentication service.

    Returns:
        Access token and persisted safe profile.
    """
    return service.login(request)


@router.get("/me", response_model=SafeProfile, status_code=status.HTTP_200_OK)
def me(user: Annotated[object, Depends(get_current_user)]) -> SafeProfile:
    """Return the current active account's persisted safe profile.

    Args:
        user: Active account resolved from a bearer token.

    Returns:
        Safe persisted profile.
    """
    return to_safe_profile(user)
