use adhder_core::{AdhderError, EntityId, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KanbanColumn {
    Todo,
    Working,
    Finished,
}

impl KanbanColumn {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Todo => "todo",
            Self::Working => "working",
            Self::Finished => "finished",
        }
    }

    pub fn parse(raw: &str) -> Result<Self> {
        match raw {
            "todo" | "to_do" | "To Do" => Ok(Self::Todo),
            "working" | "Working" => Ok(Self::Working),
            "finished" | "Finished" => Ok(Self::Finished),
            other => Err(AdhderError::Validation(format!(
                "invalid kanban column '{other}' (expected todo|working|finished)"
            ))),
        }
    }
}

impl std::fmt::Display for KanbanColumn {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskPriority {
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}

impl TaskPriority {
    pub fn from_i64(v: i64) -> Result<Self> {
        match v {
            0 => Ok(Self::None),
            1 => Ok(Self::Low),
            2 => Ok(Self::Medium),
            3 => Ok(Self::High),
            other => Err(AdhderError::Validation(format!(
                "priority must be 0..=3, got {other}"
            ))),
        }
    }

    pub fn as_i64(self) -> i64 {
        self as i64
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Task {
    pub id: EntityId,
    pub title: String,
    pub notes: String,
    pub column: KanbanColumn,
    pub priority: TaskPriority,
    pub is_focus: bool,
    pub due_date: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub position: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTask {
    pub title: String,
    pub notes: Option<String>,
    pub column: Option<KanbanColumn>,
    pub priority: Option<TaskPriority>,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateTask {
    pub title: Option<String>,
    pub notes: Option<String>,
    pub priority: Option<TaskPriority>,
    pub due_date: Option<Option<String>>,
}

/// How to order tasks in list queries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum TaskSort {
    #[default]
    Column,
    DueDateAsc,
    DueDateDesc,
}

impl TaskSort {
    pub fn parse(raw: &str) -> Result<Self> {
        match raw {
            "column" | "" => Ok(Self::Column),
            "due_date" | "due_date_asc" | "date" | "date_asc" => Ok(Self::DueDateAsc),
            "due_date_desc" | "date_desc" => Ok(Self::DueDateDesc),
            other => Err(AdhderError::Validation(format!(
                "invalid task sort '{other}' (expected column|due_date|due_date_desc)"
            ))),
        }
    }
}

/// Validate YYYY-MM-DD due dates (optional field).
pub fn validate_due_date(date: &str) -> Result<()> {
    chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| {
            AdhderError::Validation(format!("due_date must be YYYY-MM-DD, got '{date}'"))
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn column_parse_accepts_aliases() {
        assert_eq!(KanbanColumn::parse("todo").unwrap(), KanbanColumn::Todo);
        assert_eq!(KanbanColumn::parse("To Do").unwrap(), KanbanColumn::Todo);
        assert!(KanbanColumn::parse("done").is_err());
    }
}
