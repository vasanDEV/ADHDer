import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TaskCardView } from "@/components/tasks/TaskCardView";
import type { Task } from "@/types";

interface SortableTaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

/** A task card wired as a @dnd-kit sortable item (pointer-based drag). */
export function SortableTaskCard({ task, onEdit, onDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      onEdit={onEdit}
      onDelete={onDelete}
      dragging={isDragging}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    />
  );
}
