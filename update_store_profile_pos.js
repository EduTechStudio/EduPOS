const fs = require('fs');
let content = fs.readFileSync('src/app/settings/store-profile.tsx', 'utf-8');

// Add Switch import
content = content.replace("import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';", "import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Image, Switch } from 'react-native';");

// Add defaultPOSConfig import
content = content.replace("import { theme } from '@/theme';", "import { theme } from '@/theme';\nimport { defaultPOSConfig } from '@/config/defaultPOSConfig';\nimport { POSConfig } from '@/types/pos';");

// Add posConfig state
content = content.replace("const [saving, setSaving] = useState(false);", "const [saving, setSaving] = useState(false);\n  const [posConfig, setPosConfig] = useState<POSConfig>(defaultPOSConfig);");

// Update loadProfile
content = content.replace("const setting = await settingsRepository.get('store_profile');", `const setting = await settingsRepository.get('store_profile');
      const posSetting = await settingsRepository.get('pos_config');
      if (posSetting && posSetting.value) {
        setPosConfig(prev => ({ ...prev, ...JSON.parse(posSetting.value) }));
      }`);

// Update saveProfile
content = content.replace("await settingsRepository.set('store_profile', JSON.stringify(profile), 'json');", `await settingsRepository.set('store_profile', JSON.stringify(profile), 'json');
      await settingsRepository.set('pos_config', JSON.stringify(posConfig), 'json');`);

// Add POS Display Section JSX
const posSection = `
          <Card variant="standard" style={styles.formCard}>
            <Text style={styles.sectionTitle}>POS Display</Text>
            <View style={styles.divider} />

            <View style={[styles.fieldGroup, { zIndex: 9 }]}>
              <Select
                label="Product Display"
                selectedValue={posConfig.layout}
                onSelect={(val) => setPosConfig({ ...posConfig, layout: val as any })}
                options={[
                  { label: 'Grid', value: 'grid' },
                  { label: 'List', value: 'list' }
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.label}>Tablet Split View</Text>
                  <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                    Show cart alongside products on large screens
                  </Text>
                </View>
                <Switch
                  value={posConfig.tabletLayout.splitView}
                  onValueChange={(val) => setPosConfig({
                    ...posConfig,
                    tabletLayout: { ...posConfig.tabletLayout, splitView: val }
                  })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                />
              </View>
            </View>
          </Card>
`;

content = content.replace("<Card variant=\"standard\" style={styles.formCard}>\n            <Text style={styles.sectionTitle}>Branding</Text>", posSection + "\n          <Card variant=\"standard\" style={styles.formCard}>\n            <Text style={styles.sectionTitle}>Branding</Text>");

fs.writeFileSync('src/app/settings/store-profile.tsx', content);
