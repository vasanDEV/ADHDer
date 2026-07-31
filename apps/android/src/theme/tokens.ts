/** ADHDer design tokens — aligned with DESIGN_SYSTEM.md + Designs/Figma_inspiration.png */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F3F4F6',
  surfaceSoft: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  accent: '#2563EB',
  accentSoft: '#DBEAFE',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const type = {
  display: {fontSize: 48, fontWeight: '300' as const, letterSpacing: -1},
  displayLarge: {fontSize: 32, fontWeight: '600' as const, letterSpacing: -0.5},
  heading: {fontSize: 24, fontWeight: '600' as const},
  title: {fontSize: 20, fontWeight: '600' as const},
  body: {fontSize: 16, fontWeight: '400' as const},
  small: {fontSize: 14, fontWeight: '400' as const},
  caption: {fontSize: 12, fontWeight: '400' as const},
};
