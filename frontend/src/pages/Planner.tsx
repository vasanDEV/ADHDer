import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { DayTasksPanel } from "@/components/planner/DayTasksPanel";
import { Page } from "@/components/layout/Page";
import { useTaskStore } from "@/stores/useTaskStore";
import type { Task } from "@/types";

type View = "month" | "week" | "day";

const useStyles = makeStyles({
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: "24px",
    height: "100%",
    minHeight: 0,
    "@media (max-width: 960px)": { gridTemplateColumns: "1fr" },
  },
  calendar: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  navGroup: { display: "flex", alignItems: "center", gap: "4px" },
  heading: {
    fontSize: "20px",
    fontWeight: 600,
    minWidth: "170px",
    color: tokens.colorNeutralForeground1,
  },
  segmented: {
    display: "inline-flex",
    padding: "4px",
    gap: "2px",
    borderRadius: "999px",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  segBtn: { borderRadius: "999px", minWidth: "72px", border: "none", fontWeight: 500 },
  weekdays: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" },
  weekday: {
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    letterSpacing: "0.04em",
    paddingBottom: "4px",
  },
  monthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gridAutoRows: "1fr",
    gap: "4px",
    flex: 1,
    minHeight: 0,
  },
  dayCell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "8px 6px",
    borderRadius: "12px",
    backgroundColor: "transparent",
    cursor: "pointer",
    border: "none",
    transition: "background-color 120ms ease",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1 },
  },
  outside: { opacity: 0.35 },
  selected: { backgroundColor: tokens.colorNeutralBackground1 },
  dayNum: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    fontSize: "15px",
    fontWeight: 500,
    borderRadius: "999px",
    color: tokens.colorNeutralForeground1,
  },
  todayNum: {
    backgroundColor: tokens.colorBrandBackground,
    color: "#FFFFFF",
    fontWeight: 600,
  },
  dots: { display: "flex", gap: "3px", flexWrap: "wrap", justifyContent: "center" },
  dot: { width: "5px", height: "5px", borderRadius: "999px", backgroundColor: tokens.colorBrandForeground1 },
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
    gap: "8px",
    padding: "12px 8px",
    borderRadius: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
    overflowY: "auto",
    cursor: "pointer",
  },
  weekColHead: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
  weekDow: { fontSize: "11px", fontWeight: 600, color: tokens.colorNeutralForeground3 },
  weekDay: { fontSize: "17px", fontWeight: 500, color: tokens.colorNeutralForeground1 },
  pill: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "8px",
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  more: { fontSize: "10px", color: tokens.colorNeutralForeground3 },
  panel: {
    height: "100%",
    minHeight: 0,
    padding: "20px",
    borderRadius: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: "hidden",
  },
  dayHint: { fontSize: "14px", color: tokens.colorNeutralForeground2 },
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
    <Page title="Planner" subtitle="Plans sync automatically with your Task Board.">
      <div className={styles.layout}>
        <div className={styles.calendar}>
          <div className={styles.toolbar}>
            <div className={styles.navGroup}>
              <Button
                appearance="subtle"
                shape="circular"
                icon={<ChevronLeft size={18} strokeWidth={1.75} />}
                aria-label="Previous"
                onClick={() => shift(-1)}
              />
              <span className={styles.heading}>{heading}</span>
              <Button
                appearance="subtle"
                shape="circular"
                icon={<ChevronRight size={18} strokeWidth={1.75} />}
                aria-label="Next"
                onClick={() => shift(1)}
              />
              <Button
                size="small"
                appearance="subtle"
                onClick={() => {
                  setCursor(new Date());
                  setSelected(new Date());
                }}
              >
                Today
              </Button>
            </div>
            <div className={styles.segmented}>
              {(["month", "week", "day"] as const).map((v) => (
                <Button
                  key={v}
                  size="small"
                  className={styles.segBtn}
                  appearance={view === v ? "primary" : "subtle"}
                  onClick={() => setView(v)}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {view === "month" && (
            <>
              <div className={styles.weekdays}>
                {WEEKDAYS.map((w) => (
                  <div key={w} className={styles.weekday}>
                    {w}
                  </div>
                ))}
              </div>
              <div className={styles.monthGrid}>
                {monthDays.map((day) => {
                  const dayTasks = tasksFor(day);
                  const isToday = isSameDay(day, new Date());
                  const cls = [
                    styles.dayCell,
                    !isSameMonth(day, cursor) && styles.outside,
                    isSameDay(day, selected) && styles.selected,
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
                      <span className={`${styles.dayNum} ${isToday ? styles.todayNum : ""}`}>
                        {format(day, "d")}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className={styles.dots}>
                          {dayTasks.slice(0, 4).map((t) => (
                            <span key={t.id} className={styles.dot} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {view === "week" && (
            <div className={styles.weekGrid}>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={styles.weekCol}
                  onClick={() => setSelected(day)}
                >
                  <div className={styles.weekColHead}>
                    <span className={styles.weekDow}>{format(day, "EEE")}</span>
                    <span className={styles.weekDay}>{format(day, "d")}</span>
                  </div>
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
            <span className={styles.dayHint}>
              Manage {format(selected, "MMMM d")} in the panel on the right.
            </span>
          )}
        </div>

        <div className={styles.panel}>
          <AnimatePresence mode="wait">
            <motion.div
              key={dayKey(selected)}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ height: "100%" }}
            >
              <DayTasksPanel
                day={selected}
                tasks={tasksFor(selected)}
                onAdd={(title) => addToDay(selected, title)}
                onToggle={toggle}
                onDelete={(id) => void remove(id)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Page>
  );
}
