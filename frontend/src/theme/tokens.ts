// ADHDer design language — "Apple HIG, built for Windows".
// Neutral, calm, spacious. These tokens are the single source of truth for the
// custom look layered on top of Fluent UI.

export const palette = {
  // Light
  bgPrimary: "#F7F7F5", // app canvas
  bgSecondary: "#FFFFFF", // cards / surfaces
  textPrimary: "#111111",
  textSecondary: "#6B6B6B",

  // Dark
  darkBg: "#1C1C1E", // app canvas
  darkCard: "#2C2C2E", // cards / surfaces
  darkTextPrimary: "#FFFFFF",
  darkTextSecondary: "#A1A1A6",

  // Accents — communicate state only.
  accent: "#007AFF",
  accentHover: "#0A84FF",
  accentPressed: "#0063CE",
  success: "#34C759",
  warning: "#FF9F0A",
  danger: "#FF453A",
} as const;

// 8-point spacing scale.
export const space = {
  xs: "8px",
  sm: "16px",
  md: "24px",
  lg: "32px",
  xl: "48px",
  xxl: "64px",
} as const;

export const radius = {
  input: "12px",
  button: "12px",
  card: "16px",
  dialog: "20px",
  pill: "999px",
} as const;

// Deliberately quick, almost invisible motion.
export const duration = {
  hover: 0.12,
  fade: 0.15,
  card: 0.18,
  sidebar: 0.18,
  dialog: 0.2,
  page: 0.2,
} as const;

export const easing = "cubic-bezier(0.4, 0.0, 0.2, 1)";

export const fontFamily =
  '"Segoe UI Variable Display", "Segoe UI Variable", "Inter Variable", Inter, "Segoe UI", system-ui, -apple-system, sans-serif';

// Barely-there elevation.
export const shadow = {
  card: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)",
  cardHover: "0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)",
  overlay: "0 8px 32px rgba(0,0,0,0.12)",
  dark: {
    card: "0 1px 2px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.25)",
    cardHover: "0 4px 12px rgba(0,0,0,0.4)",
    overlay: "0 12px 40px rgba(0,0,0,0.5)",
  },
} as const;

export const priorityColor = {
  high: palette.danger,
  medium: palette.warning,
  low: palette.success,
} as const;
