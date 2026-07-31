use adhder_core::{AdhderError, EntityId, Result};
use adhder_notes::{CreateNote, NoteFormat, UpdateNote};
use adhder_planner::CreatePlannerItem;
use adhder_pomodoro::SessionKind;
use adhder_tasks::{CreateTask, KanbanColumn, TaskPriority, UpdateTask};
use serde::Serialize;
use serde_json::{json, Value};

use crate::runtime::AdhderRuntime;

#[derive(Debug, Serialize)]
pub struct AdhderResponse {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ErrorBody>,
}

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub code: String,
    pub message: String,
}

impl AdhderResponse {
    pub fn ok(data: Value) -> Self {
        Self {
            ok: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(code: &str, message: impl Into<String>) -> Self {
        Self {
            ok: false,
            data: None,
            error: Some(ErrorBody {
                code: code.into(),
                message: message.into(),
            }),
        }
    }

    pub fn from_error(err: &AdhderError) -> Self {
        Self::err(err.code_str(), err.message())
    }
}

pub fn invoke_json(command: &str, payload: &str) -> Result<AdhderResponse> {
    let payload: Value = if payload.trim().is_empty() {
        json!({})
    } else {
        serde_json::from_str(payload)
            .map_err(|e| AdhderError::Validation(format!("invalid JSON payload: {e}")))?
    };

    let rt = AdhderRuntime::get()?;
    let data = rt.block_on(dispatch(rt, command, payload))?;
    rt.sync_stats()?;
    Ok(AdhderResponse::ok(data))
}

async fn dispatch(rt: &AdhderRuntime, command: &str, p: Value) -> Result<Value> {
    match command {
        "ping" => Ok(json!({"pong": true, "version": "0.1.0"})),

        // ---- Tasks ----
        "tasks.list" => {
            let tasks = rt.tasks.list_all().await?;
            Ok(serde_json::to_value(tasks).unwrap())
        }
        "tasks.list_by_column" => {
            let col = KanbanColumn::parse(req_str(&p, "column")?)?;
            let tasks = rt.tasks.list_by_column(col).await?;
            Ok(serde_json::to_value(tasks).unwrap())
        }
        "tasks.create" => {
            let task = rt
                .tasks
                .create(CreateTask {
                    title: req_str(&p, "title")?.into(),
                    notes: opt_str(&p, "notes"),
                    column: opt_str(&p, "column")
                        .map(|c| KanbanColumn::parse(&c))
                        .transpose()?,
                    priority: opt_i64(&p, "priority")
                        .map(TaskPriority::from_i64)
                        .transpose()?,
                    due_date: opt_str(&p, "due_date"),
                })
                .await?;
            Ok(serde_json::to_value(task).unwrap())
        }
        "tasks.update" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            let task = rt
                .tasks
                .update(
                    &id,
                    UpdateTask {
                        title: opt_str(&p, "title"),
                        notes: opt_str(&p, "notes"),
                        priority: opt_i64(&p, "priority")
                            .map(TaskPriority::from_i64)
                            .transpose()?,
                        due_date: if p.get("due_date").is_some() {
                            Some(opt_str(&p, "due_date"))
                        } else {
                            None
                        },
                    },
                )
                .await?;
            Ok(serde_json::to_value(task).unwrap())
        }
        "tasks.move" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            let to = KanbanColumn::parse(req_str(&p, "to")?)?;
            let task = rt.tasks.move_to(&id, to).await?;
            Ok(serde_json::to_value(task).unwrap())
        }
        "tasks.set_focus" => {
            let id = match opt_str(&p, "id") {
                Some(id) => Some(EntityId::parse(id).map_err(AdhderError::Validation)?),
                None => None,
            };
            let task = rt.tasks.set_focus(id.as_ref()).await?;
            Ok(serde_json::to_value(task).unwrap())
        }
        "tasks.get_focus" => {
            let task = rt.tasks.get_focus().await?;
            Ok(serde_json::to_value(task).unwrap())
        }
        "tasks.delete" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            rt.tasks.delete(&id).await?;
            Ok(json!({"deleted": true}))
        }

