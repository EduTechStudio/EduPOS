const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { defaultReceiptConfig } from '@/config/defaultReceiptConfig';
import { defaultPrinterConfig } from '@/config/defaultPrinterConfig';
import { ReceiptConfig, ReceiptWidth } from '@/types/receipt';
import { PrinterManager } from '@/services/printer/PrinterManager';
import { settingsRepository } from '@/database';
import { theme } from '@/theme';
import { ReceiptPreviewModal } from '@/components/receipt/ReceiptPreviewModal';
import { ReceiptData } from '@/services/receipt/ReceiptService';

export default function ReceiptPrinterScreen() {
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>(defaultReceiptConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Printer State
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'Disconnected' | 'Connected'>('Disconnected');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const receiptSetting = await settingsRepository.get('receipt_config');
      if (receiptSetting && receiptSetting.value) {
        setReceiptConfig({ ...defaultReceiptConfig, ...JSON.parse(receiptSetting.value) });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await settingsRepository.set('receipt_config', JSON.stringify(receiptConfig), 'json');
      Alert.alert('Success', 'Receipt configuration saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectPrinter = async () => {
    setPrinterConnecting(true);
    try {
      const printer = PrinterManager.getInstance(defaultPrinterConfig);
      await printer.connect(defaultPrinterConfig);
      setPrinterStatus(printer.isConnected() ? 'Connected' : 'Disconnected');
      Alert.alert('Printer', 'Printer connected successfully.');
    } catch (e: any) {
      Alert.alert('Printer Error', e.message);
      setPrinterStatus('Disconnected');
    } finally {
      setPrinterConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      const printer = PrinterManager.getInstance();
      if (!printer.isConnected()) {
        Alert.alert('Printer Error', 'Please connect a printer first.');
        return;
      }
      await printer.testPrint();
    } catch (e: any) {
      Alert.alert('Printer Error', e.message);
    }
  };

  const handleDisconnectPrinter = async () => {
    try {
      const printer = PrinterManager.getInstance();
      await printer.disconnect();
      setPrinterStatus('Disconnected');
      Alert.alert('Printer', 'Printer disconnected.');
    } catch (e: any) {
      Alert.alert('Printer Error', e.message);
    }
  };

  const mockPreviewData: ReceiptData = {
    config: receiptConfig,
    store: {
      name: 'Store Name (Preview)',
      address: 'Jl. Contoh Alamat No. 123',
      phone: '081234567890',
    },
    transaction: {
      transactionNumber: 'TRX-123456',
      date: '01/01/2026',
      time: '12:00',
      cashierName: 'Admin',
      customerName: 'Pelanggan Umum',
      subtotal: 50000,
      discount: 0,
      total: 50000,
    },
    items: [
      { name: 'Produk A', sku: 'A001', quantity: 1, unitPrice: 20000, subtotal: 20000 },
      { name: 'Produk B', sku: 'B001', quantity: 2, unitPrice: 15000, subtotal: 30000 }
    ],
    payments: [
      { method: 'cash', amount: 50000, receivedAmount: 50000, changeAmount: 0, referenceNumber: '' }
    ]
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader title="Receipt & Printer" onBack={() => router.back()} />
          <View style={{ padding: 20 }}><Text>Loading...</Text></View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  const renderToggle = (label: string, description: string, value: boolean, onToggle: (val: boolean) => void) => (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      />
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView>
        <ResponsiveContainer>
          <SectionHeader
            title="Receipt & Printer"
            subtitle="Configure receipts and printer"
            onBack={() => router.back()}
          />

          <Card variant="standard" style={styles.card}>
            <Text style={styles.sectionTitle}>Receipt Configuration</Text>
            <View style={styles.divider} />
            
            <View style={[styles.fieldGroup, { zIndex: 9 }]}>
              <Select
                label="Paper Width"
                selectedValue={receiptConfig.receiptWidth}
                onSelect={(val) => setReceiptConfig({ ...receiptConfig, receiptWidth: val as ReceiptWidth })}
                options={[
                  { label: '58mm', value: '58mm' },
                  { label: '80mm', value: '80mm' }
                ]}
              />
            </View>

            {renderToggle('Show Logo', 'Display store logo on receipt', receiptConfig.showLogo !== false, 
              (v) => setReceiptConfig({...receiptConfig, showLogo: v, showHeader: true}))}
            
            {renderToggle('Show Store Address', 'Display store address', receiptConfig.showStoreAddress !== false, 
              (v) => setReceiptConfig({...receiptConfig, showStoreAddress: v, showHeader: true}))}

            {renderToggle('Show Store Phone', 'Display store phone', receiptConfig.showStorePhone !== false, 
              (v) => setReceiptConfig({...receiptConfig, showStorePhone: v, showHeader: true}))}

            {renderToggle('Show Cashier', 'Display cashier name', receiptConfig.showCashier, 
              (v) => setReceiptConfig({...receiptConfig, showCashier: v}))}

            {renderToggle('Show Customer', 'Display customer name', receiptConfig.showCustomer, 
              (v) => setReceiptConfig({...receiptConfig, showCustomer: v}))}

            <View style={{ marginTop: theme.spacing.md }}>
              <Button title="Preview Receipt" variant="outline" onPress={() => setPreviewVisible(true)} />
            </View>
          </Card>

          <Card variant="standard" style={styles.card}>
            <Text style={styles.sectionTitle}>Printer</Text>
            <View style={styles.divider} />

            <View style={[styles.fieldGroup, { zIndex: 8 }]}>
              <Select
                label="Connection Type"
                selectedValue={defaultPrinterConfig.connectionType}
                onSelect={() => {}}
                options={[
                  { label: 'Bluetooth', value: 'bluetooth' },
                  { label: 'USB (Unsupported)', value: 'usb' }
                ]}
              />
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={styles.statusBadgeContainer}>
                <View style={[styles.statusDot, { backgroundColor: printerStatus === 'Connected' ? theme.colors.success : theme.colors.error }]} />
                <Text style={styles.statusText}>{printerStatus}</Text>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              {printerStatus === 'Connected' ? (
                <Button title="Disconnect" onPress={handleDisconnectPrinter} variant="outline" style={{ flex: 1 }} />
              ) : (
                <Button title={printerConnecting ? "Connecting..." : "Connect"} onPress={handleConnectPrinter} loading={printerConnecting} style={{ flex: 1 }} />
              )}
              <Button title="Test Print" onPress={handleTestPrint} disabled={printerStatus !== 'Connected'} variant="secondary" style={{ flex: 1 }} />
            </View>
          </Card>

          <View style={styles.saveContainer}>
            <Button title={saving ? "Saving..." : "Save Changes"} onPress={saveSettings} loading={saving} size="lg" />
          </View>
        </ResponsiveContainer>
      </ScrollView>

      <ReceiptPreviewModal 
        visible={previewVisible}
        receiptData={mockPreviewData}
        onClose={() => setPreviewVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: theme.spacing.lg, marginBottom: theme.spacing.lg },
  sectionTitle: { ...theme.typography.header3, marginBottom: theme.spacing.sm },
  divider: { height: 1, backgroundColor: theme.colors.border, marginBottom: theme.spacing.md },
  fieldGroup: { marginBottom: theme.spacing.lg },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceSubtle },
  toggleLabel: { ...theme.typography.bodyMedium, fontWeight: 'bold' },
  toggleDesc: { ...theme.typography.caption, color: theme.colors.textMuted },
  saveContainer: { marginBottom: theme.spacing.xxl },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  statusLabel: { ...theme.typography.bodyMedium, fontWeight: 'bold' },
  statusBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { ...theme.typography.bodyMedium },
  buttonGroup: { flexDirection: 'row', gap: theme.spacing.sm }
});
`;

fs.writeFileSync('src/app/settings/receipt-printer.tsx', content);
