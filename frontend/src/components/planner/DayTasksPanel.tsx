import {
  Badge,
  Button,
  Caption1,
  Checkbox,
  Input,
  makeStyles,
  Text,
  tokens,
} from "@fluentui/react-components";
import { AddRegular, DeleteRegular } from "@fluentui/react-icons";
import { format } from "date-fns";
import { useState } from "react";

import type { Task } from "@/types";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "100%",
    minHeight: 0,
  },
  addRow: { display: "flex", gap: "8px" },
  list: { display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  done: { textDecoration: "line-through", color: tokens.colorNeutralForeground3 },
  grow: { flex: 1, minWidth: 0 },
  empty: { color: tokens.colorNeutralForeground4, padding: "12px 0" },
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
      <div>
        <Text size={500} weight="semibold">
          {format(day, "d MMMM")}
        </Text>
        <br />
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          {format(day, "EEEE")}
        </Caption1>
      </div>

      <div className={styles.addRow}>
        <Input
          className={styles.grow}
          placeholder="Add a plan for this day..."
          value={title}
          onChange={(_, d) => setTitle(d.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button appearance="primary" icon={<AddRegular />} onClick={submit}>
          Add
        </Button>
      </div>

      <div className={styles.list}>
        {tasks.length === 0 && <div className={styles.empty}>Nothing planned yet.</div>}
        {tasks.map((task) => (
          <div key={task.id} className={styles.item}>
            <Checkbox checked={task.completed} onChange={() => onToggle(task)} />
            <div className={styles.grow}>
              <Text className={task.completed ? styles.done : undefined}>{task.title}</Text>
            </div>
            <Badge
              size="small"
              color={
                task.priority === "high"
                  ? "danger"
                  : task.priority === "medium"
                    ? "warning"
                    : "success"
              }
            >
              {task.priority}
            </Badge>
            <Button
              size="small"
              appearance="subtle"
              icon={<DeleteRegular />}
              aria-label="Delete"
              onClick={() => onDelete(task.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
