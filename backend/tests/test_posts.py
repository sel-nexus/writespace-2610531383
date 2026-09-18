"""Exercise authenticated post CRUD against file-backed SQLite."""

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import Settings
from app.db.models import Post, User
from app.main import create_app


def build_client(tmp_path: Path) -> tuple[TestClient, object]:
    """Create an isolated application client with a durable SQLite database."""

    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'posts.db').as_posix()}",
        cors_origins=("http://testserver",),
        jwt_secret="test-secret",
        jwt_expires_minutes=60,
    )
    app = create_app(settings)
    return TestClient(app), app


def register(client: TestClient, username: str, display_name: str) -> dict[str, object]:
    """Register one writer and return the backend-issued session response."""

    response = client.post(
        "/api/auth/register",
        json={"display_name": display_name, "username": username, "password": "CorrectHorseBattery9"},
    )
    assert response.status_code == 201
    return response.json()


def auth(session: dict[str, object]) -> dict[str, str]:
    """Build a bearer authorization header from an authentication response."""

    return {"Authorization": f"Bearer {session['access_token']}"}


def test_posts_require_authentication(tmp_path: Path) -> None:
    """Deny every protected post operation without a bearer credential."""

    client, _ = build_client(tmp_path)
    with client:
        assert client.get("/api/posts").status_code == 401
        assert client.post("/api/posts", json={"title": "A title", "content": "A body"}).status_code == 401
        assert client.get("/api/posts/00000000-0000-0000-0000-000000000000").status_code == 401


def test_writer_can_create_read_update_and_delete_post(tmp_path: Path) -> None:
    """Persist server-derived attribution through the authenticated CRUD journey."""

    client, _ = build_client(tmp_path)
    with client:
        writer = register(client, "writer", "Writer Name")
        created = client.post("/api/posts", headers=auth(writer), json={"title": "  First note  ", "content": "  First body  "})
        assert created.status_code == 201
        post = created.json()
        assert post["title"] == "First note"
        assert post["content"] == "First body"
        assert post["author_name"] == "Writer Name"
        assert post["author_id"] == writer["profile"]["id"]
        assert set(post) == {"id", "title", "content", "author_id", "author_name", "author_role", "created_at", "updated_at"}

        listed = client.get("/api/posts?limit=5", headers=auth(writer))
        assert listed.status_code == 200
        assert listed.json()[0]["id"] == post["id"]
        assert "content" not in listed.json()[0]
        assert client.get(f"/api/posts/{post['id']}", headers=auth(writer)).json()["content"] == "First body"

        updated = client.put(f"/api/posts/{post['id']}", headers=auth(writer), json={"title": "Revised", "content": "Revised body"})
        assert updated.status_code == 200
        assert updated.json()["title"] == "Revised"
        assert client.delete(f"/api/posts/{post['id']}", headers=auth(writer)).status_code == 204
        assert client.get(f"/api/posts/{post['id']}", headers=auth(writer)).status_code == 404


def test_invalid_payloads_do_not_write_or_accept_server_owned_fields(tmp_path: Path) -> None:
    """Reject blank, overlong, and extra client fields before post persistence."""

    client, app = build_client(tmp_path)
    with client:
        writer = register(client, "invalidwriter", "Invalid Writer")
        for payload in (
            {"title": "   ", "content": "Body"},
            {"title": "Title", "content": " "},
            {"title": "x" * 201, "content": "Body"},
            {"title": "Title", "content": "Body", "author_id": "forged"},
            {"title": "Title", "content": "x" * 10001},
        ):
            assert client.post("/api/posts", headers=auth(writer), json=payload).status_code == 422
    with app.state.session_factory() as session:
        assert session.scalars(select(Post)).all() == []


def test_non_owner_mutation_is_forbidden_without_database_change(tmp_path: Path) -> None:
    """Preserve a writer's post when another writer attempts update or delete."""

    client, app = build_client(tmp_path)
    with client:
        owner = register(client, "owner", "Owner")
        other = register(client, "other", "Other")
        created = client.post("/api/posts", headers=auth(owner), json={"title": "Protected", "content": "Original"}).json()
        assert client.put(f"/api/posts/{created['id']}", headers=auth(other), json={"title": "Changed", "content": "Changed"}).status_code == 403
        assert client.delete(f"/api/posts/{created['id']}", headers=auth(other)).status_code == 403
    with app.state.session_factory() as session:
        post = session.get(Post, created["id"])
        assert post is not None
        assert (post.title, post.content) == ("Protected", "Original")


def test_default_admin_can_override_post_ownership(tmp_path: Path) -> None:
    """Allow the persisted bootstrap administrator to mutate another writer's post."""

    client, app = build_client(tmp_path)
    with client:
        owner = register(client, "adminowner", "Admin Owner")
        created = client.post("/api/posts", headers=auth(owner), json={"title": "Override", "content": "Before"}).json()
        admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
        assert admin_login.status_code == 200
        admin_headers = auth(admin_login.json())
        assert client.put(f"/api/posts/{created['id']}", headers=admin_headers, json={"title": "Admin revised", "content": "After"}).status_code == 200
        assert client.delete(f"/api/posts/{created['id']}", headers=admin_headers).status_code == 204
    with app.state.session_factory() as session:
        assert session.get(Post, created["id"]) is None
        admin = session.scalar(select(User).where(User.username == "admin"))
        assert admin is not None and admin.role == "admin"
