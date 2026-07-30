import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { makeStyles, tokens } from "@fluentui/react-components";

import { SortableTaskCard } from "@/components/tasks/TaskCard";
import type { Task, TaskStatus } from "@/types";

const columnDroppableId = (status: TaskStatus) => `col:${status}`;

const useStyles = makeStyles({
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: 0,
    height: "100%",
    padding: "4px 6px",
    borderRadius: "16px",
  },
  header: { display: "flex", alignItems: "center", gap: "8px", padding: "0 6px" },
  title: {
    fontSize: "13px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    letterSpacing: "0.02em",
  },
  count: { fontSize: "12px", color: tokens.colorNeutralForeground3 },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    overflowY: "auto",
    flex: 1,
    padding: "2px",
    borderRadius: "14px",
    transition: "background-color 150ms ease",
  },
  over: { backgroundColor: tokens.colorNeutralBackground1Hover },
  empty: {
    padding: "28px 12px",
    textAlign: "center",
    fontSize: "13px",
    color: tokens.colorNeutralForeground4,
  },
});

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  emptyLabel: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

export function KanbanColumn({
  status,
  title,
  emptyLabel,
  tasks,
  onEdit,
  onDelete,
}: KanbanColumnProps) {
  const styles = useStyles();
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });

  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <span className={styles.count}>{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`${styles.list} ${isOver ? styles.over : ""}`}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {tasks.length === 0 && <div className={styles.empty}>{emptyLabel}</div>}
        </div>
      </SortableContext>
    </div>
  );
}
