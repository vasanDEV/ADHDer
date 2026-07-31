//! Notes domain. Editor format is a client concern; core stores opaque content.

mod repository;
mod service;

use adhder_core::{AdhderError, EntityId, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub use service::NoteService;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NoteFormat {
    RichText,
    Markdown,
}

impl NoteFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::RichText => "rich_text",
            Self::Markdown => "markdown",
        }
    }

    pub fn parse(s: &str) -> Result<Self> {
        match s {
            "rich_text" => Ok(Self::RichText),
            "markdown" => Ok(Self::Markdown),
            other => Err(AdhderError::Validation(format!(
                "unknown note format '{other}'"
            ))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NoteFolder {
    pub id: EntityId,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Note {
    pub id: EntityId,
    pub folder_id: Option<EntityId>,
    pub title: String,
    pub content: String,
    pub format: NoteFormat,
    pub pinned: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNote {
    pub title: Option<String>,
    pub content: Option<String>,
    pub folder_id: Option<String>,
    pub format: Option<NoteFormat>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateNote {
    pub title: Option<String>,
    pub content: Option<String>,
    pub folder_id: Option<Option<String>>,
    pub pinned: Option<bool>,
}
