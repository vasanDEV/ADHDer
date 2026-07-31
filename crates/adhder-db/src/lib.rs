//! SQLite access and migrations for ADHDer.

use adhder_core::{AdhderError, Result};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;
use std::path::Path;
use std::str::FromStr;
use std::time::Duration;

pub type DbPool = SqlitePool;

/// Open (or create) the app database and run migrations.
pub async fn open_database(path: impl AsRef<Path>) -> Result<DbPool> {
    let path = path.as_ref();
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| {
                AdhderError::Storage(format!("create db dir {}: {e}", parent.display()))
            })?;
        }
    }

    let options = SqliteConnectOptions::from_str(&format!("sqlite://{}", path.display()))
        .map_err(|e| AdhderError::Storage(e.to_string()))?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| AdhderError::Storage(e.to_string()))?;

    migrate(&pool).await?;
    Ok(pool)
}

/// In-memory database for tests.
pub async fn open_in_memory() -> Result<DbPool> {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .map_err(|e| AdhderError::Storage(e.to_string()))?;
    migrate(&pool).await?;
    Ok(pool)
}

async fn migrate(pool: &DbPool) -> Result<()> {
    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|e| AdhderError::Storage(format!("migration failed: {e}")))
}

pub fn map_sqlx(err: sqlx::Error) -> AdhderError {
    AdhderError::Storage(err.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn migrations_apply_on_memory_db() {
        let pool = open_in_memory().await.expect("open");
        let tables: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('tasks','notes','pomodoro_sessions','planner_items','settings','stats_daily')",
        )
        .fetch_one(&pool)
        .await
        .expect("count tables");
        assert_eq!(tables.0, 6);
    }

    #[tokio::test]
    async fn file_db_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("adhder.db");
        let pool = open_database(&path).await.expect("open file db");
        sqlx::query("INSERT INTO settings (key, value) VALUES ('test', '1')")
            .execute(&pool)
            .await
            .unwrap();
        pool.close().await;

        let pool2 = open_database(&path).await.expect("reopen");
        let row: (String,) = sqlx::query_as("SELECT value FROM settings WHERE key = 'test'")
            .fetch_one(&pool2)
            .await
            .unwrap();
        assert_eq!(row.0, "1");
    }
}
