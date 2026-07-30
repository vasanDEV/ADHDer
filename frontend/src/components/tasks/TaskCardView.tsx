import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { Pencil, Timer, Trash2 } from "lucide-react";
import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";

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
    touchAction: "none",
    "--act-op": "0",
    ":hover": {
      "--act-op": "1",
      boxShadow: "0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)",
    },
  },
  dragging: { cursor: "grabbing", boxShadow: "0 8px 28px rgba(0,0,0,0.18)" },
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

interface TaskCardViewProps extends HTMLAttributes<HTMLDivElement> {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: number) => void;
  dragging?: boolean;
  overlay?: boolean;
  style?: CSSProperties;
}

/** Pure presentational task card. Drag wiring is supplied by the parent. */
export const TaskCardView = forwardRef<HTMLDivElement, TaskCardViewProps>(function TaskCardView(
  { task, onEdit, onDelete, dragging, overlay, style, ...rest },
  ref,
) {
  const styles = useStyles();
  const due = task.due_date
    ? new Date(task.due_date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  // Buttons must not initiate a drag.
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      ref={ref}
      style={style}
      className={`${styles.card} ${dragging || overlay ? styles.dragging : ""}`}
      {...rest}
    >
      <div className={styles.topRow}>
        <span className={task.completed ? `${styles.title} ${styles.done}` : styles.title}>
          {task.title}
        </span>
        {!overlay && (
          <div className={styles.actions}>
            <Button
              size="small"
              appearance="subtle"
              icon={<Pencil size={15} strokeWidth={1.75} />}
              aria-label="Edit task"
              onPointerDown={stop}
              onClick={() => onEdit?.(task)}
            />
            <Button
              size="small"
              appearance="subtle"
              icon={<Trash2 size={15} strokeWidth={1.75} />}
              aria-label="Delete task"
              onPointerDown={stop}
              onClick={() => onDelete?.(task.id)}
            />
          </div>
        )}
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
    </div>
  );
});
