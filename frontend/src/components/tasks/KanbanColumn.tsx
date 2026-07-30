import { Badge, makeStyles, Text, tokens } from "@fluentui/react-components";
import { AnimatePresence } from "framer-motion";
import { useDrop } from "react-dnd";

import { TaskCard } from "@/components/tasks/TaskCard";
import { TASK_DND_TYPE, type TaskDragItem } from "@/components/tasks/dnd";
import type { Task, TaskStatus } from "@/types";

const useStyles = makeStyles({
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "12px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    minHeight: 0,
    height: "100%",
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  list: { display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1 },
  over: { outline: `2px dashed ${tokens.colorBrandStroke1}`, outlineOffset: "-4px" },
  empty: {
    padding: "24px 8px",
    textAlign: "center",
    color: tokens.colorNeutralForeground4,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
});

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onDropInColumn: (item: TaskDragItem, status: TaskStatus, index: number) => void;
}

export function KanbanColumn({
  status,
  title,
  tasks,
  onEdit,
  onDelete,
  onDropInColumn,
}: KanbanColumnProps) {
  const styles = useStyles();

  const [{ isOver }, drop] = useDrop<TaskDragItem, void, { isOver: boolean }>(() => ({
    accept: TASK_DND_TYPE,
    drop: (item, monitor) => {
      // Only handle when a card inside the column didn't already handle it.
      if (monitor.didDrop()) return;
      onDropInColumn(item, status, tasks.length);
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  }), [status, tasks.length, onDropInColumn]);

  return (
    <div ref={drop} className={`${styles.column} ${isOver ? styles.over : ""}`}>
      <div className={styles.header}>
        <Text weight="semibold">{title}</Text>
        <Badge appearance="tint" color="informative">
          {tasks.length}
        </Badge>
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
        {tasks.length === 0 && <div className={styles.empty}>Drop tasks here</div>}
      </div>
    </div>
  );
}
