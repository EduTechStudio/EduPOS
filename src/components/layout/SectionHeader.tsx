import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Icon, IconName } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';

interface SectionHeaderProps {
  onBack?: () => void;
  title: string;
  subtitle?: string;
  action?: { icon: IconName; label: string; onPress: () => void; };
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  onBack,
  title,
  subtitle,
  action,
  rightElement,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Kembali">
          <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {action && !rightElement ? (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: theme.radius.md }, styles.rightElement]}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          {action.icon && <Icon name={action.icon} size={18} color={colors.textInverse} style={{ marginRight: 6 }} />}
          <Text style={[styles.actionText, { color: colors.textInverse }]}>{action.label}</Text>
        </TouchableOpacity>
      ) : rightElement ? (
        <View style={styles.rightElement}>{rightElement}</View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginRight: theme.spacing.sm,
    padding: theme.spacing.xs,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...theme.typography.header2,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    marginTop: 2,
  },
  rightElement: {
    marginLeft: theme.spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  actionText: {
    ...theme.typography.button,
  },
});
