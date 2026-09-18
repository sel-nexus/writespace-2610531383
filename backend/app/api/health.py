"""Expose the database-backed WriteSpace health endpoint."""

from fastapi import APIRouter, Request, status
from pydantic import BaseModel

from app.services.health import check_database

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Describe the safe liveness response returned to clients."""

    status: str


@router.get(
    "/api/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Check database health",
)
def read_health(request: Request) -> HealthResponse:
    """Run a lightweight database query and return service health.

    Args:
        request: Incoming request holding the configured session factory.

    Returns:
        A successful health response after `SELECT 1` completes.
    """

    with request.app.state.session_factory() as session:
        return HealthResponse.model_validate(check_database(session))
