"""Expose active-administrator account governance endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db_session, require_admin
from app.db.models import User
from app.schemas.auth import SafeProfile
from app.schemas.users import AdminCreateUser
from app.services.users import UserDomainError, UserService

router = APIRouter(prefix="/api/users", tags=["users"])


def get_user_service(session: Annotated[Session, Depends(get_db_session)]) -> UserService:
    """Build the request-scoped user governance service."""
    return UserService(session)


@router.get("", response_model=list[SafeProfile], summary="List safe user profiles")
def list_users(
    _: Annotated[User, Depends(require_admin)], service: Annotated[UserService, Depends(get_user_service)]
) -> list[SafeProfile]:
    """List accounts using a safe allow-list projection."""
    return service.list_profiles()


@router.post("", response_model=SafeProfile, status_code=status.HTTP_201_CREATED, summary="Create an account")
def create_user(
    payload: AdminCreateUser,
    _: Annotated[User, Depends(require_admin)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> SafeProfile:
    """Create an account with the requested normalized role."""
    try:
        return service.create(payload)
    except UserDomainError as error:
        raise HTTPException(error.status_code, detail={"code": error.code, "message": error.message}) from None


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove an eligible account")
def delete_user(
    user_id: UUID,
    actor: Annotated[User, Depends(require_admin)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> None:
    """Remove an eligible account while retaining its posts and snapshots."""
    try:
        service.remove(actor, str(user_id))
    except UserDomainError as error:
        raise HTTPException(error.status_code, detail={"code": error.code, "message": error.message}) from None
