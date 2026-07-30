import {
  makeStyles,
  Toast,
  ToastBody,
  Toaster,
  ToastTitle,
  tokens,
  useId,
  useToastController,
} from "@fluentui/react-components";
import { useCallback, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { CompletionFlash } from "@/components/pomodoro/CompletionFlash";
import { NavBar } from "@/components/layout/NavBar";
import { setApiErrorListener } from "@/services/api";
import { useInterval } from "@/hooks/useInterval";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { useUiStore } from "@/stores/useUiStore";

const useStyles = makeStyles({
  root: {
    position: "relative",
    display: "flex",
    height: "100vh",
    width: "100vw",
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  content: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    overflow: "auto",
  },
});

export function AppShell() {
  const styles = useStyles();
  const navigate = useNavigate();

  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.load);
  const configure = usePomodoroStore((s) => s.configure);
  const tick = usePomodoroStore((s) => s.tick);
  const running = usePomodoroStore((s) => s.running);
  const toggleTimer = usePomodoroStore((s) => s.toggle);
  const loadStats = usePomodoroStore((s) => s.loadStats);
  const loadTasks = useTaskStore((s) => s.load);

  const ui = useUiStore();

  const toasterId = useId("adhder-toaster");
  const { dispatchToast } = useToastController(toasterId);

  // Surface API failures as unobtrusive toasts instead of silently swallowing.
  useEffect(() => {
    setApiErrorListener((error) => {
      dispatchToast(
        <Toast>
          <ToastTitle>Couldn't save changes</ToastTitle>
          <ToastBody>{error.message}</ToastBody>
        </Toast>,
        { intent: "error" },
      );
    });
    return () => setApiErrorListener(null);
  }, [dispatchToast]);

  // Initial data load.
  useEffect(() => {
    void loadSettings();
    void loadStats();
    void loadTasks();
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [loadSettings, loadStats, loadTasks]);

  // Keep the timer durations in sync with settings.
  useEffect(() => {
    configure(settings);
  }, [settings, configure]);

  // Drive the global countdown (1Hz while running).
  useInterval(tick, running ? 1000 : null);

  const handlers = {
    onNewTask: useCallback(() => {
      navigate("/tasks");
      ui.requestNewTask();
    }, [navigate, ui]),
    onNewNote: useCallback(() => {
      navigate("/notes");
      ui.requestNewNote();
    }, [navigate, ui]),
    onSave: useCallback(() => ui.requestSave(), [ui]),
    onSearch: useCallback(() => ui.requestFocusSearch(), [ui]),
    onToggleTimer: useCallback(() => toggleTimer(), [toggleTimer]),
  };
  useKeyboardShortcuts(handlers);

  return (
    <div className={styles.root}>
      <NavBar />
      <main className={styles.content}>
        <Outlet />
      </main>
      <CompletionFlash />
      <Toaster toasterId={toasterId} position="bottom-end" />
    </div>
  );
}
