import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
  type Theme,
} from "@fluentui/react-components";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";

function usePrefersDark(): boolean {
  const [dark, setDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const prefersDark = usePrefersDark();

  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  const fluentTheme: Theme = isDark ? webDarkTheme : webLightTheme;

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  // Memoize so FluentProvider doesn't remount on unrelated re-renders.
  const value = useMemo(() => fluentTheme, [fluentTheme]);

  return (
    <FluentProvider theme={value} style={{ height: "100%" }}>
      {children}
    </FluentProvider>
  );
}
