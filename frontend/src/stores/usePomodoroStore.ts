import { create } from "zustand";

import { pomodoroApi } from "@/services/pomodoro";
import { useTaskStore } from "@/stores/useTaskStore";
import type { AppSettings, PomodoroStats } from "@/types";

export type Phase = "work" | "short_break" | "long_break";

interface PomodoroState {
  phase: Phase;
  running: boolean;
  remaining: number; // seconds left in the current interval
  duration: number; // total seconds for the current interval
  completedWorkSessions: number;
  taskId: number | null;
  flash: boolean;
  stats: PomodoroStats;

  configure: (settings: AppSettings) => void;
  setTask: (taskId: number | null) => void;
  start: () => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
  skip: () => void;
  advance: (completed: boolean) => void;
  tick: () => void;
  clearFlash: () => void;
  loadStats: () => Promise<void>;
}

// Kept in module scope so the pure duration helper can read the latest config.
let currentSettings: AppSettings | null = null;

function phaseDuration(phase: Phase): number {
  const s = currentSettings;
  if (!s) return phase === "work" ? 25 * 60 : 5 * 60;
  if (phase === "work") return s.workDuration * 60;
  if (phase === "short_break") return s.shortBreak * 60;
  return s.longBreak * 60;
}

const EMPTY_STATS: PomodoroStats = {
  today_count: 0,
  week_count: 0,
  total_count: 0,
  total_focus_seconds: 0,
  today_focus_seconds: 0,
};

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  phase: "work",
  running: false,
  remaining: 25 * 60,
  duration: 25 * 60,
  completedWorkSessions: 0,
  taskId: null,
  flash: false,
  stats: EMPTY_STATS,

  configure: (settings) => {
    currentSettings = settings;
    if (!get().running) {
      const duration = phaseDuration(get().phase);
      set({ duration, remaining: duration });
    }
  },

  setTask: (taskId) => set({ taskId }),

  start: () => set({ running: true }),
  pause: () => set({ running: false }),
  toggle: () => set({ running: !get().running }),

  stop: () => {
    const duration = phaseDuration(get().phase);
    set({ running: false, remaining: duration, duration });
  },

  skip: () => get().advance(false),

  advance: (completed) => {
    const state = get();
    const finishedPhase = state.phase;

    if (completed && finishedPhase === "work") {
      void pomodoroApi
        .record({
          kind: "work",
          duration: state.duration,
          completed: true,
          task_id: state.taskId,
        })
        .then(() => {
          void get().loadStats();
          void useTaskStore.getState().load();
        });
    }

    const interval = currentSettings?.longBreakInterval ?? 4;
    let completedWorkSessions = state.completedWorkSessions;
    let nextPhase: Phase;

    if (finishedPhase === "work") {
      completedWorkSessions += 1;
      nextPhase = completedWorkSessions % interval === 0 ? "long_break" : "short_break";
    } else {
      nextPhase = "work";
    }

    const duration = phaseDuration(nextPhase);
    const autoStart = currentSettings?.autoStartNext ?? false;

    set({
      phase: nextPhase,
      completedWorkSessions,
      duration,
      remaining: duration,
      running: completed ? autoStart : false,
      flash: completed,
    });
  },

  tick: () => {
    const { remaining, running } = get();
    if (!running) return;
    if (remaining <= 1) {
      get().advance(true);
      return;
    }
    set({ remaining: remaining - 1 });
  },

  clearFlash: () => set({ flash: false }),

  loadStats: async () => {
    try {
      set({ stats: await pomodoroApi.stats() });
    } catch {
      // backend not ready / offline
    }
  },
}));
