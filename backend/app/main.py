"""ADHDer FastAPI application entry point.

Run in development with:

    uvicorn app.main:app --reload --port 8756

The app serves a local REST API consumed by the React/WebView2 frontend. It has
no cloud dependency and stores everything in a local SQLite database.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.database.session import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Ensure the SQLite schema exists before serving requests.
    init_db()
    yield


app = FastAPI(
    title=f"{settings.app_name} API",
    version="0.1.0",
    description="Local-first productivity backend for the ADHDer desktop app.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    """Liveness probe used by the desktop shell to await backend readiness."""
    return {"status": "ok", "app": settings.app_name}
