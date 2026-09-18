"""Verify administrator-only governance against a file-backed SQLite database."""

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import Settings
from app.db.models import Post, User
from app.main import create_app


def build_client(tmp_path: Path) -> tuple[TestClient, object]:
    settings = Settings(database_url=f"sqlite:///{(tmp_path / 'admin.db').as_posix()}", cors_origins=("http://testserver",), jwt_secret="test-secret", jwt_expires_minutes=60)
    app = create_app(settings)
    return TestClient(app), app


def register(client: TestClient, username: str, display_name: str) -> dict[str, object]:
    response = client.post("/api/auth/register", json={"display_name": display_name, "username": username, "password": "CorrectHorseBattery9"})
    assert response.status_code == 201
    return response.json()


def headers(session: dict[str, object]) -> dict[str, str]:
    return {"Authorization": f"Bearer {session['access_token']}"}


def login_admin(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert response.status_code == 200
    return headers(response.json())


def test_non_admin_is_forbidden_from_all_governance_routes(tmp_path: Path) -> None:
    client, _ = build_client(tmp_path)
    with client:
        writer = register(client, "writer", "Writer")
        writer_headers = headers(writer)
        assert client.get("/api/admin/stats", headers=writer_headers).status_code == 403
        assert client.get("/api/users", headers=writer_headers).status_code == 403
        assert client.post("/api/users", headers=writer_headers, json={"display_name": "Denied", "username": "denied", "password": "CorrectHorseBattery9", "role": "user"}).status_code == 403


def test_admin_stats_and_profiles_are_safe(tmp_path: Path) -> None:
    client, _ = build_client(tmp_path)
    with client:
        register(client, "safeuser", "Safe User")
        response = client.get("/api/users", headers=login_admin(client))
        assert response.status_code == 200
        assert response.json()[0].keys() == {"id", "display_name", "username", "role", "created_at"}
        stats = client.get("/api/admin/stats", headers=login_admin(client))
        assert stats.status_code == 200
        assert stats.json() == {"user_count": 2, "post_count": 0, "recent_post_count": 0}


def test_admin_create_normalizes_role_and_rejects_casefolded_conflict(tmp_path: Path) -> None:
    client, _ = build_client(tmp_path)
    with client:
        admin_headers = login_admin(client)
        payload = {"display_name": "Grace", "username": "grace", "password": "CorrectHorseBattery9", "role": "ADMIN"}
        created = client.post("/api/users", headers=admin_headers, json=payload)
        assert created.status_code == 201 and created.json()["role"] == "admin"
        conflict = client.post("/api/users", headers=admin_headers, json={**payload, "username": "GRACE"})
        assert conflict.status_code == 409


def test_self_and_default_administrator_deletion_are_protected(tmp_path: Path) -> None:
    client, _ = build_client(tmp_path)
    with client:
        admin_headers = login_admin(client)
        admin = client.get("/api/users", headers=admin_headers).json()[0]
        assert client.delete(f"/api/users/{admin['id']}", headers=admin_headers).status_code == 403
        created = client.post("/api/users", headers=admin_headers, json={"display_name": "Second", "username": "secondadmin", "password": "CorrectHorseBattery9", "role": "admin"}).json()
        second_login = client.post("/api/auth/login", json={"username": "secondadmin", "password": "CorrectHorseBattery9"}).json()
        assert client.delete(f"/api/users/{created['id']}", headers=headers(second_login)).status_code == 403


def test_removal_retains_posts_with_snapshots_and_null_author(tmp_path: Path) -> None:
    client, app = build_client(tmp_path)
    with client:
        writer = register(client, "retained", "Retained Writer")
        post = client.post("/api/posts", headers=headers(writer), json={"title": "Kept", "content": "This stays."}).json()
        assert client.delete(f"/api/users/{writer['profile']['id']}", headers=login_admin(client)).status_code == 204
    with app.state.session_factory() as session:
        retained = session.get(Post, post["id"])
        assert retained is not None
        assert retained.author_id is None
        assert (retained.author_name_snapshot, retained.author_role_snapshot) == ("Retained Writer", "user")
        assert session.scalar(select(User).where(User.username == "retained")) is None
