import {
  Button,
  Card,
  makeStyles,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  FullScreenMaximizeRegular,
  FullScreenMinimizeRegular,
  WeatherPartlyCloudyDayRegular,
} from "@fluentui/react-icons";
import { motion } from "framer-motion";
import { useState } from "react";

import { AnalogClock } from "@/components/dashboard/AnalogClock";
import { useClock } from "@/hooks/useClock";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { formatClock, formatFocus } from "@/utils/format";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gridTemplateRows: "auto 1fr",
    gap: "20px",
    height: "100%",
  },
  clockCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "48px",
    padding: "36px",
    flexWrap: "wrap",
  },
  bigClock: {
    fontSize: "clamp(64px, 12vw, 132px)",
    fontWeight: 200,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-2px",
  },
  dateBlock: { display: "flex", flexDirection: "column", gap: "4px" },
  weekday: { fontSize: "28px", fontWeight: 600 },
  date: { fontSize: "18px", color: tokens.colorNeutralForeground3 },
  lower: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    alignContent: "start",
  },
  card: { padding: "20px", display: "flex", flexDirection: "column", gap: "8px" },
  statValue: { fontSize: "32px", fontWeight: 600 },
  fullscreen: {
    position: "fixed",
    inset: 0,
    zIndex: 5000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  fsClock: {
    fontSize: "clamp(96px, 20vw, 280px)",
    fontWeight: 200,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "24px 28px 0",
  },
});

const QUOTES = [
  "Small steps every day.",
  "Done is better than perfect.",
  "Focus on progress, not perfection.",
  "One task at a time.",
];

export function DashboardPage() {
  const styles = useStyles();
  const now = useClock();
  const { clock24Hour, showSeconds } = useSettingsStore((s) => s.settings);
  const stats = usePomodoroStore((s) => s.stats);
  const [fullscreen, setFullscreen] = useState(false);

  const timeStr = formatClock(now, clock24Hour, showSeconds);
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const dateStr = now.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const quote = QUOTES[now.getDate() % QUOTES.length];

  if (fullscreen) {
    return (
      <div className={styles.fullscreen}>
        <motion.div
          className={styles.fsClock}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {timeStr}
        </motion.div>
        <Text size={600}>{weekday}</Text>
        <Text size={500} style={{ color: tokens.colorNeutralForeground3 }}>
          {dateStr}
        </Text>
        <Button
          appearance="subtle"
          icon={<FullScreenMinimizeRegular />}
          onClick={() => setFullscreen(false)}
        >
          Exit fullscreen
        </Button>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className={styles.header}>
        <div>
          <Text size={700} weight="semibold">
            Dashboard
          </Text>
        </div>
        <Button
          appearance="subtle"
          icon={<FullScreenMaximizeRegular />}
          onClick={() => setFullscreen(true)}
        >
          Fullscreen
        </Button>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: "16px 28px 28px" }}>
        <div className={styles.grid}>
          <Card className={styles.clockCard}>
            <motion.div
              className={styles.bigClock}
              key={timeStr.length}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
            >
              {timeStr}
            </motion.div>
            <div className={styles.dateBlock}>
              <span className={styles.weekday}>{weekday}</span>
              <span className={styles.date}>{dateStr}</span>
            </div>
            <AnalogClock date={now} size={150} />
          </Card>

          <div className={styles.lower}>
            <Card className={styles.card}>
              <Text weight="semibold">Today's focus</Text>
              <span className={styles.statValue}>{stats.today_count}</span>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>
                pomodoros · {formatFocus(stats.today_focus_seconds)}
              </Text>
            </Card>
            <Card className={styles.card}>
              <Text weight="semibold">This week</Text>
              <span className={styles.statValue}>{stats.week_count}</span>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>pomodoros</Text>
            </Card>
            <Card className={styles.card}>
              <Text weight="semibold">
                <WeatherPartlyCloudyDayRegular /> Weather
              </Text>
              <Text style={{ color: tokens.colorNeutralForeground3 }}>
                Coming soon — local weather widget.
              </Text>
            </Card>
            <Card className={styles.card}>
              <Text weight="semibold">Daily quote</Text>
              <Text italic>"{quote}"</Text>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
