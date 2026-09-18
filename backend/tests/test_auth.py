"""Exercise identity services and HTTP endpoints against file-backed SQLite."""

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import Settings
from app.db.models import User
from app.main import create_app


def build_client(tmp_path: Path) -> tuple[TestClient, object]:
    """Create an application client backed by a unique SQLite file.

    Args:
        tmp_path: Pytest-provided temporary directory.

    Returns:
        A test client and its application for database assertions.
    """
    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'auth.db').as_posix()}",
        cors_origins=("http://testserver",),
        jwt_secret="test-secret",
        jwt_expires_minutes=60,
    )
    app = create_app(settings)
    return TestClient(app), app


def registration_payload(username: str = "ada") -> dict[str, str]:
    """Return a valid registration payload.

    Args:
        username: Username to use in the request.

    Returns:
        Valid writer registration data.
    """
    return {"display_name": "Ada Lovelace", "username": username, "password": "CorrectHorseBattery9"}


def test_registers_writer_with_safe_profile_and_hashed_password(tmp_path: Path) -> None:
    """Create a forced-user account and avoid exposing its password data."""
    client, app = build_client(tmp_path)
    with client:
        response = client.post("/api/auth/register", json=registration_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["profile"]["role"] == "user"
    assert "password" not in str(body)
    with app.state.session_factory() as session:
        user = session.scalar(select(User).where(User.username == "ada"))
    assert user is not None
    assert user.password_hash != "CorrectHorseBattery9"


def test_rejects_case_insensitive_duplicate_and_reserved_admin(tmp_path: Path) -> None:
    """Reject authority-like and colliding usernames with expected statuses."""
    client, _ = build_client(tmp_path)
    with client:
        assert client.post("/api/auth/register", json=registration_payload("Ada")).status_code == 201
        duplicate = client.post("/api/auth/register", json=registration_payload("ada"))
        reserved = client.post("/api/auth/register", json=registration_payload("ADMIN"))

    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "USERNAME_CONFLICT"
    assert reserved.status_code == 422


def test_login_failures_have_identical_generic_message(tmp_path: Path) -> None:
    """Avoid credential enumeration for unknown and invalid login attempts."""
    client, _ = build_client(tmp_path)
    with client:
        client.post("/api/auth/register", json=registration_payload())
        unknown = client.post("/api/auth/login", json={"username": "nobody", "password": "CorrectHorseBattery9"})
        wrong = client.post("/api/auth/login", json={"username": "ada", "password": "NotTheRightPassword9"})

    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["error"]["message"] == wrong.json()["error"]["message"] == "Invalid username or password."


def test_me_requires_valid_active_persisted_account(tmp_path: Path) -> None:
    """Return persisted profile for valid JWTs and reject forged or inactive sessions."""
    client, app = build_client(tmp_path)
    with client:
        registered = client.post("/api/auth/register", json=registration_payload()).json()
        valid = client.get("/api/auth/me", headers={"Authorization": f"Bearer {registered['access_token']}"})
        forged = client.get("/api/auth/me", headers={"Authorization": "Bearer forged.token.value"})
        with app.state.session_factory.begin() as session:
            user = session.get(User, registered["profile"]["id"])
            user.is_active = False
        inactive = client.get("/api/auth/me", headers={"Authorization": f"Bearer {registered['access_token']}"})

    assert valid.status_code == 200
    assert valid.json()["username"] == "ada"
    assert forged.status_code == 401
    assert inactive.status_code == 401
