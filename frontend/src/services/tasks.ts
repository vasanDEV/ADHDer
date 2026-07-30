import { api } from "@/services/api";
import type { Task, TaskCreate, TaskStatus, TaskUpdate } from "@/types";

export const tasksApi = {
  list: () => api.get<Task[]>("/api/tasks"),
  create: (payload: TaskCreate) => api.post<Task>("/api/tasks", payload),
  update: (id: number, payload: TaskUpdate) => api.patch<Task>(`/api/tasks/${id}`, payload),
  move: (id: number, status: TaskStatus, position: number) =>
    api.post<Task>(`/api/tasks/${id}/move`, { status, position }),
  remove: (id: number) => api.del<void>(`/api/tasks/${id}`),
};
