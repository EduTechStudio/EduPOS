import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { theme, useTheme } from '@/theme';

export interface SelectOption<T = string> {
  label: string;
  value: T;
  description?: string;
}

interface SelectProps<T = string> {
  label?: string;
  options: SelectOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  containerStyle?: ViewStyle;
}

export function Select<T extends string = string>({
  label,
  options,
  selectedValue,
  onSelect,
  containerStyle,
}: SelectProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text> : null}
      <View style={styles.optionsGrid}>
        {options.map((opt) => {
          const isSelected = opt.value === selectedValue;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.7}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.optionCard,
                {
                  borderRadius: theme.radius.md,
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}>
              <Text
                style={[
                  styles.optionLabel,
                  { color: isSelected ? colors.textInverse : colors.textPrimary },
                ]}>
                {opt.label}
              </Text>
              {opt.description ? (
                <Text
                  style={[
                    styles.optionDescription,
                    { color: isSelected ? colors.textInverse + 'CC' : colors.textSecondary },
                  ]}>
                  {opt.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    minWidth: 100,
    minHeight: 44,
    justifyContent: 'center',
  },
  optionLabel: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
  },
  optionDescription: {
    ...theme.typography.caption,
    marginTop: 2,
  },
});
