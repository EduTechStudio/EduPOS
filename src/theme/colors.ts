export const lightColors = {
  // Brand / Primary: Confident Royal Blue & Deep Navy
  primary: '#064789', // EduPOS Official Primary Blue
  primaryLight: '#4876AE', // EduPOS Optional Light Blue
  primaryDark: '#043261', // EduPOS Deep Navy
  primarySoft: '#EFF6FF', // Blue 50 - soft blue surface

  // Accent: Energetic Warm Orange (Retail focal points)
  accent: '#EE8434', // EduPOS Official Orange Accent
  accentLight: '#F5A665', // Orange 400
  accentDark: '#D46A1D', // Orange 600 - high contrast text
  accentSoft: '#FFF7ED', // Orange 50 - soft orange surface

  // Screen & Card Backgrounds
  background: '#F7F9FC', // Clean, crisp, welcoming backdrop
  surface: '#FFFFFF', // Elevated card / surface
  surfaceSubtle: '#F1F5F9', // Slate 100
  surfaceElevated: '#FFFFFF',

  // Text colors
  textPrimary: '#172033', // Deep slate for rich contrast
  textSecondary: '#64748B', // Slate 500
  textMuted: '#94A3B8', // Slate 400
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0', // Slate 200
  borderFocus: '#2563EB', // Blue 600
  divider: '#F1F5F9',

  // Status & Feedback
  success: '#16A34A', // Green 600
  successLight: '#DCFCE7', // Green 100
  successSoft: '#DCFCE7',
  warning: '#D97706', // Amber 600
  warningLight: '#FEF3C7', // Amber 100
  warningSoft: '#FEF3C7',
  error: '#DC2626', // Red 600
  errorLight: '#FEE2E2', // Red 100
  errorSoft: '#FEE2E2',
  destructive: '#DC2626',
  destructiveLight: '#FEE2E2',
  info: '#0284C7', // Sky 600
  infoLight: '#E0F2FE', // Sky 100
  infoSoft: '#E0F2FE',

  // Interactive States
  disabled: '#94A3B8',
  disabledBackground: '#E2E8F0',

  // Badges & Highlights
  badgeBackground: '#F1F5F9',
  badgeText: '#334155',
  cardSelected: '#EFF6FF',
};

export const darkColors = {
  // Brand / Primary: Lighter vibrant blue for dark surfaces
  primary: '#60A5FA', // Blue 400 - high contrast on dark
  primaryLight: '#93C5FD', // Blue 300
  primaryDark: '#2563EB', // Blue 600
  primarySoft: '#1E3354', // Dark blue-tinted surface

  // Accent: Luminous warm orange
  accent: '#EE8434', // Orange 400 - EduPOS Official Accent
  accentLight: '#F5A665', // Orange 300
  accentDark: '#D46A1D', // Orange 500
  accentSoft: '#3A291F', // Deep warm-tinted surface

  // Screen & Card Backgrounds
  background: '#0F172A', // Slate 900
  surface: '#182235', // Slate 850
  surfaceSubtle: '#202D42', // Slate 800
  surfaceElevated: '#243248', // Elevated card / modal

  // Text colors
  textPrimary: '#F1F5F9', // Slate 100
  textSecondary: '#A8B4C7', // Slate 350
  textMuted: '#64748B', // Slate 500
  textInverse: '#0F172A',

  // Borders & Dividers
  border: '#334155', // Slate 700
  borderFocus: '#60A5FA',
  divider: '#1E293B',

  // Status & Feedback
  success: '#4ADE80', // Green 400
  successLight: '#14532D', // Green 900
  successSoft: '#14532D',
  warning: '#FBBF24', // Amber 400
  warningLight: '#78350F', // Amber 900
  warningSoft: '#78350F',
  error: '#F87171', // Red 400
  errorLight: '#7F1D1D', // Red 900
  errorSoft: '#7F1D1D',
  destructive: '#F87171',
  destructiveLight: '#7F1D1D',
  info: '#38BDF8', // Sky 400
  infoLight: '#0C4A6E', // Sky 900
  infoSoft: '#0C4A6E',

  // Interactive States
  disabled: '#64748B',
  disabledBackground: '#1E293B',

  // Badges & Highlights
  badgeBackground: '#202D42',
  badgeText: '#CBD5E1',
  cardSelected: '#1E3354',
};

// Default static colors based on light mode (can also be dynamically accessed via useTheme())
export const colors = lightColors;

export type Colors = typeof lightColors;
