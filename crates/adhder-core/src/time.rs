use chrono::{DateTime, Utc};

pub type UtcMillis = i64;

pub trait Clock: Send + Sync {
    fn now_utc(&self) -> DateTime<Utc>;
    fn now_millis(&self) -> UtcMillis {
        self.now_utc().timestamp_millis()
    }
}

#[derive(Debug, Default, Clone, Copy)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_utc(&self) -> DateTime<Utc> {
        Utc::now()
    }
}

