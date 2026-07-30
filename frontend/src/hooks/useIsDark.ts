import { useEffect, useState } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";

/** Resolve the effective dark/light mode (respecting the "system" setting). */
export function useIsDark(): boolean {
  const theme = useSettingsStore((s) => s.settings.theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return theme === "dark" || (theme === "system" && systemDark);
}
