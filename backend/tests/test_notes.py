"""Tests for the Markdown notebook endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_update_search_note(client: TestClient) -> None:
    created = client.post(
        "/api/notes",
        json={"title": "Meeting", "markdown": "# Agenda\n- item", "tags": ["work"]},
    ).json()
    assert created["title"] == "Meeting"
    assert created["tags"] == ["work"]

    updated = client.patch(
        f"/api/notes/{created['id']}", json={"markdown": "# Agenda\n- updated"}
    ).json()
    assert "updated" in updated["markdown"]

    found = client.get("/api/notes", params={"q": "Agenda"}).json()
    assert any(n["id"] == created["id"] for n in found)


def test_delete_note(client: TestClient) -> None:
    note = client.post("/api/notes", json={"title": "Temp"}).json()
    assert client.delete(f"/api/notes/{note['id']}").status_code == 204
    assert client.get(f"/api/notes/{note['id']}").status_code == 404
