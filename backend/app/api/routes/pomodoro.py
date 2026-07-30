"""Pomodoro session + statistics REST endpoints."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import PomodoroServiceDep
from app.schemas.pomodoro import PomodoroCreate, PomodoroRead, PomodoroStats

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])


@router.get("/sessions", response_model=list[PomodoroRead])
def list_sessions(service: PomodoroServiceDep) -> list[PomodoroRead]:
    return service.list()  # type: ignore[return-value]


@router.post("/sessions", response_model=PomodoroRead, status_code=status.HTTP_201_CREATED)
def record_session(payload: PomodoroCreate, service: PomodoroServiceDep) -> PomodoroRead:
    return service.record(payload)  # type: ignore[return-value]


@router.get("/stats", response_model=PomodoroStats)
def get_stats(service: PomodoroServiceDep) -> PomodoroStats:
    return service.stats()
