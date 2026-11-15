import React, { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  BackHandler,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { defaultReceiptConfig } from '@/config/defaultReceiptConfig';
import { defaultPrinterConfig } from '@/config/defaultPrinterConfig';
import { ReceiptConfig, ReceiptWidth } from '@/types/receipt';
import { PrinterConfig } from '@/types/printer';
import { PrinterManager } from '@/services/printer/PrinterManager';
import { settingsRepository } from '@/database';
import { theme, useTheme } from '@/theme';
import { ReceiptPreviewModal } from '@/components/receipt/ReceiptPreviewModal';
import { ReceiptData } from '@/services/receipt/ReceiptService';
import { BluetoothPrinter, PairedDevice } from 'bluetooth-printer';
import { useAuth } from '@/context/AuthContext';

export default function ReceiptPrinterScreen() {
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const canManageReceipt = hasPermission('receipt.manage');
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>(defaultReceiptConfig);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(defaultPrinterConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Printer State
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'Disconnected' | 'Connected'>('Disconnected');
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [scanningDevices, setScanningDevices] = useState(false);

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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const receiptSetting = await settingsRepository.get('receipt_config');
      const printerSetting = await settingsRepository.get('printer_config');
      if (printerSetting && printerSetting.value) {
        const loadedPrinter = { ...defaultPrinterConfig, ...JSON.parse(printerSetting.value) };
        setPrinterConfig(loadedPrinter);
      }
      if (receiptSetting && receiptSetting.value) {
        setReceiptConfig({ ...defaultReceiptConfig, ...JSON.parse(receiptSetting.value) });
      }

      if (BluetoothPrinter.isAvailable()) {
        const connected = await BluetoothPrinter.isConnected();
        setPrinterStatus(connected ? 'Connected' : 'Disconnected');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);
        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const handleScanDevices = async () => {
    setScanningDevices(true);
    try {
      const hasPerm = await requestBluetoothPermissions();
      if (!hasPerm) {
        Alert.alert(
          'Izin Bluetooth Diperlukan',
          'Aplikasi EduPOS memerlukan izin Bluetooth untuk menemukan printer thermal yang sudah dipasangkan.'
        );
        return;
      }

      if (!BluetoothPrinter.isAvailable()) {
        Alert.alert(
          'Simulasi Perangkat',
          'Modul native BluetoothPrinter belum aktif di build ini. Perangkat uji dummy telah ditambahkan.'
        );
        setPairedDevices([
          { name: 'Iware MP-81MPO', address: '00:11:22:33:44:55' },
          { name: 'Thermal Printer BT', address: 'AA:BB:CC:DD:EE:FF' },
        ]);
        return;
      }

      const isEnabled = await BluetoothPrinter.isBluetoothEnabled();
      if (!isEnabled) {
        Alert.alert('Bluetooth Nonaktif', 'Harap aktifkan Bluetooth di perangkat Anda terlebih dahulu.');
        return;
      }

      const devices = await BluetoothPrinter.getPairedDevices();
      setPairedDevices(devices);
      if (devices.length === 0) {
        Alert.alert(
          'Printer Belum Dipasangkan',
          'Tidak ada printer Bluetooth yang terdeteksi. Silakan buka menu Pengaturan Bluetooth di Android, pasangkan (pair) printer Iware MP-81MPO, lalu tekan "Cari Printer Paired" lagi.'
        );
      }
    } catch (e: any) {
      Alert.alert('Gagal Memindai', e.message || 'Terjadi kesalahan saat memindai perangkat Bluetooth.');
    } finally {
      setScanningDevices(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await settingsRepository.set('receipt_config', JSON.stringify(receiptConfig), 'json');
      await settingsRepository.set('printer_config', JSON.stringify(printerConfig), 'json');
      Alert.alert('Berhasil', 'Konfigurasi struk dan printer berhasil disimpan.');
    } catch (e: any) {
      Alert.alert('Gagal Menyimpan', e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectPrinter = async () => {
    if (printerConfig.connectionType === 'bluetooth' && !printerConfig.macAddress) {
      Alert.alert(
        'Pilih Printer',
        'Harap pilih printer Bluetooth yang terpasang terlebih dahulu atau tekan "Cari Printer Paired".'
      );
      return;
    }

    setPrinterConnecting(true);
    try {
      const hasPerm = await requestBluetoothPermissions();
      if (!hasPerm) {
        Alert.alert('Izin Ditolak', 'Aplikasi memerlukan izin Bluetooth untuk menghubungkan printer.');
        return;
      }

      const printer = PrinterManager.getInstance(printerConfig);
      await printer.connect(printerConfig);
      setPrinterStatus(printer.isConnected() ? 'Connected' : 'Disconnected');
      Alert.alert('Printer Terhubung', `Berhasil terhubung ke ${printerConfig.printerName || printerConfig.macAddress || 'printer'}.`);
    } catch (e: any) {
      Alert.alert('Gagal Terhubung', e.message || 'Tidak dapat terhubung ke printer. Pastikan printer menyala dan dalam jangkauan.');
      setPrinterStatus('Disconnected');
    } finally {
      setPrinterConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      const printer = PrinterManager.getInstance(printerConfig);
      if ('ensureConnected' in printer && typeof (printer as any).ensureConnected === 'function') {
        await (printer as any).ensureConnected();
      }
      if (!printer.isConnected()) {
        Alert.alert('Peringatan', 'Harap hubungkan printer terlebih dahulu sebelum uji cetak.');
        return;
      }
      await printer.testPrint();
      setPrinterStatus('Connected');
      Alert.alert('Uji Cetak', 'Perintah uji cetak berhasil dikirim ke printer.');
    } catch (e: any) {
      const printer = PrinterManager.getInstance(printerConfig);
      setPrinterStatus(printer.isConnected() ? 'Connected' : 'Disconnected');
      Alert.alert('Gagal Mencetak', e.message || 'Gagal mengirim data cetak ke printer.');
    }
  };

  const handleDisconnectPrinter = async () => {
    try {
      const printer = PrinterManager.getInstance();
      await printer.disconnect();
      setPrinterStatus('Disconnected');
      Alert.alert('Printer', 'Koneksi printer terputus.');
    } catch (e: any) {
      Alert.alert('Peringatan', e.message);
    }
  };

  const mockPreviewData: ReceiptData = {
    config: receiptConfig,
    store: {
      name: receiptConfig.storeName || 'EduPOS Store',
      address: receiptConfig.storeAddress || 'Jl. Pendidikan No. 10, Jakarta',
      phone: receiptConfig.storePhone || '081234567890',
    },
    transaction: {
      transactionNumber: 'TRX-TEST-0001',
      date: new Date().toLocaleDateString('id-ID'),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      cashierName: 'Kasir Uji',
      customerName: 'Pelanggan Umum',
      subtotal: 75000,
      discount: 5000,
      total: 70000,
    },
    items: [
      { name: 'Kopi Susu Gula Aren 250ml', sku: 'KOP-01', quantity: 2, unitPrice: 25000, subtotal: 50000 },
      { name: 'Roti Bakar Cokelat Keju', sku: 'ROT-02', quantity: 1, unitPrice: 25000, subtotal: 25000 },
    ],
    payments: [
      { method: 'cash', amount: 70000, receivedAmount: 100000, changeAmount: 30000, referenceNumber: '' },
    ],
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader title="Printer & Struk" onBack={handleBack} />
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ ...theme.typography.bodyMedium, color: colors.textSecondary }}>Memuat pengaturan printer...</Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  const renderToggle = (label: string, description: string, value: boolean, onToggle: (val: boolean) => void) => (
    <View style={[styles.toggleRow, { borderBottomColor: colors.divider }]}>
      <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Printer & Struk"
            subtitle="Atur format struk belanja dan koneksi printer thermal kasir"
            onBack={handleBack}
          />

          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Format Struk</Text>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            
            <View style={[styles.fieldGroup, { zIndex: 9 }]}>
              <Select
                label="Lebar Kertas Thermal"
                selectedValue={receiptConfig.receiptWidth}
                onSelect={(val) => {
                  const width = val as ReceiptWidth;
                  setReceiptConfig({ ...receiptConfig, receiptWidth: width });
                  setPrinterConfig({ ...printerConfig, printerWidth: width });
                }}
                options={[
                  { label: '80mm (Iware MP-81MPO / Desktop Lebar)', value: '80mm' },
                  { label: '58mm (Standar Portabel Mini)', value: '58mm' },
                ]}
              />
            </View>

            {renderToggle('Tampilkan Logo Toko', 'Cetak logo toko di bagian atas struk', receiptConfig.showLogo !== false, 
              (v) => setReceiptConfig({...receiptConfig, showLogo: v, showHeader: true}))}
            
            {renderToggle('Tampilkan Alamat Toko', 'Cetak alamat toko pada header struk', receiptConfig.showStoreAddress !== false, 
              (v) => setReceiptConfig({...receiptConfig, showStoreAddress: v, showHeader: true}))}

            {renderToggle('Tampilkan No. Telepon', 'Cetak nomor kontak toko pada header struk', receiptConfig.showStorePhone !== false, 
              (v) => setReceiptConfig({...receiptConfig, showStorePhone: v, showHeader: true}))}

            {renderToggle('Tampilkan Nama Kasir', 'Cetak nama staf/kasir yang memproses pesanan', receiptConfig.showCashier, 
              (v) => setReceiptConfig({...receiptConfig, showCashier: v}))}

            {renderToggle('Tampilkan Pelanggan', 'Cetak nama pelanggan yang terdaftar', receiptConfig.showCustomer, 
              (v) => setReceiptConfig({...receiptConfig, showCustomer: v}))}

            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Catatan Kaki Struk (Footer)</Text>
              <Text style={[styles.inputHint, { color: colors.textSecondary }]}>Pesan atau ucapan terima kasih di bagian bawah struk.</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                multiline
                placeholder="Terima kasih telah berbelanja di toko kami!"
                placeholderTextColor={colors.textMuted}
                value={receiptConfig.footerText}
                onChangeText={(text) => setReceiptConfig({...receiptConfig, footerText: text, showFooter: text.trim().length > 0})}
              />
            </View>

            <View style={{ marginTop: theme.spacing.lg }}>
              <Button title="Pratinjau Struk" variant="outline" onPress={() => setPreviewVisible(true)} />
            </View>
          </Card>

          {canManageReceipt && (
            <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 4 }]}>
                    Desain Template Struk
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                    Kustomisasi tata letak blok struk, teks khusus, pembatas, dan urutan informasi struk belanja.
                  </Text>
                </View>
                <Button
                  title="Desain Template"
                  variant="primary"
                  size="sm"
                  onPress={() => router.push('/settings/receipt-templates')}
                />
              </View>
            </Card>
          )}

          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Koneksi Printer</Text>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={[styles.fieldGroup, { zIndex: 8 }]}>
              <Select
                label="Tipe Koneksi"
                selectedValue={printerConfig.connectionType}
                onSelect={(val) => setPrinterConfig({ ...printerConfig, connectionType: val as any })}
                options={[
                  { label: 'Bluetooth Thermal (Iware MP-81MPO)', value: 'bluetooth' },
                  { label: 'None (Simulasi / Nonaktif)', value: 'none' },
                ]}
              />
            </View>

            {printerConfig.connectionType === 'bluetooth' && (
              <View style={[styles.fieldGroup, { zIndex: 7 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 0 }]}>Perangkat Printer</Text>
                  <Button
                    title={scanningDevices ? "Memindai..." : "Cari Printer Paired"}
                    variant="outline"
                    size="sm"
                    loading={scanningDevices}
                    onPress={handleScanDevices}
                  />
                </View>

                {pairedDevices.length > 0 ? (
                  <Select
                    label="Pilih Printer dari Daftar Paired"
                    selectedValue={printerConfig.macAddress || ''}
                    onSelect={(val) => {
                      const selected = pairedDevices.find((d) => d.address === val);
                      setPrinterConfig({
                        ...printerConfig,
                        macAddress: val,
                        printerName: selected?.name || printerConfig.printerName || 'Iware Printer',
                      });
                    }}
                    options={pairedDevices.map((d) => ({
                      label: `${d.name} (${d.address})`,
                      value: d.address,
                    }))}
                  />
                ) : (
                  <View style={[styles.deviceInfoBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.deviceInfoText, { color: colors.textSecondary }]}>
                      {printerConfig.printerName && printerConfig.macAddress
                        ? `Printer terpilih: ${printerConfig.printerName} (${printerConfig.macAddress})`
                        : 'Belum ada printer yang dipilih. Pasangkan printer di pengaturan Bluetooth perangkat, lalu tekan "Cari Printer Paired".'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: colors.textPrimary }]}>Status Printer</Text>
              <View style={styles.statusBadgeContainer}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: printerStatus === 'Connected' ? colors.success : colors.textMuted },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: printerStatus === 'Connected' ? colors.success : colors.textSecondary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {printerStatus === 'Connected' ? 'Terhubung' : 'Terputus'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonGroup}>
              {printerStatus === 'Connected' ? (
                <Button title="Putuskan" onPress={handleDisconnectPrinter} variant="outline" style={{ flex: 1 }} />
              ) : (
                <Button title={printerConnecting ? "Menghubungkan..." : "Hubungkan Printer"} onPress={handleConnectPrinter} loading={printerConnecting} style={{ flex: 1 }} />
              )}
              <Button title="Uji Cetak" onPress={handleTestPrint} disabled={printerStatus !== 'Connected'} variant="secondary" style={{ flex: 1 }} />
            </View>
          </Card>

          <View style={styles.saveContainer}>
            <Button
              title={saving ? "Menyimpan..." : "Simpan Perubahan"}
              onPress={saveSettings}
              loading={saving}
              variant="primary"
              size="lg"
            />
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
  divider: { height: 1, marginBottom: theme.spacing.md },
  fieldGroup: { marginBottom: theme.spacing.lg },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1 },
  toggleLabel: { ...theme.typography.bodyMedium, fontWeight: 'bold' },
  toggleDesc: { ...theme.typography.caption, marginTop: 2 },
  inputLabel: { ...theme.typography.bodyMedium, fontWeight: 'bold' },
  inputHint: { ...theme.typography.caption, marginBottom: theme.spacing.xs, marginTop: 2 },
  textArea: { borderWidth: 1, borderRadius: theme.radius.sm, padding: theme.spacing.md, height: 80, textAlignVertical: 'top', ...theme.typography.bodyMedium },
  saveContainer: { marginBottom: theme.spacing.xxl },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  statusLabel: { ...theme.typography.bodyMedium, fontWeight: 'bold' },
  statusBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { ...theme.typography.bodyMedium },
  buttonGroup: { flexDirection: 'row', gap: theme.spacing.sm },
  deviceInfoBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: theme.spacing.xs,
  },
  deviceInfoText: {
    ...theme.typography.caption,
    lineHeight: 18,
  },
});
