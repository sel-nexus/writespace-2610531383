"""Create and configure the WriteSpace FastAPI application."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.public import router as public_router
from app.core.config import Settings, get_settings
from app.db.bootstrap import bootstrap_database
from app.db.session import create_database_engine, create_session_factory
from app.services.auth import AuthDomainError

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize database state before serving requests.

    Args:
        app: Application whose configured engine and session factory are initialized.

    Yields:
        Control while the application serves requests.
    """

    bootstrap_database(app.state.engine, app.state.session_factory)
    yield
    app.state.engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    """Construct a FastAPI application with durable database dependencies.

    Args:
        settings: Optional explicit settings, primarily for isolated tests.

    Returns:
        A configured application ready for ASGI serving.
    """

    active_settings = settings or get_settings()
    app = FastAPI(
        title="WriteSpace API",
        version="0.1.0",
        description="Durable publishing API foundation.",
        lifespan=lifespan,
    )
    app.state.settings = active_settings
    app.state.engine = create_database_engine(active_settings.database_url)
    app.state.session_factory = create_session_factory(app.state.engine)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(active_settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.exception_handler(AuthDomainError)
    async def handle_auth_error(_: Request, error: AuthDomainError) -> JSONResponse:
        """Map expected identity failures to the LLD error envelope.

        Args:
            error: Domain error carrying safe status and message data.

        Returns:
            Sanitized domain failure response.
        """
        return JSONResponse(status_code=error.status_code, content={"error": {"code": error.code, "message": error.message}})

    @app.exception_handler(HTTPException)
    async def handle_http_error(_: Request, error: HTTPException) -> JSONResponse:
        """Map dependency authorization errors to the LLD envelope.

        Args:
            error: HTTP exception produced by a dependency.

        Returns:
            Sanitized HTTP failure response.
        """
        detail = error.detail if isinstance(error.detail, dict) else {"code": "REQUEST_ERROR", "message": "Request failed."}
        return JSONResponse(status_code=error.status_code, content={"error": detail})

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, __: RequestValidationError) -> JSONResponse:
        """Return a stable validation message without internal request details.

        Returns:
            A sanitized client error response.
        """

        return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR", "message": "Request validation failed."}})

    @app.exception_handler(SQLAlchemyError)
    async def handle_database_error(_: Request, error: SQLAlchemyError) -> JSONResponse:
        """Log database failures and hide implementation details from clients.

        Args:
            error: Database exception raised while serving a request.

        Returns:
            A sanitized service-unavailable response.
        """

        logger.error("Database operation failed: %s", error.__class__.__name__)
        return JSONResponse(status_code=503, content={"error": "Service temporarily unavailable."})

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, error: Exception) -> JSONResponse:
        """Log unexpected server failures and return a generic response.

        Args:
            error: Unexpected exception raised while serving a request.

        Returns:
            A sanitized internal-server-error response.
        """

        logger.exception("Unhandled application error: %s", error.__class__.__name__)
        return JSONResponse(status_code=500, content={"error": "Internal server error."})

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(public_router)
    return app


app = create_app()
