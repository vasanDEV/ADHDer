use adhder_core::{AdhderError, EntityId, Result};
use adhder_db::{map_sqlx, DbPool};
use chrono::{DateTime, Utc};
use sqlx::Row;

use crate::{Note, NoteFolder, NoteFormat};

pub struct NoteRepository<'a> {
    pub pool: &'a DbPool,
}

impl<'a> NoteRepository<'a> {
    pub fn new(pool: &'a DbPool) -> Self {
        Self { pool }
    }

    pub async fn create_folder(&self, folder: &NoteFolder) -> Result<()> {
        sqlx::query(
            "INSERT INTO note_folders (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
        )
        .bind(folder.id.as_str())
        .bind(&folder.name)
        .bind(folder.created_at.to_rfc3339())
        .bind(folder.updated_at.to_rfc3339())
        .execute(self.pool)
        .await
        .map_err(map_sqlx)?;
        Ok(())
    }

    pub async fn list_folders(&self) -> Result<Vec<NoteFolder>> {
        let rows = sqlx::query("SELECT * FROM note_folders ORDER BY name ASC")
            .fetch_all(self.pool)
            .await
            .map_err(map_sqlx)?;
        rows.into_iter()
            .map(|row| {
                Ok(NoteFolder {
                    id: EntityId::parse(row.get::<String, _>("id"))
                        .map_err(AdhderError::Internal)?,
                    name: row.get("name"),
                    created_at: parse_dt(&row.get::<String, _>("created_at"))?,
                    updated_at: parse_dt(&row.get::<String, _>("updated_at"))?,
                })
            })
            .collect()
    }

    pub async fn insert_note(&self, note: &Note) -> Result<()> {
        sqlx::query(
            r#"INSERT INTO notes
               (id, folder_id, title, content, format, pinned, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(note.id.as_str())
        .bind(note.folder_id.as_ref().map(|i| i.as_str().to_string()))
        .bind(&note.title)
        .bind(&note.content)
        .bind(note.format.as_str())
        .bind(if note.pinned { 1 } else { 0 })
        .bind(note.created_at.to_rfc3339())
        .bind(note.updated_at.to_rfc3339())
        .execute(self.pool)
        .await
        .map_err(map_sqlx)?;
        Ok(())
    }

    pub async fn update_note(&self, note: &Note) -> Result<()> {
        let res = sqlx::query(
            r#"UPDATE notes SET folder_id=?, title=?, content=?, format=?, pinned=?, updated_at=?
               WHERE id=?"#,
        )
        .bind(note.folder_id.as_ref().map(|i| i.as_str().to_string()))
        .bind(&note.title)
        .bind(&note.content)
        .bind(note.format.as_str())
        .bind(if note.pinned { 1 } else { 0 })
        .bind(note.updated_at.to_rfc3339())
        .bind(note.id.as_str())
        .execute(self.pool)
        .await
        .map_err(map_sqlx)?;
        if res.rows_affected() == 0 {
            return Err(AdhderError::NotFound(format!("note {}", note.id)));
        }
        Ok(())
    }

    pub async fn get_note(&self, id: &EntityId) -> Result<Note> {
        let row = sqlx::query("SELECT * FROM notes WHERE id = ?")
            .bind(id.as_str())
            .fetch_optional(self.pool)
            .await
            .map_err(map_sqlx)?
            .ok_or_else(|| AdhderError::NotFound(format!("note {id}")))?;
        row_to_note(row)
    }

    pub async fn list_notes(&self) -> Result<Vec<Note>> {
        let rows = sqlx::query("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC")
            .fetch_all(self.pool)
            .await
            .map_err(map_sqlx)?;
        rows.into_iter().map(row_to_note).collect()
    }

    pub async fn delete_note(&self, id: &EntityId) -> Result<()> {
        let res = sqlx::query("DELETE FROM notes WHERE id = ?")
            .bind(id.as_str())
            .execute(self.pool)
            .await
            .map_err(map_sqlx)?;
        if res.rows_affected() == 0 {
            return Err(AdhderError::NotFound(format!("note {id}")));
        }
        Ok(())
    }
}

fn row_to_note(row: sqlx::sqlite::SqliteRow) -> Result<Note> {
    let folder_id = row
        .get::<Option<String>, _>("folder_id")
        .map(|s| EntityId::parse(s).map_err(AdhderError::Internal))
        .transpose()?;
    Ok(Note {
        id: EntityId::parse(row.get::<String, _>("id")).map_err(AdhderError::Internal)?,
        folder_id,
        title: row.get("title"),
        content: row.get("content"),
        format: NoteFormat::parse(&row.get::<String, _>("format"))?,
        pinned: row.get::<i64, _>("pinned") == 1,
        created_at: parse_dt(&row.get::<String, _>("created_at"))?,
        updated_at: parse_dt(&row.get::<String, _>("updated_at"))?,
    })
}

fn parse_dt(s: &str) -> Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .map(|d| d.with_timezone(&Utc))
        .map_err(|e| AdhderError::Storage(e.to_string()))
}
