import { api } from "@/services/api";
import type { Task, TaskCreate } from "@/types";

export const plannerApi = {
  range: (start: string, end: string) =>
    api.get<Task[]>(`/api/planner/range?start=${start}&end=${end}`),
  day: (day: string) => api.get<Task[]>(`/api/planner/day/${day}`),
  add: (day: string, payload: TaskCreate) => api.post<Task>(`/api/planner/day/${day}`, payload),
};
