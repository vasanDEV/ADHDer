import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
  type Theme,
} from "@fluentui/react-components";
import { MotionConfig } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { fontFamily, palette } from "@/theme/tokens";

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

/** Layer the ADHDer design language on top of a Fluent base theme. */
function customize(base: Theme, dark: boolean): Theme {
  return {
    ...base,
    fontFamilyBase: fontFamily,

    borderRadiusSmall: "8px",
    borderRadiusMedium: "12px",
    borderRadiusLarge: "16px",
    borderRadiusXLarge: "20px",

    colorNeutralForeground1: dark ? palette.darkTextPrimary : palette.textPrimary,
    colorNeutralForeground2: dark ? palette.darkTextSecondary : palette.textSecondary,
    colorNeutralForeground3: dark ? palette.darkTextSecondary : palette.textSecondary,

    colorNeutralBackground1: dark ? palette.darkCard : palette.bgSecondary,
    colorNeutralBackground1Hover: dark ? "#333335" : "#FBFBFA",
    colorNeutralBackground2: dark ? palette.darkBg : palette.bgPrimary,
    colorNeutralBackground2Hover: dark ? "#242426" : "#F0F0EE",
    colorNeutralBackground3: dark ? "#3A3A3C" : "#EFEFEE",

    colorNeutralStroke1: dark ? "#3A3A3C" : "#E6E6E3",
    colorNeutralStroke2: dark ? "#2E2E30" : "#ECECEA",

    colorBrandBackground: palette.accent,
    colorBrandBackgroundHover: palette.accentHover,
    colorBrandBackgroundPressed: palette.accentPressed,
    colorBrandBackgroundSelected: palette.accentPressed,
    colorBrandBackground2: dark ? "#0A2A4D" : "#EAF3FF",
    colorBrandBackground2Hover: dark ? "#0D3A6B" : "#DCEBFF",
    colorBrandForeground1: palette.accent,
    colorBrandForeground2: palette.accentHover,
    colorBrandForegroundLink: palette.accent,
    colorBrandStroke1: palette.accent,
    colorBrandStroke2: dark ? "#0A3E7A" : "#B3D4FF",
    colorCompoundBrandBackground: palette.accent,
    colorCompoundBrandBackgroundHover: palette.accentHover,
    colorCompoundBrandBackgroundPressed: palette.accentPressed,
    colorCompoundBrandForeground1: palette.accent,
    colorCompoundBrandForeground1Hover: palette.accentHover,
    colorCompoundBrandStroke: palette.accent,
    colorCompoundBrandStrokeHover: palette.accentHover,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.settings.theme);
  const prefersDark = usePrefersDark();

  const isDark = theme === "dark" || (theme === "system" && prefersDark);

  const fluentTheme = useMemo(
    () => customize(isDark ? webDarkTheme : webLightTheme, isDark),
    [isDark],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  return (
    <MotionConfig reducedMotion="user">
      <FluentProvider theme={fluentTheme} style={{ height: "100%" }}>
        {children}
      </FluentProvider>
    </MotionConfig>
  );
}
