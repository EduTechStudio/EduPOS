import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme, useTheme } from '@/theme';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', style }) => {
  const { colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: colors.successLight, text: colors.success };
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'error':
        return { bg: colors.errorLight, text: colors.error };
      case 'info':
        return { bg: colors.infoLight, text: colors.info };
      case 'primary':
        return { bg: colors.primarySoft, text: colors.primary };
      case 'accent':
        return { bg: colors.accentSoft, text: colors.accentDark };
      default:
        return { bg: colors.badgeBackground, text: colors.badgeText };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
});
