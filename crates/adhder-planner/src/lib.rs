//! Calendar / agenda planning.

use std::sync::Arc;

use adhder_core::{
    AdhderError, Clock, DomainEvent, EntityId, EventBus, Result, SystemClock,
};
use adhder_db::{map_sqlx, DbPool};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PlannerItem {
    pub id: EntityId,
    pub date: String,
    pub title: String,
    pub notes: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub task_id: Option<EntityId>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePlannerItem {
    pub date: String,
    pub title: String,
    pub notes: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub task_id: Option<String>,
}

pub struct PlannerService {
    pool: DbPool,
    events: Arc<dyn EventBus>,
    clock: Arc<dyn Clock>,
}

impl PlannerService {
    pub fn new(pool: DbPool, events: Arc<dyn EventBus>) -> Self {
        Self {
            pool,
            events,
            clock: Arc::new(SystemClock),
        }
    }

    pub async fn create(&self, input: CreatePlannerItem) -> Result<PlannerItem> {
        validate_date(&input.date)?;
        let title = input.title.trim().to_string();
        if title.is_empty() {
            return Err(AdhderError::Validation(
                "planner title must not be empty".into(),
            ));
        }
        let now = self.clock.now_utc();
        let item = PlannerItem {
            id: EntityId::new(),
            date: input.date,
            title,
            notes: input.notes.unwrap_or_default(),
            start_time: input.start_time,
            end_time: input.end_time,
            task_id: input
                .task_id
                .map(|id| EntityId::parse(id).map_err(AdhderError::Validation))
                .transpose()?,
            created_at: now,
            updated_at: now,
        };
        sqlx::query(
            r#"INSERT INTO planner_items
               (id, date, title, notes, start_time, end_time, task_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(item.id.as_str())
        .bind(&item.date)
        .bind(&item.title)
        .bind(&item.notes)
        .bind(&item.start_time)
        .bind(&item.end_time)
        .bind(item.task_id.as_ref().map(|i| i.as_str().to_string()))
        .bind(item.created_at.to_rfc3339())
        .bind(item.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await
        .map_err(map_sqlx)?;

        self.events.publish(DomainEvent::PlannerItemUpserted {
            id: item.id.clone(),
            date: item.date.clone(),
        });
        Ok(item)
    }

    pub async fn list_for_date(&self, date: &str) -> Result<Vec<PlannerItem>> {
        validate_date(date)?;
        let rows = sqlx::query(
            "SELECT * FROM planner_items WHERE date = ? ORDER BY start_time IS NULL, start_time ASC, created_at ASC",
        )
        .bind(date)
        .fetch_all(&self.pool)
        .await
        .map_err(map_sqlx)?;
        rows.into_iter().map(row_to_item).collect()
    }

    pub async fn delete(&self, id: &EntityId) -> Result<()> {
        let res = sqlx::query("DELETE FROM planner_items WHERE id = ?")
            .bind(id.as_str())
            .execute(&self.pool)
            .await
            .map_err(map_sqlx)?;
        if res.rows_affected() == 0 {
            return Err(AdhderError::NotFound(format!("planner item {id}")));
        }
        Ok(())
    }
}

fn validate_date(date: &str) -> Result<()> {
    NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| AdhderError::Validation(format!("date must be YYYY-MM-DD, got '{date}'")))
}

fn row_to_item(row: sqlx::sqlite::SqliteRow) -> Result<PlannerItem> {
    Ok(PlannerItem {
        id: EntityId::parse(row.get::<String, _>("id")).map_err(AdhderError::Internal)?,
        date: row.get("date"),
        title: row.get("title"),
        notes: row.get("notes"),
        start_time: row.get("start_time"),
        end_time: row.get("end_time"),
        task_id: row
            .get::<Option<String>, _>("task_id")
            .map(|s| EntityId::parse(s).map_err(AdhderError::Internal))
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

#[cfg(test)]
mod tests {
    use super::*;
    use adhder_core::InMemoryEventBus;
    use adhder_db::open_in_memory;

    #[tokio::test]
    async fn agenda_for_day() {
        let pool = open_in_memory().await.unwrap();
        let svc = PlannerService::new(pool, Arc::new(InMemoryEventBus::new()));
        svc.create(CreatePlannerItem {
            date: "2026-07-31".into(),
            title: "Review Notes".into(),
            notes: None,
            start_time: Some("14:00".into()),
            end_time: Some("15:00".into()),
            task_id: None,
        })
        .await
        .unwrap();
        let items = svc.list_for_date("2026-07-31").await.unwrap();
        assert_eq!(items.len(), 1);
        assert!(svc.list_for_date("2026-08-01").await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn rejects_bad_date() {
        let pool = open_in_memory().await.unwrap();
        let svc = PlannerService::new(pool, Arc::new(InMemoryEventBus::new()));
        let err = svc
            .create(CreatePlannerItem {
                date: "31-07-2026".into(),
                title: "x".into(),
                notes: None,
                start_time: None,
                end_time: None,
                task_id: None,
            })
            .await
            .unwrap_err();
        assert!(matches!(err, AdhderError::Validation(_)));
    }
}
