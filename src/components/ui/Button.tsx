import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme, useTheme } from '@/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  numberOfLines?: number;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  fullWidth = false,
  numberOfLines = 1,
}) => {
  const { theme: activeTheme, colors } = useTheme();
  const variantConfig = activeTheme.buttonVariants[variant];

  const sizeStyles = {
    sm: { minHeight: 36, paddingVertical: 6, paddingHorizontal: theme.spacing.md },
    md: { minHeight: 44, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
    lg: { minHeight: 52, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl },
  }[size];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      style={[
        styles.baseButton,
        {
          borderRadius: theme.radius.md,
          backgroundColor: disabled ? colors.disabledBackground : variantConfig.backgroundColor,
          borderColor: disabled ? colors.disabledBackground : variantConfig.borderColor,
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
        },
        sizeStyles,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantConfig.textColor} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text
            numberOfLines={numberOfLines}
            ellipsizeMode="tail"
            style={[
              theme.typography.button,
              { color: disabled ? colors.disabled : variantConfig.textColor, flexShrink: 1 },
              size === 'sm' && { fontSize: 12 },
              size === 'lg' && { fontSize: 16 },
              textStyle,
            ]}>
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.65,
  },
});
