import type { TaskStatus } from "@/types";

export const TASK_DND_TYPE = "adhder/task";

export interface TaskDragItem {
  id: number;
  status: TaskStatus;
}
