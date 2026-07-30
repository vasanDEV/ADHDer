import {
  Badge,
  Body1,
  Button,
  Caption1,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { DeleteRegular, EditRegular, TimerRegular } from "@fluentui/react-icons";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";

import { TASK_DND_TYPE, type TaskDragItem } from "@/components/tasks/dnd";
import type { Priority, Task } from "@/types";

const useStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "12px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow2,
    cursor: "grab",
  },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" },
  title: { fontWeight: 600 },
  done: { textDecoration: "line-through", color: tokens.colorNeutralForeground3 },
  meta: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  tags: { display: "flex", gap: "4px", flexWrap: "wrap" },
  actions: { display: "flex", gap: "2px" },
  priorityBar: { width: "4px", alignSelf: "stretch", borderRadius: "4px" },
  inner: { display: "flex", gap: "10px" },
});

const PRIORITY_COLOR: Record<Priority, string> = {
  high: tokens.colorPaletteRedForeground1,
  medium: tokens.colorPaletteYellowForeground1,
  low: tokens.colorPaletteGreenForeground1,
};

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onDropBefore: (item: TaskDragItem, targetStatus: Task["status"], index: number) => void;
}

export function TaskCard({ task, index, onEdit, onDelete, onDropBefore }: TaskCardProps) {
  const styles = useStyles();
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag<TaskDragItem, void, { isDragging: boolean }>(() => ({
    type: TASK_DND_TYPE,
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [task.id, task.status]);

  const [, drop] = useDrop<TaskDragItem>(() => ({
    accept: TASK_DND_TYPE,
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;
      if (item.id === task.id) return;
      onDropBefore(item, task.status, index);
    },
  }), [task.id, task.status, index, onDropBefore]);

  drag(drop(ref));

  const due = task.due_date
    ? new Date(task.due_date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className={styles.card}
    >
      <div className={styles.inner}>
        <div
          className={styles.priorityBar}
          style={{ backgroundColor: PRIORITY_COLOR[task.priority] }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
          <div className={styles.topRow}>
            <Body1 className={task.completed ? styles.done : styles.title}>{task.title}</Body1>
            <div className={styles.actions}>
              <Button
                size="small"
                appearance="subtle"
                icon={<EditRegular />}
                aria-label="Edit task"
                onClick={() => onEdit(task)}
              />
              <Button
                size="small"
                appearance="subtle"
                icon={<DeleteRegular />}
                aria-label="Delete task"
                onClick={() => onDelete(task.id)}
              />
            </div>
          </div>

          {task.description && (
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              {task.description}
            </Caption1>
          )}

          <div className={styles.meta}>
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
            {due && (
              <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>Due {due}</Caption1>
            )}
            {task.estimated_pomodoros > 0 && (
              <Caption1 style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <TimerRegular fontSize={14} />
                {task.completed_pomodoros}/{task.estimated_pomodoros}
              </Caption1>
            )}
          </div>

          {task.tags.length > 0 && (
            <div className={styles.tags}>
              {task.tags.map((tag) => (
                <Badge key={tag} size="small" appearance="tint" color="informative">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
