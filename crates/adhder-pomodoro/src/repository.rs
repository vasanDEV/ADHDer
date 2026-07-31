use adhder_core::{AdhderError, EntityId, Result};
use adhder_db::{map_sqlx, DbPool};
use chrono::{DateTime, Utc};
use sqlx::Row;

use crate::{PomodoroSession, SessionKind, SessionStatus};

pub struct PomodoroRepository<'a> {
    pool: &'a DbPool,
}

impl<'a> PomodoroRepository<'a> {
    pub fn new(pool: &'a DbPool) -> Self {
        Self { pool }
    }

    pub async fn insert(&self, s: &PomodoroSession) -> Result<()> {
        sqlx::query(
            r#"INSERT INTO pomodoro_sessions
               (id, task_id, kind, duration_secs, remaining_secs, status, started_at, completed_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(s.id.as_str())
        .bind(s.task_id.as_ref().map(|i| i.as_str().to_string()))
        .bind(s.kind.as_str())
        .bind(s.duration_secs)
        .bind(s.remaining_secs)
        .bind(s.status.as_str())
        .bind(s.started_at.map(|t| t.to_rfc3339()))
        .bind(s.completed_at.map(|t| t.to_rfc3339()))
        .bind(s.created_at.to_rfc3339())
        .bind(s.updated_at.to_rfc3339())
        .execute(self.pool)
        .await
        .map_err(map_sqlx)?;
        Ok(())
    }

    pub async fn update(&self, s: &PomodoroSession) -> Result<()> {
        let res = sqlx::query(
            r#"UPDATE pomodoro_sessions SET
                task_id=?, kind=?, duration_secs=?, remaining_secs=?, status=?,
                started_at=?, completed_at=?, updated_at=?
               WHERE id=?"#,
        )
        .bind(s.task_id.as_ref().map(|i| i.as_str().to_string()))
        .bind(s.kind.as_str())
        .bind(s.duration_secs)
        .bind(s.remaining_secs)
        .bind(s.status.as_str())
        .bind(s.started_at.map(|t| t.to_rfc3339()))
        .bind(s.completed_at.map(|t| t.to_rfc3339()))
        .bind(s.updated_at.to_rfc3339())
        .bind(s.id.as_str())
        .execute(self.pool)
        .await
        .map_err(map_sqlx)?;
        if res.rows_affected() == 0 {
            return Err(AdhderError::NotFound(format!("session {}", s.id)));
        }
        Ok(())
    }

    pub async fn get(&self, id: &EntityId) -> Result<PomodoroSession> {
        let row = sqlx::query("SELECT * FROM pomodoro_sessions WHERE id = ?")
            .bind(id.as_str())
            .fetch_optional(self.pool)
            .await
            .map_err(map_sqlx)?
            .ok_or_else(|| AdhderError::NotFound(format!("session {id}")))?;
        row_to_session(row)
    }

    pub async fn get_active(&self) -> Result<Option<PomodoroSession>> {
        let row = sqlx::query(
            "SELECT * FROM pomodoro_sessions WHERE status IN ('running','paused','idle') ORDER BY updated_at DESC LIMIT 1",
        )
        .fetch_optional(self.pool)
        .await
        .map_err(map_sqlx)?;
        match row {
            Some(r) => Ok(Some(row_to_session(r)?)),
            None => Ok(None),
        }
    }
}

fn row_to_session(row: sqlx::sqlite::SqliteRow) -> Result<PomodoroSession> {
    Ok(PomodoroSession {
        id: EntityId::parse(row.get::<String, _>("id")).map_err(AdhderError::Internal)?,
        task_id: row
            .get::<Option<String>, _>("task_id")
            .map(|s| EntityId::parse(s).map_err(AdhderError::Internal))
            .transpose()?,
        kind: SessionKind::parse(&row.get::<String, _>("kind"))?,
        duration_secs: row.get("duration_secs"),
        remaining_secs: row.get("remaining_secs"),
        status: SessionStatus::parse(&row.get::<String, _>("status"))?,
        started_at: row
            .get::<Option<String>, _>("started_at")
            .map(|s| parse_dt(&s))
            .transpose()?,
        completed_at: row
            .get::<Option<String>, _>("completed_at")
            .map(|s| parse_dt(&s))
            .transpose()?,
        created_at: parse_dt(&row.get::<String, _>("created_at"))?,
        updated_at: parse_dt(&row.get::<String, _>("updated_at"))?,
    })
}

fn parse_dt(s: &str) -> Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .map(|d| d.with_timezone(&Utc))
        .map_err(|e| AdhderError::Storage(e.to_string()))
}
