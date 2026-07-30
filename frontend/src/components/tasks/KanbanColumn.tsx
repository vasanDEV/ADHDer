import { makeStyles, tokens } from "@fluentui/react-components";
import { AnimatePresence } from "framer-motion";
import { useDrop } from "react-dnd";

import { TaskCard } from "@/components/tasks/TaskCard";
import { TASK_DND_TYPE, type TaskDragItem } from "@/components/tasks/dnd";
import type { Task, TaskStatus } from "@/types";

const useStyles = makeStyles({
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: 0,
    height: "100%",
    padding: "4px 6px",
    borderRadius: "16px",
    transition: "background-color 150ms ease",
  },
  over: { backgroundColor: tokens.colorNeutralBackground1Hover },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 6px",
  },
  title: { fontSize: "13px", fontWeight: 600, color: tokens.colorNeutralForeground2, letterSpacing: "0.02em" },
  count: { fontSize: "12px", color: tokens.colorNeutralForeground3 },
  list: { display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1, padding: "2px" },
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
  onDropInColumn: (item: TaskDragItem, status: TaskStatus, index: number) => void;
}

export function KanbanColumn({
  status,
  title,
  emptyLabel,
  tasks,
  onEdit,
  onDelete,
  onDropInColumn,
}: KanbanColumnProps) {
  const styles = useStyles();

  const [{ isOver }, drop] = useDrop<TaskDragItem, void, { isOver: boolean }>(
    () => ({
      accept: TASK_DND_TYPE,
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        onDropInColumn(item, status, tasks.length);
      },
      collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    }),
    [status, tasks.length, onDropInColumn],
  );

  return (
    <div ref={drop} className={`${styles.column} ${isOver ? styles.over : ""}`}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <span className={styles.count}>{tasks.length}</span>
      </div>
      <div className={styles.list}>
        <AnimatePresence mode="popLayout">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onEdit={onEdit}
              onDelete={onDelete}
              onDropBefore={onDropInColumn}
            />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && <div className={styles.empty}>{emptyLabel}</div>}
      </div>
    </div>
  );
}