        // ---- Notes ----
        "notes.list" => Ok(serde_json::to_value(rt.notes.list_notes().await?).unwrap()),
        "notes.folders" => Ok(serde_json::to_value(rt.notes.list_folders().await?).unwrap()),
        "notes.create_folder" => {
            let folder = rt.notes.create_folder(req_str(&p, "name")?).await?;
            Ok(serde_json::to_value(folder).unwrap())
        }
        "notes.create" => {
            let note = rt
                .notes
                .create_note(CreateNote {
                    title: opt_str(&p, "title"),
                    content: opt_str(&p, "content"),
                    folder_id: opt_str(&p, "folder_id"),
                    format: Some(NoteFormat::RichText),
                })
                .await?;
            Ok(serde_json::to_value(note).unwrap())
        }
        "notes.update" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            let note = rt
                .notes
                .update_note(
                    &id,
                    UpdateNote {
                        title: opt_str(&p, "title"),
                        content: opt_str(&p, "content"),
                        folder_id: None,
                        pinned: opt_bool(&p, "pinned"),
                    },
                )
                .await?;
            Ok(serde_json::to_value(note).unwrap())
        }
        "notes.get" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            Ok(serde_json::to_value(rt.notes.get_note(&id).await?).unwrap())
        }
        "notes.delete" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            rt.notes.delete_note(&id).await?;
            Ok(json!({"deleted": true}))
        }

        // ---- Pomodoro ----
        "pomodoro.prepare" => {
            let kind = SessionKind::parse(opt_str(&p, "kind").as_deref().unwrap_or("focus"))?;
            let task_id = opt_str(&p, "task_id")
                .map(|id| EntityId::parse(id).map_err(AdhderError::Validation))
                .transpose()?;
            let session = rt
                .pomodoro
                .prepare(kind, opt_i64(&p, "duration_secs"), task_id)
                .await?;
            Ok(serde_json::to_value(session).unwrap())
        }
        "pomodoro.start" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            Ok(serde_json::to_value(rt.pomodoro.start(&id).await?).unwrap())
        }
        "pomodoro.pause" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            Ok(serde_json::to_value(rt.pomodoro.pause(&id).await?).unwrap())
        }
        "pomodoro.tick" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            let elapsed = opt_i64(&p, "elapsed_secs").unwrap_or(1);
            Ok(serde_json::to_value(rt.pomodoro.tick(&id, elapsed).await?).unwrap())
        }
        "pomodoro.complete" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            Ok(serde_json::to_value(rt.pomodoro.complete(&id).await?).unwrap())
        }
        "pomodoro.reset" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            Ok(serde_json::to_value(rt.pomodoro.reset(&id).await?).unwrap())
        }
        "pomodoro.active" => Ok(serde_json::to_value(rt.pomodoro.get_active().await?).unwrap()),

        // ---- Planner ----
        "planner.list" => {
            let date = req_str(&p, "date")?;
            Ok(serde_json::to_value(rt.planner.list_for_date(date).await?).unwrap())
        }
        "planner.create" => {
            let item = rt
                .planner
                .create(CreatePlannerItem {
                    date: req_str(&p, "date")?.into(),
                    title: req_str(&p, "title")?.into(),
                    notes: opt_str(&p, "notes"),
                    start_time: opt_str(&p, "start_time"),
                    end_time: opt_str(&p, "end_time"),
                    task_id: opt_str(&p, "task_id"),
                })
                .await?;
            Ok(serde_json::to_value(item).unwrap())
        }
        "planner.delete" => {
            let id = EntityId::parse(req_str(&p, "id")?).map_err(AdhderError::Validation)?;
            rt.planner.delete(&id).await?;
            Ok(json!({"deleted": true}))
        }

        // ---- Settings / stats / search ----
        "settings.get" => Ok(serde_json::to_value(rt.settings.get_preferences().await?).unwrap()),
        "settings.set" => {
            let prefs = rt
                .settings
                .set_preference(req_str(&p, "key")?, req_str(&p, "value")?)
                .await?;
            Ok(serde_json::to_value(prefs).unwrap())
        }
        "settings.export" => Ok(json!({"json": rt.settings.export_json().await?})),
        "settings.import" => {
            rt.settings.import_json(req_str(&p, "json")?).await?;
            Ok(json!({"imported": true}))
        }
        "settings.backup_to_path" => {
            rt.settings
                .backup_to_path(req_str(&p, "path")?)
                .await?;
            Ok(json!({"backed_up": true}))
        }
        "settings.import_from_path" => {
            rt.settings
                .import_from_path(req_str(&p, "path")?)
                .await?;
            Ok(json!({"imported": true}))
        }
        "stats.dashboard" => Ok(serde_json::to_value(rt.stats.dashboard().await?).unwrap()),
        "search.query" => {
            let hits = rt
                .search
                .query(req_str(&p, "q")?, opt_i64(&p, "limit").unwrap_or(20))
                .await?;
            Ok(serde_json::to_value(hits).unwrap())
        }

        other => Err(AdhderError::Validation(format!(
            "unknown command '{other}'"
        ))),
    }
}

