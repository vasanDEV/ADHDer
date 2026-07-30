"""Tests for the task board endpoints and drag-and-drop reordering."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_and_list_task(client: TestClient) -> None:
    resp = client.post("/api/tasks", json={"title": "Write report", "priority": "high"})
    assert resp.status_code == 201
    task = resp.json()
    assert task["title"] == "Write report"
    assert task["priority"] == "high"
    assert task["status"] == "todo"
    assert task["completed"] is False

    listed = client.get("/api/tasks").json()
    assert any(t["id"] == task["id"] for t in listed)


def test_tags_roundtrip(client: TestClient) -> None:
    resp = client.post("/api/tasks", json={"title": "Tagged", "tags": ["work", "urgent"]})
    assert resp.status_code == 201
    assert resp.json()["tags"] == ["work", "urgent"]


def test_completing_task_sets_status_done(client: TestClient) -> None:
    task = client.post("/api/tasks", json={"title": "Finish me"}).json()
    resp = client.patch(f"/api/tasks/{task['id']}", json={"completed": True})
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["status"] == "done"
    assert updated["completed"] is True
    assert updated["completed_at"] is not None


def test_move_reorders_positions(client: TestClient) -> None:
    a = client.post("/api/tasks", json={"title": "A"}).json()
    b = client.post("/api/tasks", json={"title": "B"}).json()

    # Move B to the "in_progress" column at position 0.
    resp = client.post(f"/api/tasks/{b['id']}/move", json={"status": "in_progress", "position": 0})
    assert resp.status_code == 200
    moved = resp.json()
    assert moved["status"] == "in_progress"
    assert moved["position"] == 0

    # A should remain in todo.
    a_after = client.get(f"/api/tasks/{a['id']}").json()
    assert a_after["status"] == "todo"


def test_finished_task_can_move_back(client: TestClient) -> None:
    task = client.post("/api/tasks", json={"title": "Reopen me"}).json()
    # Mark finished.
    done = client.patch(f"/api/tasks/{task['id']}", json={"status": "done"}).json()
    assert done["status"] == "done" and done["completed"] is True

    # Move it back to To Do via a status change.
    reopened = client.patch(f"/api/tasks/{task['id']}", json={"status": "todo"}).json()
    assert reopened["status"] == "todo"
    assert reopened["completed"] is False
    assert reopened["completed_at"] is None

    # And via the drag-and-drop move endpoint out of Finished.
    client.patch(f"/api/tasks/{task['id']}", json={"status": "done"})
    moved = client.post(
        f"/api/tasks/{task['id']}/move", json={"status": "in_progress", "position": 0}
    ).json()
    assert moved["status"] == "in_progress"
    assert moved["completed"] is False


def test_completed_flag_false_reopens_task(client: TestClient) -> None:
    task = client.post("/api/tasks", json={"title": "Toggle"}).json()
    client.patch(f"/api/tasks/{task['id']}", json={"completed": True})
    reopened = client.patch(f"/api/tasks/{task['id']}", json={"completed": False}).json()
    assert reopened["completed"] is False
    assert reopened["status"] != "done"


def test_delete_task(client: TestClient) -> None:
    task = client.post("/api/tasks", json={"title": "Temp"}).json()
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").status_code == 404
