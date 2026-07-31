use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

use crate::EntityId;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DomainEvent {
    TaskCreated { id: EntityId },
    TaskMoved {
        id: EntityId,
        from: String,
        to: String,
    },
    TaskFocusChanged { id: Option<EntityId> },
    TaskUpdated { id: EntityId },
    TaskDeleted { id: EntityId },
    PomodoroCompleted {
        session_id: EntityId,
        task_id: Option<EntityId>,
    },
    NoteUpserted { id: EntityId },
    NoteDeleted { id: EntityId },
    PlannerItemUpserted { id: EntityId, date: String },
    SettingsChanged { key: String },
}

pub trait EventBus: Send + Sync {
    fn publish(&self, event: DomainEvent);
    fn drain(&self) -> Vec<DomainEvent>;
}

#[derive(Debug, Default, Clone)]
pub struct InMemoryEventBus {
    inner: Arc<Mutex<Vec<DomainEvent>>>,
}

impl InMemoryEventBus {
    pub fn new() -> Self {
        Self::default()
    }
}

impl EventBus for InMemoryEventBus {
    fn publish(&self, event: DomainEvent) {
        self.inner.lock().expect("event bus lock").push(event);
    }

    fn drain(&self) -> Vec<DomainEvent> {
        let mut guard = self.inner.lock().expect("event bus lock");
        std::mem::take(&mut *guard)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bus_publishes_and_drains() {
        let bus = InMemoryEventBus::new();
        bus.publish(DomainEvent::SettingsChanged {
            key: "theme".into(),
        });
        let events = bus.drain();
        assert_eq!(events.len(), 1);
        assert!(bus.drain().is_empty());
    }
}
