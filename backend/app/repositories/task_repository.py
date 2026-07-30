"""Task-specific data access."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func, select

from app.models.enums import TaskStatus
from app.models.task import Task
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    model = Task

    def list_ordered(self) -> list[Task]:
        stmt = select(Task).order_by(Task.status, Task.position, Task.id)
        return list(self.db.execute(stmt).scalars().all())

    def list_by_status(self, status: TaskStatus) -> list[Task]:
        stmt = (
            select(Task)
            .where(Task.status == status)
            .order_by(Task.position, Task.id)
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_by_planner_date(self, day: date) -> list[Task]:
        stmt = (
            select(Task)
            .where(Task.planner_date == day)
            .order_by(Task.position, Task.id)
        )
        return list(self.db.execute(stmt).scalars().all())

    def list_between_planner_dates(self, start: date, end: date) -> list[Task]:
        stmt = (
            select(Task)
            .where(Task.planner_date >= start, Task.planner_date <= end)
            .order_by(Task.planner_date, Task.position, Task.id)
        )
        return list(self.db.execute(stmt).scalars().all())

    def next_position(self, status: TaskStatus) -> int:
        stmt = select(func.coalesce(func.max(Task.position), -1)).where(Task.status == status)
        current_max = self.db.execute(stmt).scalar_one()
        return int(current_max) + 1
