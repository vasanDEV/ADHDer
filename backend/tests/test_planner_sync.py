"""Tests for planner <-> task board bidirectional synchronization."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_planner_entry_appears_on_board(client: TestClient) -> None:
    day = "2026-07-27"
    resp = client.post(f"/api/planner/day/{day}", json={"title": "Study Control Systems"})
    assert resp.status_code == 200
    task = resp.json()
    assert task["planner_date"] == day
    assert task["status"] == "todo"

    # Shows up in the board listing.
    board = client.get("/api/tasks").json()
    assert any(t["id"] == task["id"] for t in board)

    # Shows up in the planner day view.
    planner_day = client.get(f"/api/planner/day/{day}").json()
    assert any(t["id"] == task["id"] for t in planner_day)


def test_board_completion_reflects_in_planner(client: TestClient) -> None:
    day = "2026-08-01"
    task = client.post(f"/api/planner/day/{day}", json={"title": "Gym"}).json()

    # Complete via board.
    client.patch(f"/api/tasks/{task['id']}", json={"status": "done"})

    planner_day = client.get(f"/api/planner/day/{day}").json()
    matched = next(t for t in planner_day if t["id"] == task["id"])
    assert matched["completed"] is True


def test_planner_range(client: TestClient) -> None:
    client.post("/api/planner/day/2026-09-10", json={"title": "In range"})
    client.post("/api/planner/day/2026-12-31", json={"title": "Out of range"})
    result = client.get("/api/planner/range", params={"start": "2026-09-01", "end": "2026-09-30"}).json()
    titles = {t["title"] for t in result}
    assert "In range" in titles
    assert "Out of range" not in titles
