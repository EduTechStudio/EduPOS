import { useTheme as useAppTheme } from '@/theme';

export function useTheme() {
  const context = useAppTheme();
  return {
    ...context,
    text: context.colors.textPrimary,
    background: context.colors.background,
    backgroundElement: context.colors.surfaceSubtle,
    backgroundSelected: context.colors.cardSelected,
    textSecondary: context.colors.textSecondary,
  };
}
