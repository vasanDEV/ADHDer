"""Tests for pomodoro statistics and settings persistence."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_record_session_updates_stats(client: TestClient) -> None:
    before = client.get("/api/pomodoro/stats").json()
    resp = client.post(
        "/api/pomodoro/sessions",
        json={"kind": "work", "duration": 1500, "completed": True},
    )
    assert resp.status_code == 201
    after = client.get("/api/pomodoro/stats").json()
    assert after["today_count"] == before["today_count"] + 1
    assert after["total_focus_seconds"] >= before["total_focus_seconds"] + 1500


def test_session_increments_task_pomodoros(client: TestClient) -> None:
    task = client.post("/api/tasks", json={"title": "Focus task"}).json()
    client.post(
        "/api/pomodoro/sessions",
        json={"kind": "work", "duration": 1500, "completed": True, "task_id": task["id"]},
    )
    refreshed = client.get(f"/api/tasks/{task['id']}").json()
    assert refreshed["completed_pomodoros"] == 1


def test_settings_defaults_and_update(client: TestClient) -> None:
    defaults = client.get("/api/settings").json()
    assert defaults["theme"] in {"system", "light", "dark"}
    assert "workDuration" in defaults

    updated = client.put("/api/settings", json={"theme": "dark", "workDuration": 30}).json()
    assert updated["theme"] == "dark"
    assert updated["workDuration"] == 30

    # Single-key update.
    single = client.put("/api/settings/clock24Hour", json={"value": False}).json()
    assert single["clock24Hour"] is False
