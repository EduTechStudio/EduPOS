import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { theme } from '@/theme';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  maxWidth,
}) => {
  const { isTablet, contentMaxWidth } = useResponsive();

  const effectiveMaxWidth = maxWidth || contentMaxWidth;

  const outerStyle: (ViewStyle | false | undefined)[] = [styles.outerContainer, isTablet && styles.tabletCenter];
  if (style?.flex !== undefined) {
    outerStyle.push({ flex: style.flex });
  }

  return (
    <View style={outerStyle}>
      <View style={[styles.innerContainer, { maxWidth: effectiveMaxWidth }, style]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
  },
  tabletCenter: {
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
  },
});
