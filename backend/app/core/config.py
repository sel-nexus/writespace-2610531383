"""Provide runtime configuration for WriteSpace."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    """Hold environment-derived application settings.

    Args:
        database_url: SQLAlchemy connection URL for durable application data.
        cors_origins: Comma-separated browser origins allowed during development.
    """

    database_url: str
    cors_origins: tuple[str, ...]
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_expires_minutes: int = 60


def default_database_url() -> str:
    """Return a file-backed SQLite URL rooted beneath the backend directory.

    Returns:
        A SQLite connection URL that never selects an in-memory database.
    """

    database_path = Path(__file__).resolve().parents[2] / "data" / "writespace.db"
    return f"sqlite:///{database_path.as_posix()}"


def get_settings() -> Settings:
    """Load settings while preferring explicit environment configuration.

    Returns:
        Validated settings with a durable SQLite default.

    Raises:
        ValueError: If an in-memory SQLite URL is configured.
    """

    database_url = os.getenv("DATABASE_URL", default_database_url())
    if ":memory:" in database_url:
        raise ValueError("DATABASE_URL must reference a file-backed database")

    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    jwt_secret = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
    if not jwt_secret:
        raise ValueError("JWT_SECRET must not be empty")
    return Settings(
        database_url=database_url,
        cors_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
        jwt_secret=jwt_secret,
        jwt_expires_minutes=int(os.getenv("JWT_EXPIRES_MINUTES", "60")),
    )
