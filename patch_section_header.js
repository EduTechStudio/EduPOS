const fs = require('fs');
let content = fs.readFileSync('src/components/layout/SectionHeader.tsx', 'utf-8');

content = content.replace("import { View, Text, StyleSheet, ViewStyle } from 'react-native';", "import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';\nimport { Icon } from '@/components/ui/Icon';");

content = content.replace("interface SectionHeaderProps {", "interface SectionHeaderProps {\n  onBack?: () => void;");

content = content.replace("export const SectionHeader: React.FC<SectionHeaderProps> = ({", "export const SectionHeader: React.FC<SectionHeaderProps> = ({\n  onBack,");

content = content.replace("<View style={styles.textContainer}>", `{onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="chevronRight" size={24} color={theme.colors.textPrimary} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
      )}
      <View style={styles.textContainer}>`);

content = content.replace("const styles = StyleSheet.create({", `const styles = StyleSheet.create({
  backButton: {
    marginRight: theme.spacing.sm,
    padding: theme.spacing.xs,
  },`);

fs.writeFileSync('src/components/layout/SectionHeader.tsx', content);
