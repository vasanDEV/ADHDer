use std::sync::Arc;

use adhder_core::{AdhderError, InMemoryEventBus, Result};
use adhder_db::{open_database, DbPool};
use adhder_notes::NoteService;
use adhder_planner::PlannerService;
use adhder_pomodoro::PomodoroService;
use adhder_search::SearchService;
use adhder_settings::SettingsService;
use adhder_stats::StatsService;
use adhder_tasks::TaskService;
use once_cell::sync::OnceCell;
use tokio::runtime::Runtime;

pub struct AdhderRuntime {
    pub rt: Runtime,
    pub pool: DbPool,
    pub events: Arc<InMemoryEventBus>,
    pub tasks: TaskService,
    pub notes: NoteService,
    pub pomodoro: PomodoroService,
    pub planner: PlannerService,
    pub settings: SettingsService,
    pub stats: StatsService,
    pub search: SearchService,
}

static RUNTIME: OnceCell<AdhderRuntime> = OnceCell::new();

impl AdhderRuntime {
    pub fn init(db_path: String) -> Result<()> {
        if RUNTIME.get().is_some() {
            return Ok(());
        }
        let rt = Runtime::new().map_err(|e| AdhderError::Internal(e.to_string()))?;
        let pool = rt.block_on(open_database(&db_path))?;
        let events = Arc::new(InMemoryEventBus::new());
        let runtime = AdhderRuntime {
            tasks: TaskService::new(pool.clone(), events.clone()),
            notes: NoteService::new(pool.clone(), events.clone()),
            pomodoro: PomodoroService::new(pool.clone(), events.clone()),
            planner: PlannerService::new(pool.clone(), events.clone()),
            settings: SettingsService::new(pool.clone(), events.clone()),
            stats: StatsService::new(pool.clone()),
            search: SearchService::new(pool.clone()),
            pool,
            events,
            rt,
        };
        RUNTIME
            .set(runtime)
            .map_err(|_| AdhderError::Internal("runtime already initialized".into()))?;
        Ok(())
    }

    /// Test helper: replace/init with an in-memory database.
    #[cfg(test)]
    pub fn init_in_memory() -> Result<()> {
        let _ = RUNTIME.set({
            let rt = Runtime::new().map_err(|e| AdhderError::Internal(e.to_string()))?;
            let pool = rt.block_on(adhder_db::open_in_memory())?;
            let events = Arc::new(InMemoryEventBus::new());
            AdhderRuntime {
                tasks: TaskService::new(pool.clone(), events.clone()),
                notes: NoteService::new(pool.clone(), events.clone()),
                pomodoro: PomodoroService::new(pool.clone(), events.clone()),
                planner: PlannerService::new(pool.clone(), events.clone()),
                settings: SettingsService::new(pool.clone(), events.clone()),
                stats: StatsService::new(pool.clone()),
                search: SearchService::new(pool.clone()),
                pool,
                events,
                rt,
            }
        });
        Ok(())
    }

    pub fn get() -> Result<&'static AdhderRuntime> {
        RUNTIME
            .get()
            .ok_or_else(|| AdhderError::Domain("runtime not initialized; call adhder_init".into()))
    }

    pub fn block_on<F, T>(&self, fut: F) -> T
    where
        F: std::future::Future<Output = T>,
    {
        self.rt.block_on(fut)
    }

    pub fn sync_stats(&self) -> Result<()> {
        self.block_on(self.stats.sync_from_bus(self.events.as_ref()))
    }
}
