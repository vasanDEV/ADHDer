"""Pomodoro business logic and statistics."""

from __future__ import annotations

from datetime import datetime, timedelta

from app.database.base import utcnow
from app.models.pomodoro import PomodoroSession
from app.repositories.pomodoro_repository import PomodoroRepository
from app.repositories.task_repository import TaskRepository
from app.schemas.pomodoro import PomodoroCreate, PomodoroStats


class PomodoroService:
    def __init__(self, repo: PomodoroRepository, task_repo: TaskRepository) -> None:
        self.repo = repo
        self.task_repo = task_repo

    def record(self, payload: PomodoroCreate) -> PomodoroSession:
        now = utcnow()
        end = payload.end or now
        start = payload.start or (end - timedelta(seconds=payload.duration))
        session = PomodoroSession(
            task_id=payload.task_id,
            kind=payload.kind,
            start=start,
            end=end,
            duration=payload.duration,
            completed=payload.completed,
        )
        self.repo.add(session)

        # Increment the linked task's completed pomodoro count for work sessions.
        if payload.kind == "work" and payload.completed and payload.task_id is not None:
            task = self.task_repo.get(payload.task_id)
            if task is not None:
                task.completed_pomodoros += 1

        self.repo.commit()
        self.repo.db.refresh(session)
        return session

    def stats(self) -> PomodoroStats:
        now = utcnow()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = start_of_day - timedelta(days=start_of_day.weekday())
        return PomodoroStats(
            today_count=self.repo.count_work_since(start_of_day),
            week_count=self.repo.count_work_since(start_of_week),
            total_count=self.repo.count_work_total(),
            total_focus_seconds=self.repo.focus_seconds_total(),
            today_focus_seconds=self.repo.focus_seconds_since(start_of_day),
        )

    def list(self) -> list[PomodoroSession]:
        return self.repo.list()
