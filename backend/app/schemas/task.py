"""Task request/response schemas."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import Priority, TaskStatus


def _tags_to_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [t.strip() for t in value.split(",") if t.strip()]


def _tags_to_str(value: list[str] | None) -> str | None:
    if not value:
        return None
    return ",".join(t.strip() for t in value if t.strip()) or None


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: Priority = Priority.MEDIUM
    due_date: date | None = None
    planner_date: date | None = None
    estimated_pomodoros: int = Field(default=0, ge=0)
    completed_pomodoros: int = Field(default=0, ge=0)
    tags: list[str] = Field(default_factory=list)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    """All fields optional for PATCH-style partial updates."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: Priority | None = None
    due_date: date | None = None
    planner_date: date | None = None
    position: int | None = None
    completed: bool | None = None
    estimated_pomodoros: int | None = Field(default=None, ge=0)
    completed_pomodoros: int | None = Field(default=None, ge=0)
    tags: list[str] | None = None


class TaskMove(BaseModel):
    """Payload for drag-and-drop reordering."""

    status: TaskStatus
    position: int = Field(ge=0)


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    completed: bool
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @field_validator("tags", mode="before")
    @classmethod
    def _coerce_tags(cls, value: object) -> list[str]:
        if isinstance(value, str):
            return _tags_to_list(value)
        if value is None:
            return []
        return value  # type: ignore[return-value]