fn req_str<'a>(p: &'a Value, key: &str) -> Result<&'a str> {
    p.get(key)
        .and_then(|v| v.as_str())
        .ok_or_else(|| AdhderError::Validation(format!("missing string field '{key}'")))
}

fn opt_str(p: &Value, key: &str) -> Option<String> {
    p.get(key).and_then(|v| {
        if v.is_null() {
            None
        } else {
            v.as_str().map(|s| s.to_string())
        }
    })
}

fn opt_i64(p: &Value, key: &str) -> Option<i64> {
    p.get(key).and_then(|v| v.as_i64())
}

fn opt_bool(p: &Value, key: &str) -> Option<bool> {
    p.get(key).and_then(|v| v.as_bool())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime::AdhderRuntime;

    fn setup() {
        let _ = AdhderRuntime::init_in_memory();
    }

    #[test]
    fn ping_and_task_flow_via_json_api() {
        setup();
        let ping = invoke_json("ping", "{}").unwrap();
        assert!(ping.ok);

        let created = invoke_json(
            "tasks.create",
            r#"{"title":"Properties of Convolution","priority":3}"#,
        )
        .unwrap();
        assert!(created.ok);
        let id = created.data.as_ref().unwrap()["id"].as_str().unwrap().to_string();

        let moved = invoke_json(
            "tasks.move",
            &format!(r#"{{"id":"{id}","to":"working"}}"#),
        )
        .unwrap();
        assert_eq!(moved.data.as_ref().unwrap()["column"], "working");

        let focus = invoke_json("tasks.set_focus", &format!(r#"{{"id":"{id}"}}"#)).unwrap();
        assert!(focus.data.as_ref().unwrap()["is_focus"].as_bool().unwrap());

        let dash = invoke_json("stats.dashboard", "{}").unwrap();
        assert!(dash.ok);
    }

    #[test]
    fn pomodoro_and_notes_and_backup() {
        setup();
        let session = invoke_json(
            "pomodoro.prepare",
            r#"{"kind":"focus","duration_secs":30}"#,
        )
        .unwrap();
        let sid = session.data.as_ref().unwrap()["id"].as_str().unwrap().to_string();
        invoke_json("pomodoro.start", &format!(r#"{{"id":"{sid}"}}"#)).unwrap();
        let done = invoke_json(
            "pomodoro.tick",
            &format!(r#"{{"id":"{sid}","elapsed_secs":30}}"#),
        )
        .unwrap();
        assert_eq!(done.data.as_ref().unwrap()["status"], "completed");

        let note = invoke_json("notes.create", r#"{"title":"Study Plan"}"#).unwrap();
        assert!(note.ok);

        let export = invoke_json("settings.export", "{}").unwrap();
        let json = export.data.as_ref().unwrap()["json"].as_str().unwrap();
        let imported = invoke_json("settings.import", &format!(r#"{{"json":{}}}"#, serde_json::Value::String(json.to_string())));
        assert!(imported.unwrap().ok);

        let bad = invoke_json("settings.import", r#"{"json":"nope"}"#).unwrap_err();
        assert!(matches!(bad, AdhderError::Validation(_)));
    }

    #[test]
    fn planner_and_search() {
        setup();
        invoke_json(
            "planner.create",
            r#"{"date":"2026-07-31","title":"Review Notes","start_time":"14:00"}"#,
        )
        .unwrap();
        let list = invoke_json("planner.list", r#"{"date":"2026-07-31"}"#).unwrap();
        assert_eq!(list.data.as_ref().unwrap().as_array().unwrap().len(), 1);

        invoke_json("tasks.create", r#"{"title":"Find me convolution"}"#).unwrap();
        let hits = invoke_json("search.query", r#"{"q":"convolution"}"#).unwrap();
        assert!(!hits.data.as_ref().unwrap().as_array().unwrap().is_empty());
    }
}
