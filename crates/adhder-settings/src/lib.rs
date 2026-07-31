//! Preferences, backup / export / import orchestration.

use std::collections::BTreeMap;
use std::path::Path;
use std::sync::Arc;

use adhder_core::{AdhderError, DomainEvent, EventBus, Result};
use adhder_db::{map_sqlx, DbPool};
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Preferences {
    pub focus_duration_secs: i64,
    pub short_break_secs: i64,
    pub long_break_secs: i64,
    pub notifications_enabled: bool,
    pub pomodoro_notifications: bool,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            focus_duration_secs: 25 * 60,
            short_break_secs: 5 * 60,
            long_break_secs: 15 * 60,
            notifications_enabled: false,
            pomodoro_notifications: true,
        }
    }
}

pub struct SettingsService {
    pool: DbPool,
    events: Arc<dyn EventBus>,
}

impl SettingsService {
    pub fn new(pool: DbPool, events: Arc<dyn EventBus>) -> Self {
        Self { pool, events }
    }

    pub async fn get_preferences(&self) -> Result<Preferences> {
        let mut prefs = Preferences::default();
        let rows = sqlx::query("SELECT key, value FROM settings")
            .fetch_all(&self.pool)
            .await
            .map_err(map_sqlx)?;
        for row in rows {
            let key: String = row.get("key");
            let value: String = row.get("value");
            match key.as_str() {
                "focus_duration_secs" => {
                    prefs.focus_duration_secs = value.parse().unwrap_or(prefs.focus_duration_secs)
                }
                "short_break_secs" => {
                    prefs.short_break_secs = value.parse().unwrap_or(prefs.short_break_secs)
                }
                "long_break_secs" => {
                    prefs.long_break_secs = value.parse().unwrap_or(prefs.long_break_secs)
                }
                "notifications_enabled" => {
                    prefs.notifications_enabled = value == "true" || value == "1"
                }
                "pomodoro_notifications" => {
                    prefs.pomodoro_notifications = value != "false" && value != "0"
                }
                _ => {}
            }
        }
        Ok(prefs)
    }

