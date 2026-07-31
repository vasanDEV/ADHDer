use std::sync::Arc;

use adhder_core::{
    AdhderError, Clock, DomainEvent, EntityId, EventBus, Result, SystemClock,
};
use adhder_db::DbPool;
use chrono::Utc;

use crate::domain::{
    validate_due_date, CreateTask, KanbanColumn, Task, TaskPriority, TaskSort, UpdateTask,
};
use crate::repository::TaskRepository;

pub struct TaskService {
    pool: DbPool,
    events: Arc<dyn EventBus>,
    clock: Arc<dyn Clock>,
}

impl TaskService {
    pub fn new(pool: DbPool, events: Arc<dyn EventBus>) -> Self {
        Self {
            pool,
            events,
            clock: Arc::new(SystemClock),
        }
    }

    pub fn with_clock(mut self, clock: Arc<dyn Clock>) -> Self {
        self.clock = clock;
        self
    }

    pub async fn create(&self, input: CreateTask) -> Result<Task> {
        let title = input.title.trim().to_string();
        if title.is_empty() {
            return Err(AdhderError::Validation(
                "task title must not be empty".into(),
            ));
        }
        let column = input.column.unwrap_or(KanbanColumn::Todo);
        if let Some(ref due) = input.due_date {
            validate_due_date(due)?;
        }
        let repo = TaskRepository::new(&self.pool);
        let now = self.clock.now_utc();
        let task = Task {
            id: EntityId::new(),
            title,
            notes: input.notes.unwrap_or_default(),
            column,
            priority: input.priority.unwrap_or(TaskPriority::None),
            is_focus: false,
            due_date: input.due_date,
            created_at: now,
            updated_at: now,
            position: repo.next_position(column).await?,
        };
        repo.insert(&task).await?;
        self.events.publish(DomainEvent::TaskCreated {
            id: task.id.clone(),
        });
        Ok(task)
    }

    pub async fn update(&self, id: &EntityId, patch: UpdateTask) -> Result<Task> {
        let repo = TaskRepository::new(&self.pool);
        let mut task = repo.get(id).await?;
        if let Some(title) = patch.title {
            let title = title.trim().to_string();
            if title.is_empty() {
                return Err(AdhderError::Validation(
                    "task title must not be empty".into(),
                ));
            }
            task.title = title;
        }
        if let Some(notes) = patch.notes {
            task.notes = notes;
        }
        if let Some(priority) = patch.priority {
            task.priority = priority;
        }
        if let Some(due) = patch.due_date {
            if let Some(ref d) = due {
                validate_due_date(d)?;
            }
            task.due_date = due;
        }
        task.updated_at = self.clock.now_utc();
        repo.update(&task).await?;
        self.events.publish(DomainEvent::TaskUpdated {
            id: task.id.clone(),
        });
        Ok(task)
    }

    pub async fn move_to(&self, id: &EntityId, to: KanbanColumn) -> Result<Task> {
        let repo = TaskRepository::new(&self.pool);
        let mut task = repo.get(id).await?;
        let from = task.column;
        if from == to {
            return Ok(task);
        }
        task.column = to;
        task.position = repo.next_position(to).await?;
        task.updated_at = self.clock.now_utc();
        if to == KanbanColumn::Finished {
            task.is_focus = false;
        }
        repo.update(&task).await?;
        self.events.publish(DomainEvent::TaskMoved {
            id: task.id.clone(),
            from: from.as_str().into(),
            to: to.as_str().into(),
        });
        if to == KanbanColumn::Finished {
            // stats consumers listen for TaskMoved into finished
        }
        Ok(task)
    }

    pub async fn set_focus(&self, id: Option<&EntityId>) -> Result<Option<Task>> {
        let repo = TaskRepository::new(&self.pool);
        repo.clear_focus().await?;
        let focus = if let Some(id) = id {
            let mut task = repo.get(id).await?;
            task.is_focus = true;
            task.updated_at = Utc::now();
            if task.column == KanbanColumn::Todo {
                task.column = KanbanColumn::Working;
            }
            repo.update(&task).await?;
            Some(task)
        } else {
            None
        };
        self.events.publish(DomainEvent::TaskFocusChanged {
            id: focus.as_ref().map(|t| t.id.clone()),
        });
        Ok(focus)
    }

