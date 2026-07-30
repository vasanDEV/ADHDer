import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Maximize, Minimize } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { AnalogClock } from "@/components/dashboard/AnalogClock";
import { useClock } from "@/hooks/useClock";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { formatClock, formatCountdown, formatFocus } from "@/utils/format";

const useStyles = makeStyles({
  root: {
    position: "relative",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "24px 32px 0",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "24px",
    paddingBottom: "48px",
  },
  analog: { opacity: 0.55 },
  clock: {
    fontSize: "clamp(72px, 13vw, 120px)",
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: "-3px",
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground1,
  },
  dateRow: { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  weekday: { fontSize: "20px", fontWeight: 500, color: tokens.colorNeutralForeground1 },
  date: { fontSize: "15px", color: tokens.colorNeutralForeground2 },
  divider: {
    width: "48px",
    height: "1px",
    backgroundColor: tokens.colorNeutralStroke1,
    margin: "8px 0",
  },
  info: { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" },
  infoStrong: { fontSize: "16px", fontWeight: 500, color: tokens.colorNeutralForeground1 },
  infoMuted: { fontSize: "14px", color: tokens.colorNeutralForeground2 },
  // Fullscreen focus mode
  fsExit: { position: "fixed", top: "24px", right: "24px", zIndex: 5001 },
});

function useCurrentTask() {
  const tasks = useTaskStore((s) => s.tasks);
  return useMemo(() => {
    const active = tasks
      .filter((t) => t.status === "in_progress")
      .sort((a, b) => a.position - b.position);
    if (active.length) return active[0];
    const todo = tasks
      .filter((t) => t.status === "todo")
      .sort((a, b) => a.position - b.position);
    return todo[0] ?? null;
  }, [tasks]);
}

export function DashboardPage() {
  const styles = useStyles();
  const now = useClock();
  const { clock24Hour, showSeconds } = useSettingsStore((s) => s.settings);
  const stats = usePomodoroStore((s) => s.stats);
  const { running, remaining, phase } = usePomodoroStore();
  const currentTask = useCurrentTask();
  const [fullscreen, setFullscreen] = useState(false);

  const timeStr = formatClock(now, clock24Hour, showSeconds);
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const dateStr = now.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const progressLine =
    stats.today_count > 0
      ? `${stats.today_count} ${stats.today_count === 1 ? "pomodoro" : "pomodoros"} today · ${formatFocus(stats.today_focus_seconds)} focused`
      : "No focus sessions yet today.";

  const taskLine = currentTask ? currentTask.title : "Nothing planned right now.";

  const content = (
    <motion.div
      className={styles.center}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.analog}>
        <AnalogClock date={now} size={72} />
      </div>

      <div className={styles.clock}>{timeStr}</div>

      <div className={styles.dateRow}>
        <span className={styles.weekday}>{weekday}</span>
        <span className={styles.date}>{dateStr}</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.info}>
        <span className={styles.infoStrong}>{taskLine}</span>
        {running && (
          <span className={styles.infoMuted}>
            {phase === "work" ? "Focusing" : "On a break"} · {formatCountdown(remaining)}
          </span>
        )}
        <span className={styles.infoMuted}>{progressLine}</span>
      </div>
    </motion.div>
  );

  if (fullscreen) {
    return (
      <motion.div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 5000,
          backgroundColor: tokens.colorNeutralBackground2,
          display: "flex",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          className={styles.fsExit}
          appearance="subtle"
          icon={<Minimize size={18} strokeWidth={1.75} />}
          onClick={() => setFullscreen(false)}
        >
          Exit
        </Button>
        {content}
      </motion.div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <Button
          appearance="subtle"
          icon={<Maximize size={18} strokeWidth={1.75} />}
          onClick={() => setFullscreen(true)}
        >
          Focus mode
        </Button>
      </div>
      {content}
    </div>
  );
}
