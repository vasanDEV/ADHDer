import { Button, Checkbox, Input, makeStyles, tokens } from "@fluentui/react-components";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

import { priorityColor } from "@/theme/tokens";
import type { Task } from "@/types";

const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "16px", height: "100%", minHeight: 0 },
  head: { display: "flex", flexDirection: "column", gap: "2px" },
  dayNum: { fontSize: "22px", fontWeight: 600, color: tokens.colorNeutralForeground1 },
  dow: { fontSize: "14px", color: tokens.colorNeutralForeground2 },
  addRow: { display: "flex", gap: "8px" },
  grow: { flex: 1, minWidth: 0 },
  list: { display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", flex: 1 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "12px",
    transition: "background-color 120ms ease",
    "--act-op": "0",
    ":hover": { backgroundColor: tokens.colorNeutralBackground2, "--act-op": "1" },
  },
  title: { flex: 1, minWidth: 0, fontSize: "14px", color: tokens.colorNeutralForeground1 },
  done: { textDecoration: "line-through", color: tokens.colorNeutralForeground3 },
  dot: { width: "8px", height: "8px", borderRadius: "999px", flexShrink: 0 },
  del: { opacity: "var(--act-op)", transition: "opacity 120ms ease" },
  empty: { fontSize: "14px", color: tokens.colorNeutralForeground4, padding: "16px 0" },
});

interface DayTasksPanelProps {
  day: Date;
  tasks: Task[];
  onAdd: (title: string) => void;
  onToggle: (task: Task) => void;
  onDelete: (id: number) => void;
}

export function DayTasksPanel({ day, tasks, onAdd, onToggle, onDelete }: DayTasksPanelProps) {
  const styles = useStyles();
  const [title, setTitle] = useState("");

  const submit = () => {
    const value = title.trim();
    if (!value) return;
    onAdd(value);
    setTitle("");
  };

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className={styles.dayNum}>{format(day, "d MMMM")}</span>
        <span className={styles.dow}>{format(day, "EEEE")}</span>
      </div>

      <div className={styles.addRow}>
        <Input
          className={styles.grow}
          appearance="filled-darker"
          placeholder="Add a plan…"
          value={title}
          onChange={(_, d) => setTitle(d.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button
          appearance="primary"
          icon={<Plus size={16} strokeWidth={2} />}
          aria-label="Add plan"
          onClick={submit}
        />
      </div>

      <div className={styles.list}>
        {tasks.length === 0 && <div className={styles.empty}>No plans for this day.</div>}
        {tasks.map((task) => (
          <div key={task.id} className={styles.item}>
            <Checkbox checked={task.completed} onChange={() => onToggle(task)} shape="circular" />
            <span
              className={styles.dot}
              style={{ backgroundColor: priorityColor[task.priority] }}
            />
            <span className={`${styles.title} ${task.completed ? styles.done : ""}`}>
              {task.title}
            </span>
            <Button
              size="small"
              appearance="subtle"
              className={styles.del}
              icon={<Trash2 size={15} strokeWidth={1.75} />}
              aria-label="Delete"
              onClick={() => onDelete(task.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
