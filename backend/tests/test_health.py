"""Verify durable health and bootstrap behavior through FastAPI."""

from pathlib import Path

import bcrypt
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.core.config import Settings, default_database_url
from app.db.bootstrap import DEFAULT_ADMIN_USERNAME, bootstrap_database
from app.db.models import User
from app.db.session import create_database_engine, create_session_factory
from app.main import create_app


def test_default_configuration_uses_file_backed_sqlite() -> None:
    """Ensure the shipped database default cannot create an in-memory store."""

    database_url = default_database_url()

    assert database_url.startswith("sqlite:///")
    assert ":memory:" not in database_url


def test_health_returns_ok_after_selecting_from_file_database(tmp_path: Path) -> None:
    """Return the public health payload after a real SQLite `SELECT 1`."""

    database_url = f"sqlite:///{(tmp_path / 'health.db').as_posix()}"
    app = create_app(Settings(database_url=database_url, cors_origins=("http://testserver",)))

    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_sqlite_foreign_keys_are_enabled(tmp_path: Path) -> None:
    """Enable SQLite foreign keys on every engine connection."""

    engine = create_database_engine(f"sqlite:///{(tmp_path / 'foreign-keys.db').as_posix()}")
    with engine.connect() as connection:
        enabled = connection.execute(text("PRAGMA foreign_keys")).scalar_one()

    assert enabled == 1


def test_bootstrap_is_idempotent_and_seeds_hashed_admin(tmp_path: Path) -> None:
    """Create only one reusable default admin across repeated bootstraps."""

    engine = create_database_engine(f"sqlite:///{(tmp_path / 'bootstrap.db').as_posix()}")
    session_factory = create_session_factory(engine)

    bootstrap_database(engine, session_factory)
    bootstrap_database(engine, session_factory)

    with session_factory() as session:
        admins = session.scalars(
            select(User).where(User.username == DEFAULT_ADMIN_USERNAME)
        ).all()

    assert len(admins) == 1
    assert admins[0].role == "admin"
    assert bcrypt.checkpw(b"admin", admins[0].password_hash.encode("utf-8"))
