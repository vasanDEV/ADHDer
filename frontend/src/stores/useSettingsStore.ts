import { create } from "zustand";

import { settingsApi } from "@/services/settings";
import type { AppSettings } from "@/types";

const DEFAULTS: AppSettings = {
  theme: "system",
  clock24Hour: true,
  showSeconds: true,
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStartNext: false,
  completionColor: "#22c55e",
  notificationSound: true,
  autosaveInterval: 3,
  exportLocation: "",
  databaseLocation: "",
};

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULTS,
  loaded: false,
  load: async () => {
    try {
      const settings = await settingsApi.get();
      set({ settings: { ...DEFAULTS, ...settings }, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  update: async (patch) => {
    // Optimistic update for snappy UI, then persist.
    set({ settings: { ...get().settings, ...patch } });
    try {
      const saved = await settingsApi.updateMany(patch);
      set({ settings: { ...DEFAULTS, ...saved } });
    } catch {
      // keep optimistic value on failure
    }
  },
}));
