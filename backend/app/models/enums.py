"""Shared enumerations for the domain models."""

from __future__ import annotations

import enum


class TaskStatus(str, enum.Enum):
    """Kanban column a task belongs to."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class Priority(str, enum.Enum):
    """Task priority (color-coded in the UI)."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
