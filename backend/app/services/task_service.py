"""Task business logic.

Because a planner entry is simply a ``Task`` with a ``planner_date`` set, the
Planner <-> Task Board synchronization required by the spec is automatic: both
views read and write the same rows. Marking a task finished on either surface
updates the shared ``status`` / ``completed`` fields.
"""

from __future__ import annotations

from fastapi import HTTPException, status as http_status

from app.database.base import utcnow
from app.models.enums import TaskStatus
from app.models.task import Task
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskMove, TaskUpdate


def _tags_to_str(tags: list[str] | None) -> str | None:
    if not tags:
        return None
    return ",".join(t.strip() for t in tags if t.strip()) or None


class TaskService:
    def __init__(self, repo: TaskRepository) -> None:
        self.repo = repo

    def list(self) -> list[Task]:
        return self.repo.list_ordered()

    def get_or_404(self, task_id: int) -> Task:
        task = self.repo.get(task_id)
        if task is None:
            raise HTTPException(http_status.HTTP_404_NOT_FOUND, detail="Task not found")
        return task

    def create(self, payload: TaskCreate) -> Task:
        task = Task(
            title=payload.title,
            description=payload.description,
            status=payload.status,
            priority=payload.priority,
            due_date=payload.due_date,
            planner_date=payload.planner_date,
            estimated_pomodoros=payload.estimated_pomodoros,
            completed_pomodoros=payload.completed_pomodoros,
            tags=_tags_to_str(payload.tags),
            position=self.repo.next_position(payload.status),
        )
        self._sync_completion(task)
        self.repo.add(task)
        self.repo.commit()
        self.repo.db.refresh(task)
        return task

    def update(self, task_id: int, payload: TaskUpdate) -> Task:
        task = self.get_or_404(task_id)
        data = payload.model_dump(exclude_unset=True)

        if "tags" in data:
            task.tags = _tags_to_str(data.pop("tags"))

        # If the column changes explicitly, append to end of the new column.
        if "status" in data and data["status"] is not None and data["status"] != task.status:
            task.status = data.pop("status")
            task.position = self.repo.next_position(task.status)

        for field_name, value in data.items():
            setattr(task, field_name, value)

        self._sync_completion(task)
        self.repo.commit()
        self.repo.db.refresh(task)
        return task

    def move(self, task_id: int, payload: TaskMove) -> Task:
        """Reorder within/between columns for drag-and-drop."""
        task = self.get_or_404(task_id)
        target_status = payload.status
        target_pos = payload.position

        siblings = [
            t
            for t in self.repo.list_by_status(target_status)
            if t.id != task.id
        ]
        target_pos = max(0, min(target_pos, len(siblings)))
        siblings.insert(target_pos, task)

        task.status = target_status
        for index, sibling in enumerate(siblings):
            sibling.position = index

        self._sync_completion(task)
        self.repo.commit()
        self.repo.db.refresh(task)
        return task

    def delete(self, task_id: int) -> None:
        task = self.get_or_404(task_id)
        self.repo.delete(task)
        self.repo.commit()

    @staticmethod
    def _sync_completion(task: Task) -> None:
        """Keep ``status``/``completed``/``completed_at`` consistent."""
        if task.status == TaskStatus.DONE or task.completed:
            task.status = TaskStatus.DONE
            task.completed = True
            if task.completed_at is None:
                task.completed_at = utcnow()
        else:
            task.completed = False
            task.completed_at = None
