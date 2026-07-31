//! Aggregated statistics for Dashboard and Pomodoro.

use std::sync::Arc;

use adhder_core::{Clock, DomainEvent, EventBus, Result, SystemClock};
use adhder_db::{map_sqlx, DbPool};
use chrono::Duration;
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DailyStats {
    pub day: String,
    pub focus_sessions: i64,
    pub focus_seconds: i64,
    pub tasks_finished: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DashboardStats {
    pub focus_sessions: i64,
    pub focus_minutes: i64,
    pub focus_score: i64,
    pub tasks_finished: i64,
}

pub struct StatsService {
    pool: DbPool,
    clock: Arc<dyn Clock>,
}

impl StatsService {
    pub fn new(pool: DbPool) -> Self {
        Self {
            pool,
            clock: Arc::new(SystemClock),
        }
    }

    /// Apply drained domain events into daily aggregates.
    pub async fn apply_events(&self, events: &[DomainEvent]) -> Result<()> {
        let today = self.clock.now_utc().date_naive().to_string();
        for event in events {
            match event {
                DomainEvent::PomodoroCompleted { .. } => {
                    self.bump(&today, 1, 25 * 60, 0).await?;
                }
                DomainEvent::TaskMoved { to, .. } if to == "finished" => {
                    self.bump(&today, 0, 0, 1).await?;
                }
                _ => {}
            }
        }
        Ok(())
    }

    pub async fn today(&self) -> Result<DailyStats> {
        let today = self.clock.now_utc().date_naive().to_string();
        self.for_day(&today).await
    }

    pub async fn for_day(&self, day: &str) -> Result<DailyStats> {
        let row = sqlx::query("SELECT * FROM stats_daily WHERE day = ?")
            .bind(day)
            .fetch_optional(&self.pool)
            .await
            .map_err(map_sqlx)?;
        Ok(match row {
            Some(r) => DailyStats {
                day: r.get("day"),
                focus_sessions: r.get("focus_sessions"),
                focus_seconds: r.get("focus_seconds"),
                tasks_finished: r.get("tasks_finished"),
            },
            None => DailyStats {
                day: day.to_string(),
                ..Default::default()
            },
        })
    }

    pub async fn dashboard(&self) -> Result<DashboardStats> {
        let daily = self.today().await?;
        let focus_minutes = daily.focus_seconds / 60;
        // Simple calm score: sessions * 15 capped at 100, plus minutes/2 contribution.
        let focus_score = (daily.focus_sessions * 15 + focus_minutes / 2).min(100);
        Ok(DashboardStats {
            focus_sessions: daily.focus_sessions,
            focus_minutes,
            focus_score,
            tasks_finished: daily.tasks_finished,
        })
    }

    /// Helper used by bridges that share an event bus.
    pub async fn sync_from_bus(&self, bus: &dyn EventBus) -> Result<()> {
        let events = bus.drain();
        self.apply_events(&events).await
    }

    async fn bump(
        &self,
        day: &str,
        sessions: i64,
        seconds: i64,
        finished: i64,
    ) -> Result<()> {
        sqlx::query(
            r#"INSERT INTO stats_daily (day, focus_sessions, focus_seconds, tasks_finished)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(day) DO UPDATE SET
                 focus_sessions = focus_sessions + excluded.focus_sessions,
                 focus_seconds = focus_seconds + excluded.focus_seconds,
                 tasks_finished = tasks_finished + excluded.tasks_finished"#,
        )
        .bind(day)
        .bind(sessions)
        .bind(seconds)
        .bind(finished)
        .execute(&self.pool)
        .await
        .map_err(map_sqlx)?;
        Ok(())
    }
}

/// Ensure unused import for Duration stays available for future windows.
#[allow(dead_code)]
fn _week_window() -> Duration {
    Duration::days(7)
}

#[cfg(test)]
mod tests {
    use super::*;
    use adhder_core::{EntityId, InMemoryEventBus};
    use adhder_db::open_in_memory;
    use adhder_pomodoro::{PomodoroService, SessionKind};
    use adhder_tasks::{CreateTask, KanbanColumn, TaskService};

    #[tokio::test]
    async fn aggregates_pomodoro_and_finished_tasks() {
        let pool = open_in_memory().await.unwrap();
        let bus = Arc::new(InMemoryEventBus::new());
        let tasks = TaskService::new(pool.clone(), bus.clone());
        let pomo = PomodoroService::new(pool.clone(), bus.clone());
        let stats = StatsService::new(pool);

        let task = tasks
            .create(CreateTask {
                title: "Ship v0.1".into(),
                notes: None,
                column: None,
                priority: None,
                due_date: None,
            })
            .await
            .unwrap();
        tasks
            .move_to(&task.id, KanbanColumn::Finished)
            .await
            .unwrap();

        let session = pomo
            .prepare(SessionKind::Focus, Some(1), Some(task.id.clone()))
            .await
            .unwrap();
        pomo.start(&session.id).await.unwrap();
        pomo.tick(&session.id, 1).await.unwrap();

        stats.sync_from_bus(bus.as_ref()).await.unwrap();
        let dash = stats.dashboard().await.unwrap();
        assert!(dash.focus_sessions >= 1);
        assert!(dash.tasks_finished >= 1);
        assert!(dash.focus_score > 0);
        let _ = EntityId::new();
    }
}
