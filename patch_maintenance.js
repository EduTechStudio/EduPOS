const fs = require('fs');

let content = fs.readFileSync('src/app/settings/system-configuration/database-maintenance.tsx', 'utf-8');

const imports = `import React, { useState } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { runDatabaseVerification, VerificationResult } from '@/database/verification';
import { getDatabase, withTransaction } from '@/database/database';
import { seedDatabase } from '@/database/seed';
import { runDemoSeed } from '@/database/seed/demo/seedDemoData';
import { theme } from '@/theme';`;

content = content.replace(/import React.*?theme';/s, imports);

// Add Generate Demo Data handler
const handlers = `
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [resetInput, setResetInput] = useState('');

  const handleGenerateDemo = () => {
    Alert.alert(
      'Generate Demo Data?',
      'This will add sample data to the current database for testing and demonstration purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Demo Data',
          onPress: async () => {
            setGeneratingDemo(true);
            try {
              const res = await runDemoSeed();
              if (res.success) {
                Alert.alert('Sukses', res.message);
              } else {
                Alert.alert('Info', res.message);
              }
            } catch (err: any) {
              Alert.alert('Gagal', err.message);
            } finally {
              setGeneratingDemo(false);
            }
          }
        }
      ]
    );
  };
`;

content = content.replace("const [resetting, setResetting] = useState(false);", "const [resetting, setResetting] = useState(false);" + handlers);

// Update Factory Reset handler
const factoryResetBody = `
            setResetting(true);
            try {
              const db = await getDatabase();
              await withTransaction(async (dbClient) => {
                const tables = ['transaction_items', 'payments', 'stock_movements', 'transactions', 'expenses', 'products', 'categories', 'customers', 'role_permissions', 'users', 'permissions', 'roles', 'settings'];
                for (const table of tables) {
                  await dbClient.runAsync(\`DELETE FROM \${table};\`);
                }
                
                // Re-initialize default required data
                await seedDatabase(dbClient);
              });
              
              // Remove logo files
              if (FileSystem.documentDirectory) {
                const dir = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
                for (const file of dir) {
                  if (file.startsWith('store_logo_')) {
                    await FileSystem.deleteAsync(FileSystem.documentDirectory + file, { idempotent: true });
                  }
                }
              }
              
              setResetInput('');
              Alert.alert('Sukses', 'Semua data telah direset ke setelan awal pabrik.');
            } catch (err: any) {
              Alert.alert('Gagal Reset', err.message);
            } finally {
              setResetting(false);
            }
`;

content = content.replace(
  /setResetting\(true\);[\s\S]*?setResetting\(false\);\s*\}/,
  factoryResetBody
);

// Add Generate Demo Data UI and TextInput for Reset
const newUI = `
          <Card variant="standard" style={styles.card}>
            <Text style={styles.title}>Generate Demo Data</Text>
            <Text style={styles.desc}>Populate the database with sample data for testing.</Text>
            <Button title="Generate Demo Data" onPress={handleGenerateDemo} variant="outline" loading={generatingDemo} />
          </Card>

          <Card variant="standard" style={styles.card}>
            <Text style={[styles.title, { color: theme.colors.error }]}>Reset Database</Text>
            <Text style={styles.desc}>Delete all store data and restore default configuration. Tindakan ini tidak dapat dibatalkan!</Text>
            
            <View style={{ marginBottom: theme.spacing.md }}>
              <Text style={{ ...theme.typography.caption, marginBottom: theme.spacing.xs, fontWeight: 'bold' }}>Ketik "RESET" untuk melanjutkan:</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: theme.colors.error, borderRadius: theme.radius.sm, padding: theme.spacing.sm, ...theme.typography.bodyMedium }}
                value={resetInput}
                onChangeText={setResetInput}
                placeholder="RESET"
                autoCapitalize="characters"
              />
            </View>

            <Button title="Factory Reset" variant="danger" onPress={handleFactoryReset} loading={resetting} disabled={resetInput !== 'RESET'} />
          </Card>
`;

content = content.replace(
  /<Card variant="standard" style=\{styles\.card\}>\s*<Text style=\{\[styles\.title, \{ color: theme\.colors\.error \}\]\}>Reset Data[\s\S]*?<\/Card>/,
  newUI
);

// Fix title & subtitle
content = content.replace(
  "subtitle=\"Verify database and reset\"",
  "subtitle=\"Verify database, demo data, and reset\""
);

fs.writeFileSync('src/app/settings/system-configuration/database-maintenance.tsx', content);
