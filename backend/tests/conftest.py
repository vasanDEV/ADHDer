"""Pytest fixtures. Each test session runs against an isolated temp database."""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator

import pytest

# Point the app at a throwaway data dir *before* importing the app so the
# module-level engine binds to the temp SQLite file.
_TMP_DIR = tempfile.mkdtemp(prefix="adhder-test-")
os.environ["ADHDER_DATA_DIR"] = _TMP_DIR
os.environ["ADHDER_DATABASE_FILENAME"] = "test.db"

from fastapi.testclient import TestClient  # noqa: E402

from app.database.session import init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _init_schema() -> None:
    init_db()


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
