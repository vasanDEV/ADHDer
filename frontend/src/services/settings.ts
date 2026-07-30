import { api } from "@/services/api";
import type { AppSettings } from "@/types";

export const settingsApi = {
  get: () => api.get<AppSettings>("/api/settings"),
  updateMany: (payload: Partial<AppSettings>) => api.put<AppSettings>("/api/settings", payload),
};
