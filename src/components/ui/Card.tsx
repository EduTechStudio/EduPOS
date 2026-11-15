import React from 'react';
import { View, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { theme, useTheme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'standard' | 'elevated' | 'subtle';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'standard',
  style,
  onPress,
  padding = theme.spacing.lg,
}) => {
  const { theme: activeTheme, colors } = useTheme();
  const cardStyle = activeTheme.cardStyles[variant];

  const dynamicStyle = {
    backgroundColor:
      variant === 'elevated'
        ? colors.surfaceElevated
        : variant === 'subtle'
        ? colors.surfaceSubtle
        : colors.surface,
    borderColor: variant === 'subtle' ? 'transparent' : colors.border,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[cardStyle, dynamicStyle, { padding }, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, dynamicStyle, { padding }, style]}>{children}</View>;
};