    pub async fn set_preference(&self, key: &str, value: &str) -> Result<Preferences> {
        let allowed = [
            "focus_duration_secs",
            "short_break_secs",
            "long_break_secs",
            "notifications_enabled",
            "pomodoro_notifications",
        ];
        if !allowed.contains(&key) {
            return Err(AdhderError::Validation(format!(
                "unknown preference key '{key}'"
            )));
        }
        if key.ends_with("_secs") {
            let n: i64 = value
                .parse()
                .map_err(|_| AdhderError::Validation(format!("'{value}' is not an integer")))?;
            if n <= 0 {
                return Err(AdhderError::Validation(
                    "duration preference must be positive".into(),
                ));
            }
        }
        sqlx::query(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .bind(key)
        .bind(value)
        .execute(&self.pool)
        .await
        .map_err(map_sqlx)?;
        self.events.publish(DomainEvent::SettingsChanged {
            key: key.to_string(),
        });
        self.get_preferences().await
    }

    /// Export all user tables as JSON (portable backup artifact).
    pub async fn export_json(&self) -> Result<String> {
        let payload = self.snapshot().await?;
        serde_json::to_string_pretty(&payload)
            .map_err(|e| AdhderError::Internal(e.to_string()))
    }

    /// Write export JSON to a file path (bridge supplies path via SAF copy as needed).
    pub async fn backup_to_path(&self, path: impl AsRef<Path>) -> Result<()> {
        let json = self.export_json().await?;
        std::fs::write(path.as_ref(), json)
            .map_err(|e| AdhderError::Storage(format!("backup write failed: {e}")))
    }

    /// Validate then replace mutable user data from a backup JSON.
    /// On validation failure, existing DB is untouched.
    pub async fn import_json(&self, json: &str) -> Result<()> {
        let snapshot: BackupSnapshot = serde_json::from_str(json).map_err(|e| {
            AdhderError::Validation(format!("invalid backup JSON: {e}"))
        })?;
        if snapshot.version != 1 {
            return Err(AdhderError::Validation(format!(
                "unsupported backup version {}",
                snapshot.version
            )));
        }

        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(map_sqlx)?;

        // Clear mutable tables in FK-safe order
        for table in [
            "pomodoro_sessions",
            "planner_items",
            "notes",
            "note_folders",
            "tasks",
            "stats_daily",
            "settings",
        ] {
            sqlx::query(&format!("DELETE FROM {table}"))
                .execute(&mut *tx)
                .await
                .map_err(map_sqlx)?;
        }

        for row in &snapshot.settings {
            sqlx::query("INSERT INTO settings (key, value) VALUES (?, ?)")
                .bind(&row.key)
                .bind(&row.value)
                .execute(&mut *tx)
                .await
                .map_err(map_sqlx)?;
        }
        for row in &snapshot.tasks {
            sqlx::query(
                r#"INSERT INTO tasks
                   (id, title, notes, column_name, priority, is_focus, due_date, created_at, updated_at, position)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
            )
            .bind(&row.id)
            .bind(&row.title)
            .bind(&row.notes)
            .bind(&row.column_name)
            .bind(row.priority)
            .bind(row.is_focus)
            .bind(&row.due_date)
            .bind(&row.created_at)
            .bind(&row.updated_at)
            .bind(row.position)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx)?;
        }
        for row in &snapshot.note_folders {
            sqlx::query(
                "INSERT INTO note_folders (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            )
            .bind(&row.id)
            .bind(&row.name)
            .bind(&row.created_at)
            .bind(&row.updated_at)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx)?;
        }
        for row in &snapshot.notes {
            sqlx::query(
                r#"INSERT INTO notes
                   (id, folder_id, title, content, format, pinned, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
            )
            .bind(&row.id)
            .bind(&row.folder_id)
            .bind(&row.title)
            .bind(&row.content)
            .bind(&row.format)
            .bind(row.pinned)
            .bind(&row.created_at)
            .bind(&row.updated_at)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx)?;
        }
        for row in &snapshot.planner_items {
            sqlx::query(
                r#"INSERT INTO planner_items
                   (id, date, title, notes, start_time, end_time, task_id, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
            )
            .bind(&row.id)
            .bind(&row.date)
            .bind(&row.title)
            .bind(&row.notes)
            .bind(&row.start_time)
            .bind(&row.end_time)
            .bind(&row.task_id)
            .bind(&row.created_at)
            .bind(&row.updated_at)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx)?;
        }
        for row in &snapshot.stats_daily {
            sqlx::query(
                "INSERT INTO stats_daily (day, focus_sessions, focus_seconds, tasks_finished) VALUES (?, ?, ?, ?)",
            )
            .bind(&row.day)
            .bind(row.focus_sessions)
            .bind(row.focus_seconds)
            .bind(row.tasks_finished)
            .execute(&mut *tx)
            .await
            .map_err(map_sqlx)?;
        }

        tx.commit().await.map_err(map_sqlx)?;
        self.events.publish(DomainEvent::SettingsChanged {
            key: "import".into(),
        });
        Ok(())
    }

    pub async fn import_from_path(&self, path: impl AsRef<Path>) -> Result<()> {
        let json = std::fs::read_to_string(path.as_ref())
            .map_err(|e| AdhderError::Storage(format!("import read failed: {e}")))?;
        self.import_json(&json).await
    }

