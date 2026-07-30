import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Pencil, Timer, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";

import { TASK_DND_TYPE, type TaskDragItem } from "@/components/tasks/dnd";
import { priorityColor } from "@/theme/tokens";
import type { Task } from "@/types";

const useStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "16px",
    borderRadius: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.05)",
    cursor: "grab",
    "--act-op": "0",
    ":hover": { "--act-op": "1", boxShadow: "0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)" },
  },
  topRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" },
  title: {
    fontSize: "15px",
    fontWeight: 500,
    lineHeight: 1.35,
    color: tokens.colorNeutralForeground1,
  },
  done: { textDecoration: "line-through", color: tokens.colorNeutralForeground3 },
  desc: {
    fontSize: "13px",
    color: tokens.colorNeutralForeground2,
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "12px",
    color: tokens.colorNeutralForeground2,
  },
  dot: { width: "8px", height: "8px", borderRadius: "999px", flexShrink: 0 },
  metaItem: { display: "inline-flex", alignItems: "center", gap: "4px" },
  tags: { display: "flex", gap: "6px", flexWrap: "wrap" },
  tag: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "999px",
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
  actions: { display: "flex", gap: "2px", opacity: "var(--act-op)", transition: "opacity 120ms ease" },
});

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

  const [{ isDragging }, drag] = useDrag<TaskDragItem, void, { isDragging: boolean }>(
    () => ({
      type: TASK_DND_TYPE,
      item: { id: task.id, status: task.status },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [task.id, task.status],
  );

  const [, drop] = useDrop<TaskDragItem>(
    () => ({
      accept: TASK_DND_TYPE,
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        if (item.id === task.id) return;
        onDropBefore(item, task.status, index);
      },
    }),
    [task.id, task.status, index, onDropBefore],
  );

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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 1.02 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className={styles.card}
    >
      <div className={styles.topRow}>
        <span className={task.completed ? `${styles.title} ${styles.done}` : styles.title}>
          {task.title}
        </span>
        <div className={styles.actions}>
          <Button
            size="small"
            appearance="subtle"
            icon={<Pencil size={15} strokeWidth={1.75} />}
            aria-label="Edit task"
            onClick={() => onEdit(task)}
          />
          <Button
            size="small"
            appearance="subtle"
            icon={<Trash2 size={15} strokeWidth={1.75} />}
            aria-label="Delete task"
            onClick={() => onDelete(task.id)}
          />
        </div>
      </div>

      {task.description && <span className={styles.desc}>{task.description}</span>}

      <div className={styles.meta}>
        <span
          className={styles.dot}
          style={{ backgroundColor: priorityColor[task.priority] }}
          title={`${task.priority} priority`}
        />
        {due && <span className={styles.metaItem}>{due}</span>}
        {task.estimated_pomodoros > 0 && (
          <span className={styles.metaItem}>
            <Timer size={13} strokeWidth={1.75} />
            {task.completed_pomodoros}/{task.estimated_pomodoros}
          </span>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className={styles.tags}>
          {task.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
