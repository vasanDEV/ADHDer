import {
  Button,
  Card,
  makeStyles,
  Tab,
  TabList,
  Text,
  tokens,
} from "@fluentui/react-components";
import { ChevronLeftRegular, ChevronRightRegular } from "@fluentui/react-icons";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { DayTasksPanel } from "@/components/planner/DayTasksPanel";
import { Page } from "@/components/layout/Page";
import { useTaskStore } from "@/stores/useTaskStore";
import type { Task } from "@/types";

type View = "month" | "week" | "day";

const useStyles = makeStyles({
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: "16px",
    height: "100%",
    minHeight: 0,
    "@media (max-width: 900px)": { gridTemplateColumns: "1fr" },
  },
  calendarCard: { padding: "16px", display: "flex", flexDirection: "column", gap: "12px" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  navGroup: { display: "flex", alignItems: "center", gap: "8px" },
  monthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "6px",
    flex: 1,
    minHeight: 0,
  },
  weekday: {
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    paddingBottom: "4px",
  },
  dayCell: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minHeight: "84px",
    padding: "6px",
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
    textAlign: "left",
  },
  outside: { opacity: 0.4 },
  selected: { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: "-2px" },
  today: { border: `1px solid ${tokens.colorBrandForeground1}` },
  dayNum: { fontSize: "13px", fontWeight: 600 },
  pill: {
    fontSize: "10px",
    padding: "1px 5px",
    borderRadius: "6px",
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  panelCard: { padding: "16px", height: "100%", minHeight: 0 },
  weekGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "8px",
    flex: 1,
    minHeight: 0,
  },
  weekCol: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px",
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: "auto",
    cursor: "pointer",
  },
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PlannerPage() {
  const styles = useStyles();
  const { tasks, load, create, update, remove } = useTaskStore();

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  useEffect(() => {
    void load();
  }, [load]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.planner_date) continue;
      const arr = map.get(t.planner_date) ?? [];
      arr.push(t);
      map.set(t.planner_date, arr);
    }
    return map;
  }, [tasks]);

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const tasksFor = (d: Date) => tasksByDay.get(dayKey(d)) ?? [];

  const addToDay = (day: Date, title: string) =>
    void create({ title, planner_date: dayKey(day), status: "todo" });
  const toggle = (task: Task) =>
    void update(task.id, { status: task.completed ? "todo" : "done" });

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [cursor]);

  const shift = (dir: number) => {
    if (view === "month") setCursor((c) => addMonths(c, dir));
    else if (view === "week") setCursor((c) => addWeeks(c, dir));
    else {
      setCursor((c) => addDays(c, dir));
      setSelected((c) => addDays(c, dir));
    }
  };

  const heading =
    view === "day"
      ? format(selected, "d MMMM yyyy")
      : view === "week"
        ? `Week of ${format(weekDays[0], "d MMM")}`
        : format(cursor, "MMMM yyyy");

  return (
    <Page title="Planner" subtitle="Plan day-wise — entries sync with your Task Board.">
      <div className={styles.layout}>
        <Card className={styles.calendarCard}>
          <div className={styles.toolbar}>
            <div className={styles.navGroup}>
              <Button
                appearance="subtle"
                icon={<ChevronLeftRegular />}
                aria-label="Previous"
                onClick={() => shift(-1)}
              />
              <Text weight="semibold" style={{ minWidth: "150px", textAlign: "center" }}>
                {heading}
              </Text>
              <Button
                appearance="subtle"
                icon={<ChevronRightRegular />}
                aria-label="Next"
                onClick={() => shift(1)}
              />
              <Button
                size="small"
                appearance="secondary"
                onClick={() => {
                  setCursor(new Date());
                  setSelected(new Date());
                }}
              >
                Today
              </Button>
            </div>
            <TabList
              selectedValue={view}
              onTabSelect={(_, d) => setView(d.value as View)}
              size="small"
            >
              <Tab value="month">Month</Tab>
              <Tab value="week">Week</Tab>
              <Tab value="day">Day</Tab>
            </TabList>
          </div>

          {view === "month" && (
            <div className={styles.monthGrid}>
              {WEEKDAYS.map((w) => (
                <div key={w} className={styles.weekday}>
                  {w}
                </div>
              ))}
              {monthDays.map((day) => {
                const dayTasks = tasksFor(day);
                const cls = [
                  styles.dayCell,
                  !isSameMonth(day, cursor) && styles.outside,
                  isSameDay(day, selected) && styles.selected,
                  isSameDay(day, new Date()) && styles.today,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={day.toISOString()}
                    className={cls}
                    onClick={() => {
                      setSelected(day);
                      setView("day");
                    }}
                  >
                    <span className={styles.dayNum}>{format(day, "d")}</span>
                    {dayTasks.slice(0, 3).map((t) => (
                      <span key={t.id} className={styles.pill} title={t.title}>
                        {t.title}
                      </span>
                    ))}
                    {dayTasks.length > 3 && (
                      <Text size={100}>+{dayTasks.length - 3} more</Text>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {view === "week" && (
            <div className={styles.weekGrid}>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={styles.weekCol}
                  onClick={() => setSelected(day)}
                >
                  <Text size={200} weight="semibold">
                    {format(day, "EEE d")}
                  </Text>
                  {tasksFor(day).map((t) => (
                    <span key={t.id} className={styles.pill} title={t.title}>
                      {t.title}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}

          {view === "day" && (
            <Text style={{ color: tokens.colorNeutralForeground3 }}>
              Use the panel on the right to manage {format(selected, "MMMM d")}.
            </Text>
          )}
        </Card>

        <Card className={styles.panelCard}>
          <DayTasksPanel
            day={selected}
            tasks={tasksFor(selected)}
            onAdd={(title) => addToDay(selected, title)}
            onToggle={toggle}
            onDelete={(id) => void remove(id)}
          />
        </Card>
      </div>
    </Page>
  );
}
