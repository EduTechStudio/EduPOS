const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { defaultPaymentMethods } from '@/config/defaultPaymentConfig';
import { PaymentMethodConfig } from '@/types/payment';
import { settingsRepository } from '@/database';
import { theme } from '@/theme';

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState<PaymentMethodConfig[]>(defaultPaymentMethods);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const setting = await settingsRepository.get('payment_methods');
      if (setting && setting.value) {
        setMethods(JSON.parse(setting.value));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string, val: boolean) => {
    const updated = methods.map(m => m.id === id ? { ...m, enabled: val } : m);
    // Safety check
    const activeCount = updated.filter(m => m.enabled).length;
    if (activeCount === 0) {
      Alert.alert('Validation Error', 'At least one payment method must remain active.');
      return;
    }
    setMethods(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsRepository.set('payment_methods', JSON.stringify(methods), 'json');
      Alert.alert('Success', 'Payment methods saved.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader title="Payment Methods" onBack={() => router.back()} />
          <View style={styles.loadingBox}><Text>Loading...</Text></View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView>
        <ResponsiveContainer>
          <SectionHeader
            title="Payment Methods"
            subtitle="Manage available payment methods"
            onBack={() => router.back()}
          />

          <Card variant="standard" style={styles.card}>
            <Text style={styles.sectionTitle}>Manual & Gateway Methods</Text>
            <View style={styles.divider} />
            
            {methods.map((pm) => (
              <View key={pm.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pmName}>{pm.name}</Text>
                  <Text style={styles.pmType}>{pm.isGateway ? 'Gateway Provider' : 'Manual Entry'}</Text>
                </View>
                <Switch
                  value={pm.enabled}
                  onValueChange={(val) => handleToggle(pm.id, val)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                />
              </View>
            ))}
          </Card>
          
          <View style={{ marginTop: theme.spacing.lg }}>
            <Button title={saving ? "Saving..." : "Save Changes"} onPress={handleSave} loading={saving} />
          </View>

        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingBox: { padding: theme.spacing.xl, alignItems: 'center' },
  card: { padding: theme.spacing.lg },
  sectionTitle: { ...theme.typography.header3, marginBottom: theme.spacing.sm },
  divider: { height: 1, backgroundColor: theme.colors.border, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceSubtle },
  pmName: { ...theme.typography.bodyLarge, fontWeight: 'bold' },
  pmType: { ...theme.typography.caption, color: theme.colors.textMuted },
});
`;

fs.writeFileSync('src/app/settings/payment-methods.tsx', content);
