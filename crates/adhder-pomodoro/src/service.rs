use std::sync::Arc;

use adhder_core::{
    AdhderError, Clock, DomainEvent, EntityId, EventBus, Result, SystemClock,
};
use adhder_db::DbPool;
use serde::{Deserialize, Serialize};

use crate::repository::PomodoroRepository;
use crate::{next_kind_after, PomodoroSession, SessionKind, SessionStatus};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CycleAdvance {
    pub ended: PomodoroSession,
    pub next: PomodoroSession,
    pub skipped: bool,
    pub focuses_in_cycle: u32,
}

pub struct PomodoroService {
    pool: DbPool,
    events: Arc<dyn EventBus>,
    clock: Arc<dyn Clock>,
    /// Completed (non-skipped) focus sessions since last long break.
    focuses_in_cycle: std::sync::Mutex<u32>,
    /// Prevents double-advance when tick already completed the session.
    last_advanced: std::sync::Mutex<Option<EntityId>>,
}

impl PomodoroService {
    pub fn new(pool: DbPool, events: Arc<dyn EventBus>) -> Self {
        Self {
            pool,
            events,
            clock: Arc::new(SystemClock),
            focuses_in_cycle: std::sync::Mutex::new(0),
            last_advanced: std::sync::Mutex::new(None),
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
            return self.complete_inner(s, false).await;
        }
        repo.update(&s).await?;
        Ok(s)
    }

    pub async fn complete(&self, id: &EntityId) -> Result<PomodoroSession> {
        let repo = PomodoroRepository::new(&self.pool);
        let s = repo.get(id).await?;
        self.complete_inner(s, false).await
    }

    /// Skip the current phase and prepare the next in the Focus → Short → (Long) cycle.
    pub async fn skip(&self, id: &EntityId) -> Result<CycleAdvance> {
        self.advance(id, true).await
    }

    /// Complete the current phase (counts focus toward long-break cycle) and prepare next.
    pub async fn complete_and_advance(&self, id: &EntityId) -> Result<CycleAdvance> {
        self.advance(id, false).await
    }

    async fn advance(&self, id: &EntityId, skipped: bool) -> Result<CycleAdvance> {
        let repo = PomodoroRepository::new(&self.pool);
        let s = repo.get(id).await?;

        {
            let last = self.last_advanced.lock().expect("advance lock");
            if last.as_ref() == Some(&s.id) {
                // Already advanced this session — return current active/next idle session.
                if let Some(active) = repo.get_active().await? {
                    return Ok(CycleAdvance {
                        ended: s,
                        next: active,
                        skipped,
                        focuses_in_cycle: *self.focuses_in_cycle.lock().expect("cycle lock"),
                    });
                }
            }
        }

        let ended = self.complete_inner(s, skipped).await?;
        let next_kind = self.next_kind_for(&ended, skipped);
        let next = self
            .prepare(next_kind, None, ended.task_id.clone())
            .await?;
        *self.last_advanced.lock().expect("advance lock") = Some(ended.id.clone());
        Ok(CycleAdvance {
            ended,
            next,
            skipped,
            focuses_in_cycle: *self.focuses_in_cycle.lock().expect("cycle lock"),
        })
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

    pub fn focuses_in_cycle(&self) -> u32 {
        *self.focuses_in_cycle.lock().expect("cycle lock")
    }

    fn next_kind_for(&self, ended: &PomodoroSession, skipped: bool) -> SessionKind {
        let mut guard = self.focuses_in_cycle.lock().expect("cycle lock");
        if ended.kind == SessionKind::Focus && !skipped {
            *guard = guard.saturating_add(1);
        }
        let next = next_kind_after(ended.kind, *guard);
        if next == SessionKind::LongBreak {
            *guard = 0;
        }
        next
    }

    async fn complete_inner(&self, mut s: PomodoroSession, skipped: bool) -> Result<PomodoroSession> {
        if s.status == SessionStatus::Completed {
            return Ok(s);
        }
        s.status = SessionStatus::Completed;
        if !skipped {
            s.remaining_secs = 0;
        }
        s.completed_at = Some(self.clock.now_utc());
        s.updated_at = self.clock.now_utc();
        PomodoroRepository::new(&self.pool).update(&s).await?;
        // Skipped focus does not count toward stats.
        if !skipped && s.kind == SessionKind::Focus {
            self.events.publish(DomainEvent::PomodoroCompleted {
                session_id: s.id.clone(),
                task_id: s.task_id.clone(),
            });
        }
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

    #[tokio::test]
    async fn skip_advances_focus_to_short_break() {
        let pool = open_in_memory().await.unwrap();
        let svc = PomodoroService::new(pool, Arc::new(InMemoryEventBus::new()));
        let s = svc
            .prepare(SessionKind::Focus, Some(25 * 60), None)
            .await
            .unwrap();
        let adv = svc.skip(&s.id).await.unwrap();
        assert!(adv.skipped);
        assert_eq!(adv.next.kind, SessionKind::ShortBreak);
        assert_eq!(adv.next.duration_secs, 5 * 60);
    }

    #[tokio::test]
    async fn complete_four_focuses_then_long_break() {
        let pool = open_in_memory().await.unwrap();
        let svc = PomodoroService::new(pool, Arc::new(InMemoryEventBus::new()));

        let mut kind = SessionKind::Focus;
        for i in 0..4 {
            let s = svc.prepare(kind, Some(1), None).await.unwrap();
            let adv = svc.complete_and_advance(&s.id).await.unwrap();
            if i < 3 {
                assert_eq!(adv.next.kind, SessionKind::ShortBreak);
                // finish break → next focus
                let b = svc
                    .complete_and_advance(&adv.next.id)
                    .await
                    .unwrap();
                assert_eq!(b.next.kind, SessionKind::Focus);
                kind = SessionKind::Focus;
            } else {
                assert_eq!(adv.next.kind, SessionKind::LongBreak);
                assert_eq!(adv.next.duration_secs, 15 * 60);
            }
        }
    }

    #[tokio::test]
    async fn skip_does_not_emit_stats_event() {
        let pool = open_in_memory().await.unwrap();
        let bus = Arc::new(InMemoryEventBus::new());
        let svc = PomodoroService::new(pool, bus.clone());
        let s = svc
            .prepare(SessionKind::Focus, Some(60), None)
            .await
            .unwrap();
        svc.skip(&s.id).await.unwrap();
        assert!(bus.drain().is_empty());
    }
}
