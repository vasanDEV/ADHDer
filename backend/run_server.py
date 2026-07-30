"""Standalone entry point for running the ADHDer backend.

Used both for local development (``python run_server.py``) and as the target
script when packaging the backend into a sidecar binary with PyInstaller.
"""

from __future__ import annotations

import uvicorn

from app.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
    )


if __name__ == "__main__":
    main()
