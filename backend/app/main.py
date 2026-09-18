"""Create and configure the WriteSpace FastAPI application."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.health import router as health_router
from app.core.config import Settings, get_settings
from app.db.bootstrap import bootstrap_database
from app.db.session import create_database_engine, create_session_factory

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
    app.state.engine = create_database_engine(active_settings.database_url)
    app.state.session_factory = create_session_factory(app.state.engine)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(active_settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, __: RequestValidationError) -> JSONResponse:
        """Return a stable validation message without internal request details.

        Returns:
            A sanitized client error response.
        """

        return JSONResponse(status_code=422, content={"error": "Invalid request."})

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
    return app


app = create_app()
