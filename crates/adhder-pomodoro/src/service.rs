use std::sync::Arc;

use adhder_core::{
    AdhderError, Clock, DomainEvent, EntityId, EventBus, Result, SystemClock,
};
use adhder_db::DbPool;

use crate::repository::PomodoroRepository;
use crate::{PomodoroSession, SessionKind, SessionStatus};

pub struct PomodoroService {
    pool: DbPool,
    events: Arc<dyn EventBus>,
    clock: Arc<dyn Clock>,
}

impl PomodoroService {
    pub fn new(pool: DbPool, events: Arc<dyn EventBus>) -> Self {
        Self {
            pool,
            events,
            clock: Arc::new(SystemClock),
        }
    }

    pub async fn prepare(
        &self,
        kind: SessionKind,
        duration_secs: Option<i64>,
        task_id: Option<EntityId>,
    ) -> Result<PomodoroSession> {
        let duration = duration_secs.unwrap_or_else(|| kind.default_secs());
        if duration <= 0 {
            return Err(AdhderError::Validation(
                "duration_secs must be positive".into(),
            ));
        }
        let now = self.clock.now_utc();
        let session = PomodoroSession {
            id: EntityId::new(),
            task_id,
            kind,
            duration_secs: duration,
            remaining_secs: duration,
            status: SessionStatus::Idle,
            started_at: None,
            completed_at: None,
            created_at: now,
            updated_at: now,
        };
        PomodoroRepository::new(&self.pool)
            .insert(&session)
            .await?;
        Ok(session)
    }

    pub async fn start(&self, id: &EntityId) -> Result<PomodoroSession> {
        let repo = PomodoroRepository::new(&self.pool);
        let mut s = repo.get(id).await?;
        match s.status {
            SessionStatus::Idle | SessionStatus::Paused => {
                s.status = SessionStatus::Running;
                if s.started_at.is_none() {
                    s.started_at = Some(self.clock.now_utc());
                }
                s.updated_at = self.clock.now_utc();
                repo.update(&s).await?;
                Ok(s)
            }
            SessionStatus::Running => Ok(s),
            SessionStatus::Completed => Err(AdhderError::Conflict(
                "cannot start a completed session".into(),
            )),
        }
    }

    pub async fn pause(&self, id: &EntityId) -> Result<PomodoroSession> {
        let repo = PomodoroRepository::new(&self.pool);
        let mut s = repo.get(id).await?;
        if s.status != SessionStatus::Running {
            return Err(AdhderError::Conflict(
                "only running sessions can be paused".into(),
            ));
        }
        s.status = SessionStatus::Paused;
        s.updated_at = self.clock.now_utc();
        repo.update(&s).await?;
        Ok(s)
    }

    pub async fn tick(&self, id: &EntityId, elapsed_secs: i64) -> Result<PomodoroSession> {
        if elapsed_secs < 0 {
            return Err(AdhderError::Validation(
                "elapsed_secs must be >= 0".into(),
            ));
        }
        let repo = PomodoroRepository::new(&self.pool);
        let mut s = repo.get(id).await?;
        if s.status != SessionStatus::Running {
            return Ok(s);
        }
        s.remaining_secs = (s.remaining_secs - elapsed_secs).max(0);
        s.updated_at = self.clock.now_utc();
        if s.remaining_secs == 0 {
            return self.complete_inner(s).await;
        }
        repo.update(&s).await?;
        Ok(s)
    }

    pub async fn complete(&self, id: &EntityId) -> Result<PomodoroSession> {
        let repo = PomodoroRepository::new(&self.pool);
        let s = repo.get(id).await?;
        self.complete_inner(s).await
    }

    pub async fn reset(&self, id: &EntityId) -> Result<PomodoroSession> {
        let repo = PomodoroRepository::new(&self.pool);
        let mut s = repo.get(id).await?;
        s.status = SessionStatus::Idle;
        s.remaining_secs = s.duration_secs;
        s.started_at = None;
        s.completed_at = None;
        s.updated_at = self.clock.now_utc();
        repo.update(&s).await?;
        Ok(s)
    }

    pub async fn get_active(&self) -> Result<Option<PomodoroSession>> {
        PomodoroRepository::new(&self.pool).get_active().await
    }

    pub async fn get(&self, id: &EntityId) -> Result<PomodoroSession> {
        PomodoroRepository::new(&self.pool).get(id).await
    }

    async fn complete_inner(&self, mut s: PomodoroSession) -> Result<PomodoroSession> {
        if s.status == SessionStatus::Completed {
            return Ok(s);
        }
        s.status = SessionStatus::Completed;
        s.remaining_secs = 0;
        s.completed_at = Some(self.clock.now_utc());
        s.updated_at = self.clock.now_utc();
        PomodoroRepository::new(&self.pool).update(&s).await?;
        self.events.publish(DomainEvent::PomodoroCompleted {
            session_id: s.id.clone(),
            task_id: s.task_id.clone(),
        });
        Ok(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use adhder_core::InMemoryEventBus;
    use adhder_db::open_in_memory;

    #[tokio::test]
    async fn start_tick_complete() {
        let pool = open_in_memory().await.unwrap();
        let bus = Arc::new(InMemoryEventBus::new());
        let svc = PomodoroService::new(pool, bus.clone());
        let s = svc
            .prepare(SessionKind::Focus, Some(60), None)
            .await
            .unwrap();
        let s = svc.start(&s.id).await.unwrap();
        assert_eq!(s.status, SessionStatus::Running);
        let s = svc.tick(&s.id, 60).await.unwrap();
        assert_eq!(s.status, SessionStatus::Completed);
        let events = bus.drain();
        assert!(events.iter().any(|e| matches!(
            e,
            DomainEvent::PomodoroCompleted { .. }
        )));
    }

    #[tokio::test]
    async fn pause_and_reset() {
        let pool = open_in_memory().await.unwrap();
        let svc = PomodoroService::new(pool, Arc::new(InMemoryEventBus::new()));
        let s = svc
            .prepare(SessionKind::ShortBreak, None, None)
            .await
            .unwrap();
        assert_eq!(s.duration_secs, 5 * 60);
        let s = svc.start(&s.id).await.unwrap();
        let s = svc.pause(&s.id).await.unwrap();
        assert_eq!(s.status, SessionStatus::Paused);
        let s = svc.reset(&s.id).await.unwrap();
        assert_eq!(s.status, SessionStatus::Idle);
        assert_eq!(s.remaining_secs, s.duration_secs);
    }
}