    pub async fn get_focus(&self) -> Result<Option<Task>> {
        TaskRepository::new(&self.pool).get_focus().await
    }

    pub async fn list_by_column(&self, column: KanbanColumn) -> Result<Vec<Task>> {
        TaskRepository::new(&self.pool)
            .list_by_column(column)
            .await
    }

    pub async fn list_all(&self) -> Result<Vec<Task>> {
        TaskRepository::new(&self.pool).list_all().await
    }

    pub async fn list_sorted(&self, sort: TaskSort) -> Result<Vec<Task>> {
        let repo = TaskRepository::new(&self.pool);
        match sort {
            TaskSort::Column => repo.list_all().await,
            TaskSort::DueDateAsc => repo.list_sorted_by_due_date(true).await,
            TaskSort::DueDateDesc => repo.list_sorted_by_due_date(false).await,
        }
    }

    pub async fn list_by_due_date(&self, date: &str) -> Result<Vec<Task>> {
        validate_due_date(date)?;
        TaskRepository::new(&self.pool).list_by_due_date(date).await
    }

    pub async fn get(&self, id: &EntityId) -> Result<Task> {
        TaskRepository::new(&self.pool).get(id).await
    }

    pub async fn delete(&self, id: &EntityId) -> Result<()> {
        TaskRepository::new(&self.pool).delete(id).await?;
        self.events
            .publish(DomainEvent::TaskDeleted { id: id.clone() });
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use adhder_core::InMemoryEventBus;
    use adhder_db::open_in_memory;

    async fn svc() -> TaskService {
        let pool = open_in_memory().await.unwrap();
        TaskService::new(pool, Arc::new(InMemoryEventBus::new()))
    }

    #[tokio::test]
    async fn create_move_focus_flow() {
        let svc = svc().await;
        let task = svc
            .create(CreateTask {
                title: "Write plan".into(),
                notes: None,
                column: None,
                priority: Some(TaskPriority::High),
                due_date: None,
            })
            .await
            .unwrap();
        assert_eq!(task.column, KanbanColumn::Todo);

        let working = svc.move_to(&task.id, KanbanColumn::Working).await.unwrap();
        assert_eq!(working.column, KanbanColumn::Working);

        let focus = svc.set_focus(Some(&task.id)).await.unwrap().unwrap();
        assert!(focus.is_focus);

        let finished = svc
            .move_to(&task.id, KanbanColumn::Finished)
            .await
            .unwrap();
        assert_eq!(finished.column, KanbanColumn::Finished);
        assert!(!finished.is_focus);
    }

    #[tokio::test]
    async fn rejects_empty_title() {
        let svc = svc().await;
        let err = svc
            .create(CreateTask {
                title: "   ".into(),
                notes: None,
                column: None,
                priority: None,
                due_date: None,
            })
            .await
            .unwrap_err();
        assert!(matches!(err, AdhderError::Validation(_)));
    }

    #[tokio::test]
    async fn list_by_due_date_and_sort() {
        let svc = svc().await;
        svc.create(CreateTask {
            title: "Later".into(),
            notes: None,
            column: None,
            priority: None,
            due_date: Some("2026-08-02".into()),
        })
        .await
        .unwrap();
        svc.create(CreateTask {
            title: "Today".into(),
            notes: None,
            column: None,
            priority: None,
            due_date: Some("2026-07-31".into()),
        })
        .await
        .unwrap();
        svc.create(CreateTask {
            title: "Undated".into(),
            notes: None,
            column: None,
            priority: None,
            due_date: None,
        })
        .await
        .unwrap();

        let day = svc.list_by_due_date("2026-07-31").await.unwrap();
        assert_eq!(day.len(), 1);
        assert_eq!(day[0].title, "Today");

        let sorted = svc.list_sorted(TaskSort::DueDateAsc).await.unwrap();
        assert_eq!(sorted[0].title, "Today");
        assert_eq!(sorted[1].title, "Later");
        assert_eq!(sorted[2].title, "Undated");
    }
}
