import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme, useTheme } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : isFocused ? colors.borderFocus : colors.border,
          },
          isFocused && { borderWidth: 1.5 },
        ]}>
        {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.textPrimary }, inputStyle]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon ? <View style={styles.rightIconContainer}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 46,
  },
  leftIconContainer: {
    marginRight: theme.spacing.sm,
  },
  rightIconContainer: {
    marginLeft: theme.spacing.sm,
  },
  input: {
    flex: 1,
    ...theme.typography.bodyMedium,
    paddingVertical: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
  helperText: {
    ...theme.typography.caption,
    marginTop: theme.spacing.xs,
  },
});
