import { Colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';

export function createTheme(colors: Colors) {
  return {
    colors,
    typography,
    spacing,
    radius,
    shadows,
    buttonVariants: {
      primary: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        textColor: colors.textInverse,
      },
      secondary: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.border,
        textColor: colors.textPrimary,
      },
      accent: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
        textColor: '#FFFFFF',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        textColor: colors.textPrimary,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: colors.textSecondary,
      },
      danger: {
        backgroundColor: colors.error,
        borderColor: colors.error,
        textColor: '#FFFFFF',
      },
      success: {
        backgroundColor: colors.success,
        borderColor: colors.success,
        textColor: '#FFFFFF',
      },
    },
    cardStyles: {
      standard: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        ...shadows.sm,
      },
      elevated: {
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        ...shadows.md,
      },
      subtle: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: radius.md,
        ...shadows.none,
      },
    },
    inputStyles: {
      container: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.bodyMedium.fontSize,
        color: colors.textPrimary,
      },
      focused: {
        borderColor: colors.borderFocus,
      },
      error: {
        borderColor: colors.error,
      },
    },
    screenBackground: colors.background,
  };
}

export type Theme = ReturnType<typeof createTheme>;
