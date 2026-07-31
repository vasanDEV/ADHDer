use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Stable bridge-facing error codes (Kotlin / Tauri map these).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    Domain,
    NotFound,
    Conflict,
    Validation,
    Storage,
    Internal,
}

#[derive(Debug, Error, Clone, PartialEq, Eq)]
pub enum AdhderError {
    #[error("{0}")]
    Domain(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("validation: {0}")]
    Validation(String),
    #[error("storage: {0}")]
    Storage(String),
    #[error("internal: {0}")]
    Internal(String),
}

impl AdhderError {
    pub fn code(&self) -> ErrorCode {
        match self {
            Self::Domain(_) => ErrorCode::Domain,
            Self::NotFound(_) => ErrorCode::NotFound,
            Self::Conflict(_) => ErrorCode::Conflict,
            Self::Validation(_) => ErrorCode::Validation,
            Self::Storage(_) => ErrorCode::Storage,
            Self::Internal(_) => ErrorCode::Internal,
        }
    }

    pub fn code_str(&self) -> &'static str {
        match self.code() {
            ErrorCode::Domain => "domain",
            ErrorCode::NotFound => "not_found",
            ErrorCode::Conflict => "conflict",
            ErrorCode::Validation => "validation",
            ErrorCode::Storage => "storage",
            ErrorCode::Internal => "internal",
        }
    }

    pub fn message(&self) -> String {
        self.to_string()
    }
}

pub type Result<T> = std::result::Result<T, AdhderError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_codes_are_stable() {
        assert_eq!(AdhderError::NotFound("x".into()).code_str(), "not_found");
        assert_eq!(AdhderError::Validation("bad".into()).code_str(), "validation");
    }
}
