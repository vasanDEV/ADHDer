//! Pomodoro session lifecycle owned by Rust.

mod repository;
mod service;

use adhder_core::{AdhderError, EntityId, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub use service::{CycleAdvance, PomodoroService};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionKind {
    Focus,
    ShortBreak,
    LongBreak,
}

impl SessionKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Focus => "focus",
            Self::ShortBreak => "short_break",
            Self::LongBreak => "long_break",
        }
    }

    pub fn parse(s: &str) -> Result<Self> {
        match s {
            "focus" => Ok(Self::Focus),
            "short_break" => Ok(Self::ShortBreak),
            "long_break" => Ok(Self::LongBreak),
            other => Err(AdhderError::Validation(format!(
                "invalid session kind '{other}'"
            ))),
        }
    }

    pub fn default_secs(self) -> i64 {
        match self {
            Self::Focus => 25 * 60,
            Self::ShortBreak => 5 * 60,
            Self::LongBreak => 15 * 60,
        }
    }
}

/// Classic cycle: Focus → Short Break, and every `long_every` focuses → Long Break.
/// Breaks always return to Focus. Default long break every 4 completed focuses.
pub fn next_kind_after(completed: SessionKind, focuses_completed_in_cycle: u32) -> SessionKind {
    const LONG_EVERY: u32 = 4;
    match completed {
        SessionKind::Focus => {
            if focuses_completed_in_cycle > 0 && focuses_completed_in_cycle % LONG_EVERY == 0 {
                SessionKind::LongBreak
            } else {
                SessionKind::ShortBreak
            }
        }
        SessionKind::ShortBreak | SessionKind::LongBreak => SessionKind::Focus,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Idle,
    Running,
    Paused,
    Completed,
}

impl SessionStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Idle => "idle",
            Self::Running => "running",
            Self::Paused => "paused",
            Self::Completed => "completed",
        }
    }

    pub fn parse(s: &str) -> Result<Self> {
        match s {
            "idle" => Ok(Self::Idle),
            "running" => Ok(Self::Running),
            "paused" => Ok(Self::Paused),
            "completed" => Ok(Self::Completed),
            other => Err(AdhderError::Validation(format!(
                "invalid session status '{other}'"
            ))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PomodoroSession {
    pub id: EntityId,
    pub task_id: Option<EntityId>,
    pub kind: SessionKind,
    pub duration_secs: i64,
    pub remaining_secs: i64,
    pub status: SessionStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
