import { View, StyleSheet, ScrollView, ViewStyle, StatusBar } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { theme, useTheme } from '@/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  paddingHorizontal?: number;
  edges?: readonly Edge[];
  hasHeader?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  paddingHorizontal = theme.spacing.lg,
  edges,
  hasHeader = true,
}) => {
  const { colors, isDark } = useTheme();
  const resolvedEdges: readonly Edge[] = edges
    ? edges
    : hasHeader
    ? (['left', 'right'] as const)
    : (['top', 'left', 'right'] as const);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }, style]} edges={resolvedEdges}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? colors.surface : colors.primary}
      />
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.nonScrollContent, { paddingHorizontal }, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: theme.spacing.lg,
    flexGrow: 1,
  },
  nonScrollContent: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
  },
});
