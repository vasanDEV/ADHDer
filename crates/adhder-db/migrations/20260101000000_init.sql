-- ADHDer schema v1 (offline-first SQLite)

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    column_name TEXT NOT NULL CHECK (column_name IN ('todo', 'working', 'finished')),
    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
    is_focus INTEGER NOT NULL DEFAULT 0 CHECK (is_focus IN (0, 1)),
    due_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    position REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_name, position);
CREATE INDEX IF NOT EXISTS idx_tasks_focus ON tasks(is_focus);

CREATE TABLE IF NOT EXISTS note_folders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    folder_id TEXT REFERENCES note_folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    format TEXT NOT NULL DEFAULT 'rich_text' CHECK (format IN ('rich_text', 'markdown')),
    pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('focus', 'short_break', 'long_break')),
    duration_secs INTEGER NOT NULL,
    remaining_secs INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'paused', 'completed')),
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planner_items (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    start_time TEXT,
    end_time TEXT,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_planner_date ON planner_items(date);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stats_daily (
    day TEXT PRIMARY KEY NOT NULL,
    focus_sessions INTEGER NOT NULL DEFAULT 0,
    focus_seconds INTEGER NOT NULL DEFAULT 0,
    tasks_finished INTEGER NOT NULL DEFAULT 0
);
