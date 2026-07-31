use std::sync::Arc;

use adhder_core::{
    AdhderError, Clock, DomainEvent, EntityId, EventBus, Result, SystemClock,
};
use adhder_db::DbPool;

use crate::repository::NoteRepository;
use crate::{CreateNote, Note, NoteFolder, NoteFormat, UpdateNote};

pub struct NoteService {
    pool: DbPool,
    events: Arc<dyn EventBus>,
    clock: Arc<dyn Clock>,
}

impl NoteService {
    pub fn new(pool: DbPool, events: Arc<dyn EventBus>) -> Self {
        Self {
            pool,
            events,
            clock: Arc::new(SystemClock),
        }
    }

    pub async fn create_folder(&self, name: &str) -> Result<NoteFolder> {
        let name = name.trim().to_string();
        if name.is_empty() {
            return Err(AdhderError::Validation(
                "folder name must not be empty".into(),
            ));
        }
        let now = self.clock.now_utc();
        let folder = NoteFolder {
            id: EntityId::new(),
            name,
            created_at: now,
            updated_at: now,
        };
        NoteRepository::new(&self.pool)
            .create_folder(&folder)
            .await?;
        Ok(folder)
    }

    pub async fn list_folders(&self) -> Result<Vec<NoteFolder>> {
        NoteRepository::new(&self.pool).list_folders().await
    }

    pub async fn create_note(&self, input: CreateNote) -> Result<Note> {
        let now = self.clock.now_utc();
        let folder_id = match input.folder_id {
            Some(id) => Some(EntityId::parse(id).map_err(AdhderError::Validation)?),
            None => None,
        };
        let note = Note {
            id: EntityId::new(),
            folder_id,
            title: input.title.unwrap_or_default(),
            content: input.content.unwrap_or_else(|| empty_rich_doc()),
            format: input.format.unwrap_or(NoteFormat::RichText),
            pinned: false,
            created_at: now,
            updated_at: now,
        };
        NoteRepository::new(&self.pool).insert_note(&note).await?;
        self.events.publish(DomainEvent::NoteUpserted {
            id: note.id.clone(),
        });
        Ok(note)
    }

    pub async fn update_note(&self, id: &EntityId, patch: UpdateNote) -> Result<Note> {
        let repo = NoteRepository::new(&self.pool);
        let mut note = repo.get_note(id).await?;
        if let Some(title) = patch.title {
            note.title = title;
        }
        if let Some(content) = patch.content {
            note.content = content;
        }
        if let Some(folder) = patch.folder_id {
            note.folder_id = match folder {
                Some(id) => Some(EntityId::parse(id).map_err(AdhderError::Validation)?),
                None => None,
            };
        }
        if let Some(pinned) = patch.pinned {
            note.pinned = pinned;
        }
        note.updated_at = self.clock.now_utc();
        repo.update_note(&note).await?;
        self.events.publish(DomainEvent::NoteUpserted {
            id: note.id.clone(),
        });
        Ok(note)
    }

    pub async fn get_note(&self, id: &EntityId) -> Result<Note> {
        NoteRepository::new(&self.pool).get_note(id).await
    }

    pub async fn list_notes(&self) -> Result<Vec<Note>> {
        NoteRepository::new(&self.pool).list_notes().await
    }

    pub async fn delete_note(&self, id: &EntityId) -> Result<()> {
        NoteRepository::new(&self.pool).delete_note(id).await?;
        self.events
            .publish(DomainEvent::NoteDeleted { id: id.clone() });
        Ok(())
    }
}

fn empty_rich_doc() -> String {
    r#"{"type":"doc","content":[{"type":"paragraph","content":[]}]}"#.into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use adhder_core::InMemoryEventBus;
    use adhder_db::open_in_memory;

    #[tokio::test]
    async fn create_and_autosave_note() {
        let pool = open_in_memory().await.unwrap();
        let svc = NoteService::new(pool, Arc::new(InMemoryEventBus::new()));
        let note = svc
            .create_note(CreateNote {
                title: Some("Study Plan".into()),
                content: None,
                folder_id: None,
                format: Some(NoteFormat::RichText),
            })
            .await
            .unwrap();
        assert_eq!(note.format, NoteFormat::RichText);

        let updated = svc
            .update_note(
                &note.id,
                UpdateNote {
                    content: Some(r#"{"type":"doc","content":[]}"#.into()),
                    ..Default::default()
                },
            )
            .await
            .unwrap();
        assert!(updated.content.contains("doc"));
    }
}
