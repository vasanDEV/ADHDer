"""Pomodoro session request/response and statistics schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PomodoroCreate(BaseModel):
    task_id: int | None = None
    kind: str = Field(default="work")
    duration: int = Field(ge=0, description="Duration in seconds")
    start: datetime | None = None
    end: datetime | None = None
    completed: bool = True


class PomodoroRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int | None
    kind: str
    start: datetime
    end: datetime | None
    duration: int
    completed: bool


class PomodoroStats(BaseModel):
    """Aggregated focus statistics for the dashboard/pomodoro page."""

    today_count: int = 0
    week_count: int = 0
    total_count: int = 0
    total_focus_seconds: int = 0
    today_focus_seconds: int = 0
