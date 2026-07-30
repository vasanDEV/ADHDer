"""Standalone entry point for running the ADHDer backend.

Used both for local development (``python run_server.py``) and as the target
script when packaging the backend into a sidecar binary with PyInstaller.

IMPORTANT: import the ASGI ``app`` object directly and hand it to uvicorn,
rather than using the ``"app.main:app"`` import string. PyInstaller only bundles
modules that are imported statically, so the string form leaves ``app.main`` out
of the frozen executable and uvicorn fails with "Could not import module
app.main". Importing it here guarantees the whole app is bundled.
"""

from __future__ import annotations

import uvicorn

from app.config import get_settings
from app.main import app


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        # Explicit, dependency-light implementations so the frozen (PyInstaller)
        # binary doesn't rely on optional native extras (uvloop/httptools) or
        # websockets, which aren't needed for this local REST API.
        loop="asyncio",
        http="h11",
        ws="none",
        log_level="info",
    )


if __name__ == "__main__":
    main()
