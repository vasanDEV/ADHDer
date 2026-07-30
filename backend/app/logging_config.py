"""Logging configuration.

Writes rotating logs to ``<data_dir>/adhder.log`` (default
``~/.adhder/adhder.log``) so issues are diagnosable even in the packaged desktop
app, which has no console attached.
"""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app.config import get_settings

_FORMAT = "%(asctime)s %(levelname)-7s %(name)s: %(message)s"


def configure_logging() -> Path:
    """Attach a rotating file handler (and console handler) to the root logger."""
    settings = get_settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    log_path = settings.data_dir / "adhder.log"

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # Avoid duplicate handlers when uvicorn --reload re-imports the app.
    already = any(
        isinstance(h, RotatingFileHandler) and getattr(h, "_adhder", False) for h in root.handlers
    )
    if not already:
        file_handler = RotatingFileHandler(
            log_path, maxBytes=1_000_000, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(logging.Formatter(_FORMAT))
        file_handler._adhder = True  # type: ignore[attr-defined]
        root.addHandler(file_handler)

        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(logging.Formatter(_FORMAT))
        root.addHandler(stream_handler)

    # Keep the log readable: SQLAlchemy's statement echo is very noisy.
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return log_path

