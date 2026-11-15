import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Card } from './Card';
import { Icon, IconName } from './Icon';
import { theme, useTheme } from '@/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  iconName?: IconName;
  trend?: string;
  trendPositive?: boolean;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  iconName,
  trend,
  trendPositive = true,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <Card variant="standard" style={[styles.card, style]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        {iconName ? (
          <View style={[styles.iconWrapper, { backgroundColor: colors.primarySoft }]}>
            <Icon name={iconName} size={20} color={colors.primary} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      {subtitle || trend ? (
        <View style={styles.bottomRow}>
          {trend ? (
            <Text
              style={[
                styles.trendText,
                { color: trendPositive ? colors.success : colors.error },
              ]}>
              {trendPositive ? '↑' : '↓'} {trend}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...theme.typography.priceLarge,
    marginVertical: theme.spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  trendText: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.caption,
  },
});
