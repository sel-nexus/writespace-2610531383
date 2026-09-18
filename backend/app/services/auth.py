"""Implement registration, login, and persisted-profile behavior."""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, SafeProfile
from app.security.jwt import issue_token
from app.security.passwords import hash_password, verify_password

RESERVED_USERNAMES = {"admin"}


@dataclass
class AuthDomainError(Exception):
    """Carry a stable client-safe authentication failure."""

    status_code: int
    code: str
    message: str


def to_safe_profile(user: User) -> SafeProfile:
    """Map an account record to the allow-listed profile DTO.

    Args:
        user: Persisted account record.

    Returns:
        Safe account fields suitable for client responses.
    """
    return SafeProfile(id=user.id, display_name=user.display_name, username=user.username, role=user.role, created_at=user.created_at)


class AuthService:
    """Coordinate account persistence with password and token security."""

    def __init__(self, session: Session, jwt_secret: str, jwt_expires_minutes: int) -> None:
        """Initialize the service with a request-scoped database session.

        Args:
            session: Active SQLAlchemy session.
            jwt_secret: Configured token signing secret.
            jwt_expires_minutes: Configured token lifetime.
        """
        self.session = session
        self.jwt_secret = jwt_secret
        self.jwt_expires_minutes = jwt_expires_minutes

    def register(self, request: RegisterRequest) -> AuthResponse:
        """Create a writer account and issue its first session.

        Args:
            request: Validated registration data.

        Returns:
            An access token and safe profile.

        Raises:
            AuthDomainError: If a username is reserved or already in use.
        """
        if request.username.casefold() in RESERVED_USERNAMES:
            raise AuthDomainError(422, "VALIDATION_ERROR", "Request validation failed.")
        existing = self.session.scalar(select(User).where(func.lower(User.username) == request.username.casefold()))
        if existing is not None:
            raise AuthDomainError(409, "USERNAME_CONFLICT", "Username is already in use.")
        user = User(
            id=str(uuid4()), display_name=request.display_name, username=request.username,
            password_hash=hash_password(request.password), role="user", is_active=True,
            is_default_admin=False, created_at=datetime.now(UTC),
        )
        self.session.add(user)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise AuthDomainError(409, "USERNAME_CONFLICT", "Username is already in use.") from exc
        return self._response_for(user)

    def login(self, request: LoginRequest) -> AuthResponse:
        """Authenticate credentials without revealing which check failed.

        Args:
            request: Validated login credentials.

        Returns:
            An access token and safe profile.

        Raises:
            AuthDomainError: If the account is unknown, inactive, or password is wrong.
        """
        user = self.session.scalar(select(User).where(func.lower(User.username) == request.username.casefold()))
        if user is None or not verify_password(request.password, user.password_hash) or not user.is_active:
            raise AuthDomainError(401, "AUTH_INVALID", "Invalid username or password.")
        return self._response_for(user)

    def _response_for(self, user: User) -> AuthResponse:
        """Build a token response for an active persisted account.

        Args:
            user: Account authenticated by the service.

        Returns:
            Token and safe profile response.
        """
        return AuthResponse(access_token=issue_token(user.id, self.jwt_secret, self.jwt_expires_minutes), profile=to_safe_profile(user))
