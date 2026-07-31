//! Shared kernel for ADHDer feature crates.

mod error;
mod event;
mod id;
mod time;

pub use error::{AdhderError, ErrorCode, Result};
pub use event::{DomainEvent, EventBus, InMemoryEventBus};
pub use id::EntityId;
pub use time::{Clock, SystemClock, UtcMillis};
