"""Exercise anonymous post discovery against file-backed SQLite."""

from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Post
from app.main import create_app


def build_client(tmp_path: Path) -> tuple[TestClient, object]:
    """Create an application client backed by an isolated SQLite file.

    Args:
        tmp_path: Pytest-managed temporary directory.

    Returns:
        Test client and its application for persistence setup.
    """

    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'public.db').as_posix()}",
        cors_origins=("http://testserver",),
        jwt_secret="test-secret",
        jwt_expires_minutes=60,
    )
    app = create_app(settings)
    return TestClient(app), app


def add_post(app: object, title: str, content: str, created_at: datetime) -> None:
    """Persist a discovery record with deterministic UTC ordering.

    Args:
        app: Configured test application with a session factory.
        title: Safe post title.
        content: Private full post content.
        created_at: UTC time used for feed ordering.
    """

    with app.state.session_factory.begin() as session:
        session.add(
            Post(
                id=str(uuid4()),
                title=title,
                content=content,
                author_id=None,
                author_name_snapshot="Private Author",
                author_role_snapshot="user",
                created_at=created_at,
                updated_at=created_at,
            )
        )


def test_public_posts_clamps_limit_orders_newest_and_returns_only_summaries(tmp_path: Path) -> None:
    """Return bounded newest-first summaries without private post or author data."""

    client, app = build_client(tmp_path)
    now = datetime.now(UTC)
    with client:
        add_post(app, "Oldest note", "OLD_PRIVATE_BODY", now - timedelta(days=2))
        add_post(app, "Middle note", "MIDDLE_PRIVATE_BODY " + ("detail " * 100), now - timedelta(days=1))
        add_post(app, "Newest note", "NEWEST_PRIVATE_BODY " + ("word " * 100), now)
        response = client.get("/api/public/posts?limit=2")

    assert response.status_code == 200
    body = response.json()
    assert [post["title"] for post in body] == ["Newest note", "Middle note"]
    assert all(set(post) == {"id", "title", "excerpt", "created_at"} for post in body)
    assert "NEWEST_PRIVATE_BODY" in body[0]["excerpt"]
    assert len(body[0]["excerpt"]) <= 280
    serialized = str(body)
    assert "content" not in serialized
    assert "author" not in serialized
    assert "OLD_PRIVATE_BODY" not in serialized
    assert ("MIDDLE_PRIVATE_BODY " + ("detail " * 100)) not in serialized


def test_public_posts_clamps_low_and_high_limits(tmp_path: Path) -> None:
    """Clamp any integer limit to the one through one-hundred public range."""

    client, app = build_client(tmp_path)
    now = datetime.now(UTC)
    with client:
        for number in range(101):
            add_post(app, f"Note {number}", f"body {number}", now + timedelta(seconds=number))
        low = client.get("/api/public/posts?limit=-10")
        high = client.get("/api/public/posts?limit=1000")

    assert low.status_code == high.status_code == 200
    assert len(low.json()) == 1
    assert len(high.json()) == 100
    assert high.json()[0]["title"] == "Note 100"


def test_public_posts_rejects_invalid_limit_with_sanitized_validation_envelope(tmp_path: Path) -> None:
    """Return a client validation error rather than leaking a public-feed failure."""

    client, _ = build_client(tmp_path)
    with client:
        response = client.get("/api/public/posts?limit=not-a-number")

    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "VALIDATION_ERROR", "message": "Request validation failed."}
    }
