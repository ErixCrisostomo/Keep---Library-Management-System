from core.security import hash_password
from models.models import Librarian


def test_book_crud_and_audit(client, db_session):
    # Create a librarian account
    lib = Librarian(login_id="lib@example.com", name="Lib One", hashed_password=hash_password("libpass"))
    db_session.add(lib)
    db_session.commit()

    # Login as librarian
    resp = client.post("/api/auth/login", json={"login_id": "lib@example.com", "password": "libpass"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a book
    payload = {"id": "B-001", "title": "Test Book", "author": "Author", "isbn": "ISBN-001", "genre": "Fiction", "total": 3, "available": 3}
    c = client.post("/api/books", json=payload, headers=headers)
    assert c.status_code == 201
    created = c.json()
    assert created["title"] == "Test Book"

    # Update the book
    upd = client.put(f"/api/books/{created['id']}", json={"title": "Test Book v2", "author": "Author", "isbn": "ISBN-001", "genre": "Fiction", "total": 3, "available": 3}, headers=headers)
    assert upd.status_code == 200
    assert upd.json()["title"] == "Test Book v2"

    # Delete the book
    d = client.delete(f"/api/books/{created['id']}", headers=headers)
    assert d.status_code == 204

    # Check that audit logs contain an add_book entry (superadmin view)
    # Create a superadmin and login to fetch logs
    from core.security import hash_password as hp
    from models.models import SuperAdmin

    sa = SuperAdmin(login_id="sa@example.com", name="SA", hashed_password=hp("sa-secret"))
    db_session.add(sa)
    db_session.commit()
    r = client.post("/api/auth/login", json={"login_id": "sa@example.com", "password": "sa-secret"})
    token2 = r.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    logs = client.get("/api/logs", headers=headers2)
    assert logs.status_code == 200
    entries = logs.json()
    types = [e["type"] for e in entries]
    assert "add_book" in types or "update_book" in types
