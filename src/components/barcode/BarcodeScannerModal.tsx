import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/theme';
import { BarcodeScanResult } from '@/services/barcode';
import { barcodeService } from '@/services/barcode/BarcodeService';

interface BarcodeScannerModalProps {
  visible: boolean;
  onScan: (result: BarcodeScanResult) => void | Promise<void>;
  onClose: () => void;
}

export function BarcodeScannerModal({ visible, onScan, onClose }: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const isLockedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      isLockedRef.current = false;
      setScanned(false);
      if (!permission) {
        requestPermission();
      } else if (!permission.granted && permission.canAskAgain) {
        requestPermission();
      }
    } else {
      isLockedRef.current = true;
      setScanned(true);
    }
  }, [visible, permission, requestPermission]);

  const handleBarcodeScanned = useCallback(
    ({ type, data }: { type: string; data: string }) => {
      // Synchronous locking: drops duplicate frames immediately
      if (isLockedRef.current || !isMountedRef.current) return;
      isLockedRef.current = true;
      setScanned(true);

      const result = barcodeService.createScanResult(data, 'camera', type);
      if (result) {
        onScan(result);
      }
    },
    [onScan]
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Pindai Barcode</Text>
          <View style={{ width: 44 }} />
        </View>

        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Akses kamera dibutuhkan untuk scan barcode</Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Izinkan Kamera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView 
              style={StyleSheet.absoluteFill} 
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            <View style={styles.overlay}>
              <View style={styles.scanTarget} />
              <Text style={styles.instruction}>Arahkan barcode ke dalam kotak</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xl, // Safe area approx
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  title: {
    color: '#fff',
    ...theme.typography.header3,
  },
  closeBtn: {
    padding: theme.spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    color: '#fff',
    ...theme.typography.bodyLarge,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  permBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  permBtnText: {
    color: '#fff',
    ...theme.typography.button,
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTarget: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    borderRadius: theme.radius.sm,
  },
  instruction: {
    color: '#fff',
    marginTop: theme.spacing.lg,
    ...theme.typography.bodyMedium,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  }
});
