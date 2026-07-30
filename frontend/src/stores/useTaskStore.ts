import { create } from "zustand";

import { tasksApi } from "@/services/tasks";
import type { Task, TaskCreate, TaskStatus, TaskUpdate } from "@/types";

interface TaskState {
  tasks: Task[];
  loading: boolean;
  load: () => Promise<void>;
  create: (payload: TaskCreate) => Promise<Task>;
  update: (id: number, payload: TaskUpdate) => Promise<void>;
  move: (id: number, status: TaskStatus, position: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

function replace(tasks: Task[], updated: Task): Task[] {
  return tasks.map((t) => (t.id === updated.id ? updated : t));
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      set({ tasks: await tasksApi.list() });
    } finally {
      set({ loading: false });
    }
  },
  create: async (payload) => {
    const task = await tasksApi.create(payload);
    set({ tasks: [...get().tasks, task] });
    return task;
  },
  update: async (id, payload) => {
    const updated = await tasksApi.update(id, payload);
    set({ tasks: replace(get().tasks, updated) });
  },
  move: async (id, status, position) => {
    // Optimistic reorder then refetch the authoritative ordering.
    set({
      tasks: get().tasks.map((t) => (t.id === id ? { ...t, status, position } : t)),
    });
    await tasksApi.move(id, status, position);
    set({ tasks: await tasksApi.list() });
  },
  remove: async (id) => {
    await tasksApi.remove(id);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },
}));
