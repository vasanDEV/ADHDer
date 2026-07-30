# AGENTS.md

ADHDer is an offline-first Windows productivity app: a **Python/FastAPI + SQLite**
backend, a **React + TypeScript + Vite** frontend, and a **Tauri v2 (WebView2)**
desktop shell in `desktop/`. See `README.md` for the full feature list and the
standard dev/test/build commands; this file only captures non-obvious context.

## Cursor Cloud specific instructions

### Services and how to run them
- **Backend (FastAPI)** — from `backend/`, activate the venv then
  `uvicorn app.main:app --reload --port 8756`. The venv lives at `backend/.venv`
  and is created by the startup update script; always `source backend/.venv/bin/activate`
  before running backend commands or `pytest`.
- **Frontend (Vite)** — from `frontend/`, `pnpm dev` (serves on port **5173**).
- Both are needed to exercise the product. The Vite dev server **proxies `/api`
  and `/health` to `http://127.0.0.1:8756`**, so the frontend uses same-origin
  relative URLs — start the backend first or API calls 502 until it is up.

### Desktop shell caveat (important)
- The `desktop/` Tauri shell targets **Windows + WebView2** and is meant to be
  built/run on Windows. It **cannot be built or run on this Linux VM** (Tauri
  would need WebKitGTK, and the product target is WebView2). Do all development
  and end-to-end testing in a **browser against the Vite dev server** — that is
  exactly what the WebView2 shell renders in production. Do not attempt
  `tauri dev`/`tauri build` here.

### Data / persistence
- SQLite DB defaults to `~/.adhder/adhder.db` (WAL mode). Override the location
  with env vars `ADHDER_DATA_DIR` and `ADHDER_DATABASE_FILENAME`.
- The schema is created automatically on startup (`init_db()` in the FastAPI
  lifespan) — there are no migrations. To reset local state, delete the DB files
  in the data dir, or delete rows via the API.
- Tests (`backend/tests/conftest.py`) set `ADHDER_DATA_DIR` to a temp dir *before*
  importing the app, so `pytest` never touches your real DB.

### Frontend gotchas
- Routing is **hash-based** (`createHashRouter`) so it works identically in the
  browser and inside a `file://`/custom-protocol WebView.
- Griffel (`makeStyles`) rejects the `borderColor` shorthand at type-check time —
  use the full `border` property instead.
- `pnpm build` warns about a large (>500 kB) chunk; this is expected (Fluent UI +
  Markdown editor + KaTeX) and is not an error.
