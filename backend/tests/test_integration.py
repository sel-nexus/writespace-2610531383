"""Exercise identity, posts, and administration through the real HTTP boundary."""

from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def build_client(tmp_path: Path) -> TestClient:
    app = create_app(Settings(database_url=f"sqlite:///{(tmp_path / 'integration.db').as_posix()}", cors_origins=("http://testserver",), jwt_secret="integration-secret", jwt_expires_minutes=60))
    return TestClient(app)


def auth(response: dict[str, object]) -> dict[str, str]:
    return {"Authorization": f"Bearer {response['access_token']}"}


def test_writer_post_admin_stats_list_remove_and_retained_read(tmp_path: Path) -> None:
    client = build_client(tmp_path)
    with client:
        writer = client.post("/api/auth/register", json={"display_name": "Chain Writer", "username": "chainwriter", "password": "CorrectHorseBattery9"}).json()
        post = client.post("/api/posts", headers=auth(writer), json={"title": "Chain post", "content": "Attribution must remain."}).json()
        admin = client.post("/api/auth/login", json={"username": "admin", "password": "admin"}).json()
        admin_headers = auth(admin)
        assert client.get("/api/admin/stats", headers=admin_headers).json()["post_count"] == 1
        users = client.get("/api/users", headers=admin_headers).json()
        assert any(user["id"] == writer["profile"]["id"] for user in users)
        assert client.delete(f"/api/users/{writer['profile']['id']}", headers=admin_headers).status_code == 204
        readable = client.get(f"/api/posts/{post['id']}", headers=admin_headers)
        assert readable.status_code == 200
        assert readable.json()["author_id"] is None
        assert readable.json()["author_name"] == "Chain Writer"


def test_cross_user_post_mutation_is_denied(tmp_path: Path) -> None:
    client = build_client(tmp_path)
    with client:
        owner = client.post("/api/auth/register", json={"display_name": "Owner", "username": "chainowner", "password": "CorrectHorseBattery9"}).json()
        intruder = client.post("/api/auth/register", json={"display_name": "Intruder", "username": "chainintruder", "password": "CorrectHorseBattery9"}).json()
        post = client.post("/api/posts", headers=auth(owner), json={"title": "Private", "content": "Unchanged"}).json()
        denied = client.put(f"/api/posts/{post['id']}", headers=auth(intruder), json={"title": "Changed", "content": "Changed"})
        assert denied.status_code == 403
        assert client.get(f"/api/posts/{post['id']}", headers=auth(owner)).json()["content"] == "Unchanged"
