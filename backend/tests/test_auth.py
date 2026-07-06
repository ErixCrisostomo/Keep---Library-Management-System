from core.security import hash_password
from models.models import SuperAdmin


def test_login_logout_cycle(client, db_session):
    # Create a superadmin user directly in the test DB
    admin = SuperAdmin(login_id="admin@example.com", name="Admin User", hashed_password=hash_password("secret"))
    db_session.add(admin)
    db_session.commit()

    # Login
    resp = client.post("/api/auth/login", json={"login_id": "admin@example.com", "password": "secret"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    token = data["access_token"]

    # Authenticated request
    headers = {"Authorization": f"Bearer {token}"}
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["login_id"] == "admin@example.com"

    # Logout endpoint (audit-only)
    lo = client.post("/api/auth/logout", headers=headers)
    assert lo.status_code == 204
