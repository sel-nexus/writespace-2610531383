"""Expose active-administrator aggregate metrics."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db_session, require_admin
from app.db.models import User
from app.schemas.users import AdminStats
from app.services.users import UserService

router = APIRouter(prefix="/api/admin", tags=["administration"])


def get_user_service(session: Annotated[Session, Depends(get_db_session)]) -> UserService:
    """Build the request-scoped service used for administrative aggregates."""
    return UserService(session)


@router.get("/stats", response_model=AdminStats, summary="Read administration statistics")
def get_stats(
    _: Annotated[User, Depends(require_admin)], service: Annotated[UserService, Depends(get_user_service)]
) -> AdminStats:
    """Return account and post totals for an active administrator."""
    return service.stats()
