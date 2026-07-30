import { api } from "@/services/api";
import type { PomodoroStats } from "@/types";

export interface PomodoroSessionCreate {
  task_id?: number | null;
  kind: "work" | "short_break" | "long_break";
  duration: number;
  completed?: boolean;
}

export const pomodoroApi = {
  stats: () => api.get<PomodoroStats>("/api/pomodoro/stats"),
  record: (payload: PomodoroSessionCreate) => api.post("/api/pomodoro/sessions", payload),
};
