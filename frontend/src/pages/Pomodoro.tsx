import {
  Button,
  Card,
  Dropdown,
  makeStyles,
  Option,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowResetRegular,
  NextRegular,
  PauseRegular,
  PlayRegular,
} from "@fluentui/react-icons";

import { Page } from "@/components/layout/Page";
import { ProgressRing } from "@/components/pomodoro/ProgressRing";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { formatCountdown, formatFocus } from "@/utils/format";

const useStyles = makeStyles({
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 1fr) 280px",
    gap: "24px",
    height: "100%",
    "@media (max-width: 860px)": { gridTemplateColumns: "1fr" },
  },
  timerCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "24px",
    padding: "32px",
  },
  phaseTabs: { display: "flex", gap: "8px" },
  time: {
    fontSize: "64px",
    fontWeight: 300,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
  },
  controls: { display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" },
  side: { display: "flex", flexDirection: "column", gap: "16px" },
  statCard: { padding: "18px", display: "flex", flexDirection: "column", gap: "4px" },
  statValue: { fontSize: "28px", fontWeight: 600 },
});

const PHASE_LABEL: Record<string, string> = {
  work: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

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

  return (
    <Page title="Pomodoro" subtitle="Focus in short, deliberate sprints.">
      <div className={styles.layout}>
        <Card className={styles.timerCard}>
          <div className={styles.phaseTabs}>
            {(["work", "short_break", "long_break"] as const).map((p) => (
              <Button
                key={p}
                size="small"
                appearance={phase === p ? "primary" : "subtle"}
                onClick={() => {
                  // Switching phase resets the timer to that phase.
                  usePomodoroStore.setState({ phase: p, running: false });
                  usePomodoroStore.getState().stop();
                }}
              >
                {PHASE_LABEL[p]}
              </Button>
            ))}
          </div>

          <ProgressRing progress={progress}>
            <Text className={styles.time}>{formatCountdown(remaining)}</Text>
            <Text style={{ color: tokens.colorNeutralForeground3 }}>{PHASE_LABEL[phase]}</Text>
          </ProgressRing>

          <div className={styles.controls}>
            {running ? (
              <Button appearance="primary" icon={<PauseRegular />} onClick={pause}>
                Pause
              </Button>
            ) : (
              <Button appearance="primary" icon={<PlayRegular />} onClick={start}>
                {remaining < duration ? "Resume" : "Start"}
              </Button>
            )}
            <Button icon={<ArrowResetRegular />} onClick={stop}>
              Stop
            </Button>
            <Button icon={<NextRegular />} onClick={skip}>
              Skip
            </Button>
          </div>

          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Press Space to start or pause.
          </Text>
        </Card>

        <div className={styles.side}>
          <Card className={styles.statCard}>
            <Text weight="semibold">Linked task</Text>
            <Dropdown
              placeholder="No task"
              value={activeTasks.find((t) => t.id === taskId)?.title ?? "No task"}
              selectedOptions={taskId ? [String(taskId)] : []}
              onOptionSelect={(_, data) =>
                setTask(data.optionValue ? Number(data.optionValue) : null)
              }
            >
              <Option value="">No task</Option>
              {activeTasks.map((t) => (
                <Option key={t.id} value={String(t.id)}>
                  {t.title}
                </Option>
              ))}
            </Dropdown>
          </Card>

          <Card className={styles.statCard}>
            <Text weight="semibold">Today</Text>
            <span className={styles.statValue}>{stats.today_count}</span>
            <Text style={{ color: tokens.colorNeutralForeground3 }}>
              {formatFocus(stats.today_focus_seconds)} focused
            </Text>
          </Card>
          <Card className={styles.statCard}>
            <Text weight="semibold">This week</Text>
            <span className={styles.statValue}>{stats.week_count}</span>
          </Card>
          <Card className={styles.statCard}>
            <Text weight="semibold">All time</Text>
            <span className={styles.statValue}>{stats.total_count}</span>
            <Text style={{ color: tokens.colorNeutralForeground3 }}>
              {formatFocus(stats.total_focus_seconds)} total
            </Text>
          </Card>
        </div>
      </div>
    </Page>
  );
}
