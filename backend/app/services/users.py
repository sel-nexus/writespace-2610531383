"""Implement safe administrator account governance operations."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.models import Post, User
from app.schemas.auth import SafeProfile
from app.schemas.users import AdminCreateUser, AdminStats
from app.security.passwords import hash_password
from app.services.auth import to_safe_profile


@dataclass
class UserDomainError(Exception):
    """Carry an expected, safe account-governance failure."""

    status_code: int
    code: str
    message: str


class UserService:
    """Coordinate account creation, safe projections, removal, and statistics."""

    def __init__(self, session: Session) -> None:
        """Initialize the service with a request-scoped database session."""
        self.session = session

    def list_profiles(self) -> list[SafeProfile]:
        """Return safe profiles without credentials or internal account flags."""
        users = self.session.scalars(select(User).order_by(User.created_at.desc())).all()
        return [to_safe_profile(user) for user in users]

    def create(self, payload: AdminCreateUser) -> SafeProfile:
        """Create an account after checking case-insensitive username availability."""
        existing = self.session.scalar(select(User).where(func.lower(User.username) == payload.username.casefold()))
        if existing is not None:
            raise UserDomainError(409, "USERNAME_CONFLICT", "Username is already in use.")
        user = User(
            id=str(uuid4()), display_name=payload.display_name, username=payload.username,
            password_hash=hash_password(payload.password), role=payload.role,
            is_default_admin=False, is_active=True, created_at=datetime.now(UTC),
        )
        self.session.add(user)
        try:
            self.session.commit()
            self.session.refresh(user)
        except IntegrityError as exc:
            self.session.rollback()
            raise UserDomainError(409, "USERNAME_CONFLICT", "Username is already in use.") from exc
        except SQLAlchemyError:
            self.session.rollback()
            raise
        return to_safe_profile(user)

    def remove(self, actor: User, target_id: str) -> None:
        """Delete an eligible account while preserving post snapshots and content."""
        target = self.session.get(User, target_id)
        if target is None:
            raise UserDomainError(404, "USER_NOT_FOUND", "User not found.")
        if target.id == actor.id or target.is_default_admin:
            raise UserDomainError(403, "PROTECTED_ACCOUNT", "This account is protected.")
        try:
            self.session.execute(update(Post).where(Post.author_id == target.id).values(author_id=None))
            self.session.delete(target)
            self.session.commit()
        except SQLAlchemyError:
            self.session.rollback()
            raise

    def stats(self) -> AdminStats:
        """Return total users/posts plus the posts written within the last seven days."""
        recent_cutoff = datetime.now(UTC) - timedelta(days=7)
        return AdminStats(
            user_count=self.session.scalar(select(func.count()).select_from(User)) or 0,
            post_count=self.session.scalar(select(func.count()).select_from(Post)) or 0,
            recent_post_count=self.session.scalar(select(func.count()).select_from(Post).where(Post.created_at >= recent_cutoff)) or 0,
        )
