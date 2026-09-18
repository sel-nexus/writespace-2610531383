"""Expose anonymous-safe post discovery operations."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db_session
from app.schemas.posts import PublicPostSummary
from app.services.posts import PostService

router = APIRouter(prefix="/api/public", tags=["public"])


def get_post_service(session: Annotated[Session, Depends(get_db_session)]) -> PostService:
    """Build a public discovery service for the current request.

    Args:
        session: Request-scoped SQLAlchemy session.

    Returns:
        Service that reads bounded public post summaries.
    """

    return PostService(session)


@router.get("/posts", response_model=list[PublicPostSummary], status_code=status.HTTP_200_OK, summary="List public post summaries")
def list_public_posts(
    _: Request,
    limit: Annotated[int, Query()] = 3,
    service: PostService = Depends(get_post_service),
) -> list[PublicPostSummary]:
    """Return newest public previews without requiring credentials.

    Args:
        limit: Requested feed length, clamped by the service to one through one hundred.
        service: Request-configured discovery service.

    Returns:
        Safe summaries ordered newest first.
    """

    return service.list_public(limit)
