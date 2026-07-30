"""Planner REST endpoints.

The planner is a date-oriented view over tasks. Creating a planner entry simply
creates a Task with ``planner_date`` set (and status TODO), which is why planner
entries automatically appear on the Task Board and vice-versa.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

from app.api.deps import TaskServiceDep
from app.schemas.task import TaskCreate, TaskRead

router = APIRouter(prefix="/planner", tags=["planner"])


@router.get("/range", response_model=list[TaskRead])
def planner_range(
    service: TaskServiceDep,
    start: date = Query(...),
    end: date = Query(...),
) -> list[TaskRead]:
    """Return tasks whose ``planner_date`` falls within [start, end]."""
    return service.repo.list_between_planner_dates(start, end)  # type: ignore[return-value]


@router.get("/day/{day}", response_model=list[TaskRead])
def planner_day(day: date, service: TaskServiceDep) -> list[TaskRead]:
    return service.repo.list_by_planner_date(day)  # type: ignore[return-value]


@router.post("/day/{day}", response_model=TaskRead)
def planner_add(day: date, payload: TaskCreate, service: TaskServiceDep) -> TaskRead:
    """Create a task scheduled for ``day`` (also shows up on the board)."""
    payload.planner_date = day
    return service.create(payload)  # type: ignore[return-value]
