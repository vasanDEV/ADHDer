"""Aggregate API router mounting all feature routers under ``/api``."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import notes, planner, pomodoro, settings, tasks

api_router = APIRouter(prefix="/api")
api_router.include_router(tasks.router)
api_router.include_router(notes.router)
api_router.include_router(pomodoro.router)
api_router.include_router(planner.router)
api_router.include_router(settings.router)
