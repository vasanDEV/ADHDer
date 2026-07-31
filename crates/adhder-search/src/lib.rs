//! Local search over notes and tasks (offline).

use adhder_core::Result;
use adhder_db::{map_sqlx, DbPool};
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SearchHitKind {
    Task,
    Note,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SearchHit {
    pub kind: SearchHitKind,
    pub id: String,
    pub title: String,
    pub snippet: String,
}

pub struct SearchService {
    pool: DbPool,
}

impl SearchService {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn query(&self, q: &str, limit: i64) -> Result<Vec<SearchHit>> {
        let q = q.trim();
        if q.is_empty() {
            return Ok(vec![]);
        }
        let like = format!("%{}%", escape_like(q));
        let limit = limit.clamp(1, 50);

        let mut hits = Vec::new();

        let tasks = sqlx::query(
            r#"SELECT id, title, notes FROM tasks
               WHERE title LIKE ? ESCAPE '\' OR notes LIKE ? ESCAPE '\'
               LIMIT ?"#,
        )
        .bind(&like)
        .bind(&like)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(map_sqlx)?;

        for row in tasks {
            let title: String = row.get("title");
            let notes: String = row.get("notes");
            hits.push(SearchHit {
                kind: SearchHitKind::Task,
                id: row.get("id"),
                title: title.clone(),
                snippet: truncate(&notes, 80),
            });
        }

        let notes = sqlx::query(
            r#"SELECT id, title, content FROM notes
               WHERE title LIKE ? ESCAPE '\' OR content LIKE ? ESCAPE '\'
               LIMIT ?"#,
        )
        .bind(&like)
        .bind(&like)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(map_sqlx)?;

        for row in notes {
            let title: String = row.get("title");
            let content: String = row.get("content");
            hits.push(SearchHit {
                kind: SearchHitKind::Note,
                id: row.get("id"),
                title,
                snippet: truncate(&content, 80),
            });
        }

        hits.truncate(limit as usize);
        Ok(hits)
    }
}

fn escape_like(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn truncate(s: &str, max: usize) -> String {
    let trimmed: String = s.chars().take(max).collect();
    if s.chars().count() > max {
        format!("{trimmed}…")
    } else {
        trimmed
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    use adhder_core::InMemoryEventBus;
    use adhder_db::open_in_memory;
    use adhder_notes::{CreateNote, NoteService};
    use adhder_tasks::{CreateTask, TaskService};

    #[tokio::test]
    async fn finds_tasks_and_notes() {
        let pool = open_in_memory().await.unwrap();
        let bus = Arc::new(InMemoryEventBus::new());
        TaskService::new(pool.clone(), bus.clone())
            .create(CreateTask {
                title: "Convolution properties".into(),
                notes: Some("Fourier".into()),
                column: None,
                priority: None,
                due_date: None,
            })
            .await
            .unwrap();
        NoteService::new(pool.clone(), bus)
            .create_note(CreateNote {
                title: Some("Study Plan".into()),
                content: Some("Review convolution".into()),
                folder_id: None,
                format: None,
            })
            .await
            .unwrap();

        let search = SearchService::new(pool);
        let hits = search.query("convolution", 10).await.unwrap();
        assert!(hits.len() >= 2);
    }
}
