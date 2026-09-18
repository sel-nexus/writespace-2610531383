"""Expose authenticated plain-text post operations."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db_session
from app.db.models import User
from app.schemas.posts import PostDetail, PostSummary, PostWriteRequest
from app.services.posts import PostForbiddenError, PostService

router = APIRouter(prefix="/api/posts", tags=["posts"])


def get_post_service(session: Annotated[Session, Depends(get_db_session)]) -> PostService:
    """Build a post service for the current request.

    Args:
        session: Request-scoped SQLAlchemy session.

    Returns:
        Service configured with the request session.
    """

    return PostService(session)


@router.get("", response_model=list[PostSummary], status_code=status.HTTP_200_OK, summary="List authenticated post summaries")
def list_posts(
    limit: Annotated[int, Query(ge=1, le=100)] = 5,
    service: PostService = Depends(get_post_service),
    _: User = Depends(get_current_user),
) -> list[PostSummary]:
    """Return newest-first summaries for an authenticated reader."""

    return service.list_summaries(limit)


@router.get("/{post_id}", response_model=PostDetail, status_code=status.HTTP_200_OK, summary="Read a post")
def get_post(
    post_id: UUID,
    service: PostService = Depends(get_post_service),
    _: User = Depends(get_current_user),
) -> PostDetail:
    """Return a full plain-text post or a not-found response."""

    post = service.get(str(post_id))
    if post is None:
        raise HTTPException(404, detail={"code": "POST_NOT_FOUND", "message": "Post not found."})
    return service.to_detail(post)


@router.post("", response_model=PostDetail, status_code=status.HTTP_201_CREATED, summary="Create a post")
def create_post(
    payload: PostWriteRequest,
    actor: Annotated[User, Depends(get_current_user)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> PostDetail:
    """Create a post using server-derived attribution and timestamps."""

    return service.create(payload, actor)


@router.put("/{post_id}", response_model=PostDetail, status_code=status.HTTP_200_OK, summary="Update a post")
def update_post(
    post_id: UUID,
    payload: PostWriteRequest,
    actor: Annotated[User, Depends(get_current_user)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> PostDetail:
    """Update a post when the active actor is its owner or an administrator."""

    try:
        post = service.update(str(post_id), payload, actor)
    except PostForbiddenError:
        raise HTTPException(403, detail={"code": "POST_FORBIDDEN", "message": "You cannot modify this post."}) from None
    if post is None:
        raise HTTPException(404, detail={"code": "POST_NOT_FOUND", "message": "Post not found."})
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a post")
def delete_post(
    post_id: UUID,
    actor: Annotated[User, Depends(get_current_user)],
    service: Annotated[PostService, Depends(get_post_service)],
) -> None:
    """Delete a post when the active actor is its owner or an administrator."""

    try:
        outcome = service.delete(str(post_id), actor)
    except PostForbiddenError:
        raise HTTPException(403, detail={"code": "POST_FORBIDDEN", "message": "You cannot modify this post."}) from None
    if outcome is None:
        raise HTTPException(404, detail={"code": "POST_NOT_FOUND", "message": "Post not found."})
