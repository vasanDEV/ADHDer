import {
  Button,
  Dropdown,
  makeStyles,
  Option,
  tokens,
} from "@fluentui/react-components";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

import { ProgressRing } from "@/components/pomodoro/ProgressRing";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { formatCountdown, formatFocus } from "@/utils/format";

const useStyles = makeStyles({
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "28px",
    padding: "32px",
  },
  phases: {
    display: "inline-flex",
    padding: "4px",
    gap: "4px",
    borderRadius: "999px",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  phaseBtn: {
    borderRadius: "999px",
    minWidth: "104px",
    border: "none",
    fontWeight: 500,
  },
  time: {
    fontSize: "68px",
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: "-2px",
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground1,
  },
  sessionLabel: {
    fontSize: "14px",
    fontWeight: 500,
    color: tokens.colorNeutralForeground2,
    marginTop: "8px",
  },
  controls: { display: "flex", gap: "12px", alignItems: "center" },
  primaryBtn: { borderRadius: "12px", minWidth: "132px" },
  ghostBtn: { borderRadius: "12px" },
  hint: { fontSize: "12px", color: tokens.colorNeutralForeground3 },
  taskPicker: { minWidth: "240px" },
  stats: { display: "flex", gap: "48px", marginTop: "8px" },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
  statValue: { fontSize: "24px", fontWeight: 600, color: tokens.colorNeutralForeground1 },
  statLabel: { fontSize: "12px", color: tokens.colorNeutralForeground2 },
});

const PHASES = [
  { key: "work", label: "Focus" },
  { key: "short_break", label: "Short break" },
  { key: "long_break", label: "Long break" },
] as const;

export function PomodoroPage() {
  const styles = useStyles();
  const {
    phase,
    running,
    remaining,
    duration,
    taskId,
    stats,
    start,
    pause,
    stop,
    skip,
    setTask,
  } = usePomodoroStore();
  const tasks = useTaskStore((s) => s.tasks);

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const progress = duration > 0 ? remaining / duration : 0;
  const sessionLabel = PHASES.find((p) => p.key === phase)?.label ?? "Focus";

  return (
    <div className={styles.root}>
      <div className={styles.phases}>
        {PHASES.map((p) => (
          <Button
            key={p.key}
            size="small"
            className={styles.phaseBtn}
            appearance={phase === p.key ? "primary" : "subtle"}
            onClick={() => {
              usePomodoroStore.setState({ phase: p.key, running: false });
              usePomodoroStore.getState().stop();
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <ProgressRing progress={progress} size={300}>
        <div className={styles.time}>{formatCountdown(remaining)}</div>
        <div className={styles.sessionLabel}>{sessionLabel}</div>
      </ProgressRing>

      <div className={styles.controls}>
        {running ? (
          <Button
            appearance="primary"
            className={styles.primaryBtn}
            size="large"
            icon={<Pause size={18} strokeWidth={2} />}
            onClick={pause}
          >
            Pause
          </Button>
        ) : (
          <Button
            appearance="primary"
            className={styles.primaryBtn}
            size="large"
            icon={<Play size={18} strokeWidth={2} />}
            onClick={start}
          >
            {remaining < duration ? "Resume" : "Start"}
          </Button>
        )}
        <Button
          appearance="subtle"
          className={styles.ghostBtn}
          size="large"
          icon={<RotateCcw size={18} strokeWidth={1.75} />}
          onClick={stop}
          aria-label="Stop"
        />
        <Button
          appearance="subtle"
          className={styles.ghostBtn}
          size="large"
          icon={<SkipForward size={18} strokeWidth={1.75} />}
          onClick={skip}
          aria-label="Skip"
        />
      </div>

      <span className={styles.hint}>Press Space to start or pause</span>

      <Dropdown
        className={styles.taskPicker}
        placeholder="Link a task (optional)"
        appearance="filled-darker"
        value={activeTasks.find((t) => t.id === taskId)?.title ?? ""}
        selectedOptions={taskId ? [String(taskId)] : []}
        onOptionSelect={(_, data) => setTask(data.optionValue ? Number(data.optionValue) : null)}
      >
        <Option value="">No task</Option>
        {activeTasks.map((t) => (
          <Option key={t.id} value={String(t.id)}>
            {t.title}
          </Option>
        ))}
      </Dropdown>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.today_count}</span>
          <span className={styles.statLabel}>Today</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{stats.week_count}</span>
          <span className={styles.statLabel}>This week</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatFocus(stats.total_focus_seconds)}</span>
          <span className={styles.statLabel}>Total focus</span>
        </div>
      </div>
    </div>
  );
}
