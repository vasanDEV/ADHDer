"""Task board / to-do REST endpoints."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import TaskServiceDep
from app.schemas.task import TaskCreate, TaskMove, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
def list_tasks(service: TaskServiceDep) -> list[TaskRead]:
    return service.list()  # type: ignore[return-value]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, service: TaskServiceDep) -> TaskRead:
    return service.create(payload)  # type: ignore[return-value]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, service: TaskServiceDep) -> TaskRead:
    return service.get_or_404(task_id)  # type: ignore[return-value]


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, service: TaskServiceDep) -> TaskRead:
    return service.update(task_id, payload)  # type: ignore[return-value]


@router.post("/{task_id}/move", response_model=TaskRead)
def move_task(task_id: int, payload: TaskMove, service: TaskServiceDep) -> TaskRead:
    return service.move(task_id, payload)  # type: ignore[return-value]


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, service: TaskServiceDep):
    service.delete(task_id)
