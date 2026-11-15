import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { theme } from '@/theme';

interface ResponsiveGridProps {
  children: React.ReactNode[];
  minColumnWidth?: number;
  gap?: number;
  style?: ViewStyle;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  minColumnWidth = 280,
  gap = theme.spacing.md,
  style,
}) => {
  const { width } = useResponsive();
  
  // Calculate grid columns dynamically
  const availableWidth = width - theme.spacing.lg * 2;
  const numColumns = Math.max(1, Math.floor(availableWidth / minColumnWidth));

  return (
    <View style={[styles.gridContainer, { gap }, style]}>
      {React.Children.map(children, (child, index) => {
        if (!child) return null;
        return (
          <View
            key={index}
            style={[
              numColumns > 1
                ? { width: `${100 / numColumns - ((numColumns - 1) * gap) / (numColumns * 10)}%` as any }
                : { width: '100%' },
              styles.gridItem,
            ]}>
            {child}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  gridItem: {
    minWidth: 260,
    flexGrow: 1,
  },
});