    async fn snapshot(&self) -> Result<BackupSnapshot> {
        let settings = sqlx::query("SELECT key, value FROM settings")
            .fetch_all(&self.pool)
            .await
            .map_err(map_sqlx)?
            .into_iter()
            .map(|r| SettingRow {
                key: r.get("key"),
                value: r.get("value"),
            })
            .collect();

        let tasks = sqlx::query("SELECT * FROM tasks")
            .fetch_all(&self.pool)
            .await
            .map_err(map_sqlx)?
            .into_iter()
            .map(|r| TaskRow {
                id: r.get("id"),
                title: r.get("title"),
                notes: r.get("notes"),
                column_name: r.get("column_name"),
                priority: r.get("priority"),
                is_focus: r.get("is_focus"),
                due_date: r.get("due_date"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                position: r.get("position"),
            })
            .collect();

        let note_folders = sqlx::query("SELECT * FROM note_folders")
            .fetch_all(&self.pool)
            .await
            .map_err(map_sqlx)?
            .into_iter()
            .map(|r| FolderRow {
                id: r.get("id"),
                name: r.get("name"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            })
            .collect();

        let notes = sqlx::query("SELECT * FROM notes")
            .fetch_all(&self.pool)
            .await
            .map_err(map_sqlx)?
            .into_iter()
            .map(|r| NoteRow {
                id: r.get("id"),
                folder_id: r.get("folder_id"),
                title: r.get("title"),
                content: r.get("content"),
                format: r.get("format"),
                pinned: r.get("pinned"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            })
            .collect();

        let planner_items = sqlx::query("SELECT * FROM planner_items")
            .fetch_all(&self.pool)
            .await
            .map_err(map_sqlx)?
            .into_iter()
            .map(|r| PlannerRow {
                id: r.get("id"),
                date: r.get("date"),
                title: r.get("title"),
                notes: r.get("notes"),
                start_time: r.get("start_time"),
                end_time: r.get("end_time"),
                task_id: r.get("task_id"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            })
            .collect();

        let stats_daily = sqlx::query("SELECT * FROM stats_daily")
            .fetch_all(&self.pool)
            .await
            .map_err(map_sqlx)?
            .into_iter()
            .map(|r| StatsRow {
                day: r.get("day"),
                focus_sessions: r.get("focus_sessions"),
                focus_seconds: r.get("focus_seconds"),
                tasks_finished: r.get("tasks_finished"),
            })
            .collect();

        Ok(BackupSnapshot {
            version: 1,
            meta: BTreeMap::from([("app".into(), "ADHDer".into())]),
            settings,
            tasks,
            note_folders,
            notes,
            planner_items,
            stats_daily,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct BackupSnapshot {
    version: u32,
    meta: BTreeMap<String, String>,
    settings: Vec<SettingRow>,
    tasks: Vec<TaskRow>,
    note_folders: Vec<FolderRow>,
    notes: Vec<NoteRow>,
    planner_items: Vec<PlannerRow>,
    stats_daily: Vec<StatsRow>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SettingRow {
    key: String,
    value: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct TaskRow {
    id: String,
    title: String,
    notes: String,
    column_name: String,
    priority: i64,
    is_focus: i64,
    due_date: Option<String>,
    created_at: String,
    updated_at: String,
    position: f64,
}
#[derive(Debug, Serialize, Deserialize)]
struct FolderRow {
    id: String,
    name: String,
    created_at: String,
    updated_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct NoteRow {
    id: String,
    folder_id: Option<String>,
    title: String,
    content: String,
    format: String,
    pinned: i64,
    created_at: String,
    updated_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct PlannerRow {
    id: String,
    date: String,
    title: String,
    notes: String,
    start_time: Option<String>,
    end_time: Option<String>,
    task_id: Option<String>,
    created_at: String,
    updated_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct StatsRow {
    day: String,
    focus_sessions: i64,
    focus_seconds: i64,
    tasks_finished: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use adhder_core::InMemoryEventBus;
    use adhder_db::open_in_memory;

    #[tokio::test]
    async fn preferences_round_trip() {
        let pool = open_in_memory().await.unwrap();
        let svc = SettingsService::new(pool, Arc::new(InMemoryEventBus::new()));
        let prefs = svc
            .set_preference("focus_duration_secs", "1500")
            .await
            .unwrap();
        assert_eq!(prefs.focus_duration_secs, 1500);
    }

    #[tokio::test]
    async fn backup_import_round_trip_and_reject_bad_json() {
        let pool = open_in_memory().await.unwrap();
        let svc = SettingsService::new(pool, Arc::new(InMemoryEventBus::new()));
        svc.set_preference("notifications_enabled", "true")
            .await
            .unwrap();
        let json = svc.export_json().await.unwrap();
        assert!(json.contains("notifications_enabled"));

        let err = svc.import_json("{not-json").await.unwrap_err();
        assert!(matches!(err, AdhderError::Validation(_)));

        // Existing prefs still intact after failed import
        let prefs = svc.get_preferences().await.unwrap();
        assert!(prefs.notifications_enabled);

        svc.import_json(&json).await.unwrap();
        let prefs = svc.get_preferences().await.unwrap();
        assert!(prefs.notifications_enabled);
    }

    #[tokio::test]
    async fn backup_to_file() {
        let pool = open_in_memory().await.unwrap();
        let svc = SettingsService::new(pool, Arc::new(InMemoryEventBus::new()));
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("backup.json");
        svc.backup_to_path(&path).await.unwrap();
        assert!(path.exists());
        svc.import_from_path(&path).await.unwrap();
    }
}
