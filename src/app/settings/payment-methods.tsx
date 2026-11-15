import React, { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, BackHandler } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { defaultPaymentMethods } from '@/config/defaultPaymentConfig';
import { PaymentMethodConfig } from '@/types/payment';
import { settingsRepository } from '@/database';
import { theme, useTheme } from '@/theme';

export default function PaymentMethodsScreen() {
  const { colors, isDark } = useTheme();
  const [methods, setMethods] = useState<PaymentMethodConfig[]>(defaultPaymentMethods);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleBack])
  );

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
    // Safety check: at least 1 method must be enabled
    const activeCount = updated.filter(m => m.enabled).length;
    if (activeCount === 0) {
      Alert.alert('Validasi Gagal', 'Minimal satu metode pembayaran harus tetap aktif agar kasir dapat beroperasi.');
      return;
    }
    setMethods(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsRepository.set('payment_methods', JSON.stringify(methods), 'json');
      Alert.alert('Berhasil', 'Metode pembayaran berhasil disimpan.');
    } catch (e: any) {
      Alert.alert('Gagal Menyimpan', e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader title="Metode Pembayaran" onBack={handleBack} />
          <View style={styles.loadingBox}>
            <Text style={{ ...theme.typography.bodyMedium, color: colors.textSecondary }}>Memuat metode pembayaran...</Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Metode Pembayaran"
            subtitle="Kelola opsi metode pembayaran yang tersedia saat checkout kasir"
            onBack={handleBack}
          />

          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Metode Aktif Kasir</Text>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            
            {methods.map((pm, index) => (
              <View
                key={pm.id}
                style={[
                  styles.row,
                  {
                    borderBottomColor: index === methods.length - 1 ? 'transparent' : colors.divider,
                  },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.pmName, { color: colors.textPrimary }]}>{pm.name}</Text>
                  <Text style={[styles.pmType, { color: colors.textSecondary }]}>
                    {pm.isGateway ? 'Penyedia Digital / Gateway QRIS' : 'Penerimaan Manual / Tunai'}
                  </Text>
                </View>
                <Switch
                  value={pm.enabled}
                  onValueChange={(val) => handleToggle(pm.id, val)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            ))}
          </Card>
          
          <View style={styles.saveContainer}>
            <Button
              title={saving ? "Menyimpan..." : "Simpan Perubahan"}
              onPress={handleSave}
              loading={saving}
              variant="primary"
              size="lg"
            />
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
  divider: { height: 1, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md, borderBottomWidth: 1 },
  pmName: { ...theme.typography.bodyLarge, fontWeight: 'bold' },
  pmType: { ...theme.typography.caption, marginTop: 2 },
  saveContainer: { marginTop: theme.spacing.lg, marginBottom: theme.spacing.xxl },
});
