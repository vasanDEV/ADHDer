use adhder_core::{AdhderError, EntityId, Result};
use adhder_db::{map_sqlx, DbPool};
use chrono::{DateTime, Utc};
use sqlx::Row;

use crate::domain::{KanbanColumn, Task, TaskPriority};

pub struct TaskRepository<'a> {
    pool: &'a DbPool,
}

impl<'a> TaskRepository<'a> {
    pub fn new(pool: &'a DbPool) -> Self {
        Self { pool }
    }

    pub async fn insert(&self, task: &Task) -> Result<()> {
        sqlx::query(
            r#"INSERT INTO tasks
               (id, title, notes, column_name, priority, is_focus, due_date, created_at, updated_at, position)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(task.id.as_str())
        .bind(&task.title)
        .bind(&task.notes)
        .bind(task.column.as_str())
        .bind(task.priority.as_i64())
        .bind(if task.is_focus { 1 } else { 0 })
        .bind(&task.due_date)
        .bind(task.created_at.to_rfc3339())
        .bind(task.updated_at.to_rfc3339())
        .bind(task.position)
        .execute(self.pool)
        .await
        .map_err(map_sqlx)?;
        Ok(())
    }

    pub async fn update(&self, task: &Task) -> Result<()> {
        let res = sqlx::query(
            r#"UPDATE tasks SET
                title = ?, notes = ?, column_name = ?, priority = ?, is_focus = ?,
                due_date = ?, updated_at = ?, position = ?
               WHERE id = ?"#,
        )
        .bind(&task.title)
        .bind(&task.notes)
        .bind(task.column.as_str())
        .bind(task.priority.as_i64())
        .bind(if task.is_focus { 1 } else { 0 })
        .bind(&task.due_date)
        .bind(task.updated_at.to_rfc3339())
        .bind(task.position)
        .bind(task.id.as_str())
        .execute(self.pool)
        .await
        .map_err(map_sqlx)?;

        if res.rows_affected() == 0 {
            return Err(AdhderError::NotFound(format!("task {}", task.id)));
        }
        Ok(())
    }

    pub async fn get(&self, id: &EntityId) -> Result<Task> {
        let row = sqlx::query("SELECT * FROM tasks WHERE id = ?")
            .bind(id.as_str())
            .fetch_optional(self.pool)
            .await
            .map_err(map_sqlx)?
            .ok_or_else(|| AdhderError::NotFound(format!("task {id}")))?;
        row_to_task(row)
    }

    pub async fn list_by_column(&self, column: KanbanColumn) -> Result<Vec<Task>> {
        let rows = sqlx::query(
            "SELECT * FROM tasks WHERE column_name = ? ORDER BY position ASC, created_at ASC",
        )
        .bind(column.as_str())
        .fetch_all(self.pool)
        .await
        .map_err(map_sqlx)?;
        rows.into_iter().map(row_to_task).collect()
    }

    pub async fn list_all(&self) -> Result<Vec<Task>> {
        let rows =
            sqlx::query("SELECT * FROM tasks ORDER BY column_name, position ASC, created_at ASC")
                .fetch_all(self.pool)
                .await
                .map_err(map_sqlx)?;
        rows.into_iter().map(row_to_task).collect()
    }

    pub async fn list_by_due_date(&self, date: &str) -> Result<Vec<Task>> {
        let rows = sqlx::query(
            "SELECT * FROM tasks WHERE due_date = ? ORDER BY column_name, position ASC, created_at ASC",
        )
        .bind(date)
        .fetch_all(self.pool)
        .await
        .map_err(map_sqlx)?;
        rows.into_iter().map(row_to_task).collect()
    }

    pub async fn list_sorted_by_due_date(&self, ascending: bool) -> Result<Vec<Task>> {
        // NULLs last whether ascending or descending.
        let sql = if ascending {
            "SELECT * FROM tasks ORDER BY (due_date IS NULL), due_date ASC, column_name, position ASC"
        } else {
            "SELECT * FROM tasks ORDER BY (due_date IS NULL), due_date DESC, column_name, position ASC"
        };
        let rows = sqlx::query(sql)
            .fetch_all(self.pool)
            .await
            .map_err(map_sqlx)?;
        rows.into_iter().map(row_to_task).collect()
    }

    pub async fn delete(&self, id: &EntityId) -> Result<()> {
        let res = sqlx::query("DELETE FROM tasks WHERE id = ?")
            .bind(id.as_str())
            .execute(self.pool)
            .await
            .map_err(map_sqlx)?;
        if res.rows_affected() == 0 {
            return Err(AdhderError::NotFound(format!("task {id}")));
        }
        Ok(())
    }

    pub async fn clear_focus(&self) -> Result<()> {
        sqlx::query("UPDATE tasks SET is_focus = 0 WHERE is_focus = 1")
            .execute(self.pool)
            .await
            .map_err(map_sqlx)?;
        Ok(())
    }

    pub async fn get_focus(&self) -> Result<Option<Task>> {
        let row = sqlx::query("SELECT * FROM tasks WHERE is_focus = 1 LIMIT 1")
            .fetch_optional(self.pool)
            .await
            .map_err(map_sqlx)?;
        match row {
            Some(r) => Ok(Some(row_to_task(r)?)),
            None => Ok(None),
        }
    }

    pub async fn next_position(&self, column: KanbanColumn) -> Result<f64> {
        let max: Option<(f64,)> =
            sqlx::query_as("SELECT MAX(position) FROM tasks WHERE column_name = ?")
                .bind(column.as_str())
                .fetch_optional(self.pool)
                .await
                .map_err(map_sqlx)?;
        Ok(max.and_then(|(v,)| Some(v)).unwrap_or(0.0) + 1.0)
    }
}

fn row_to_task(row: sqlx::sqlite::SqliteRow) -> Result<Task> {
    let id = EntityId::parse(row.get::<String, _>("id"))
        .map_err(AdhderError::Internal)?;
    let column = KanbanColumn::parse(&row.get::<String, _>("column_name"))?;
    let priority = TaskPriority::from_i64(row.get::<i64, _>("priority"))?;
    let created_at = parse_dt(&row.get::<String, _>("created_at"))?;
    let updated_at = parse_dt(&row.get::<String, _>("updated_at"))?;
    Ok(Task {
        id,
        title: row.get("title"),
        notes: row.get("notes"),
        column,
        priority,
        is_focus: row.get::<i64, _>("is_focus") == 1,
        due_date: row.get("due_date"),
        created_at,
        updated_at,
        position: row.get("position"),
    })
}

fn parse_dt(s: &str) -> Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .map(|d| d.with_timezone(&Utc))
        .map_err(|e| AdhderError::Storage(e.to_string()))
}
