// Shared domain types mirroring the backend Pydantic schemas.

export type TaskStatus = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  planner_date: string | null;
  position: number;
  completed: boolean;
  completed_at: string | null;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  due_date?: string | null;
  planner_date?: string | null;
  estimated_pomodoros?: number;
  completed_pomodoros?: number;
  tags?: string[];
}

export type TaskUpdate = Partial<
  Omit<Task, "id" | "created_at" | "updated_at" | "completed_at">
>;

export interface Note {
  id: number;
  title: string;
  markdown: string;
  folder: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface NoteCreate {
  title?: string;
  markdown?: string;
  folder?: string | null;
  tags?: string[];
}

export type NoteUpdate = Partial<NoteCreate>;

export interface PomodoroStats {
  today_count: number;
  week_count: number;
  total_count: number;
  total_focus_seconds: number;
  today_focus_seconds: number;
}

export type ThemePreference = "light" | "dark" | "system";

export interface AppSettings {
  theme: ThemePreference;
  clock24Hour: boolean;
  showSeconds: boolean;
  workDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  autoStartNext: boolean;
  completionColor: string;
  notificationSound: boolean;
  autosaveInterval: number;
  exportLocation: string;
  databaseLocation: string;
}
