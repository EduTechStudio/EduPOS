import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, Alert } from 'react-native';
import { ReceiptPreview } from './ReceiptPreview';
import { ReceiptData } from '@/services/receipt/ReceiptService';
import { ReceiptTemplate } from '@/types/receiptTemplate';
import { ReceiptDocument } from '@/types/receiptDocument';
import { receiptTemplateService } from '@/services/receipt/ReceiptTemplateService';
import { PrinterManager } from '@/services/printer/PrinterManager';
import { Button } from '@/components/ui/Button';
import { theme } from '@/theme';

interface ReceiptPreviewModalProps {
  visible: boolean;
  receiptData: ReceiptData | null;
  template?: ReceiptTemplate;
  document?: ReceiptDocument;
  onClose: () => void;
  autoPrintOnMount?: boolean;
}

export function ReceiptPreviewModal({
  visible,
  receiptData,
  template,
  document,
  onClose,
  autoPrintOnMount,
}: ReceiptPreviewModalProps) {
  const [width, setWidth] = useState<'58mm' | '80mm'>(
    template?.paperWidth ||
      receiptData?.template?.paperWidth ||
      receiptData?.targetWidth ||
      receiptData?.config?.receiptWidth ||
      '80mm'
  );
  const [printing, setPrinting] = useState(false);
  const autoPrintedTxRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (template?.paperWidth) {
      setWidth(template.paperWidth);
    } else if (receiptData?.template?.paperWidth) {
      setWidth(receiptData.template.paperWidth);
    } else if (receiptData?.targetWidth) {
      setWidth(receiptData.targetWidth);
    } else {
      let isMounted = true;
      receiptTemplateService
        .getActiveTemplate()
        .then((active) => {
          if (isMounted && active?.paperWidth) {
            setWidth(active.paperWidth);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [template?.paperWidth, receiptData?.template?.paperWidth, receiptData?.targetWidth]);

  useEffect(() => {
    if (visible && receiptData && autoPrintOnMount) {
      const txNum = receiptData.transaction.transactionNumber;
      if (autoPrintedTxRef.current !== txNum) {
        autoPrintedTxRef.current = txNum;
        // Trigger auto-print
        handlePrint();
      }
    }
  }, [visible, receiptData, autoPrintOnMount]);

  const handlePrint = async () => {
    if (!receiptData || printing) return;
    setPrinting(true);
    try {
      const printer = await PrinterManager.getInitializedInstance();
      if ('ensureConnected' in printer && typeof (printer as any).ensureConnected === 'function') {
        await (printer as any).ensureConnected();
      }
      if (!printer.isConnected()) {
        Alert.alert(
          'Printer Belum Terhubung',
          'Printer kasir belum tersambung. Pastikan printer menyala dan pilih printer di Pengaturan > Printer & Struk.'
        );
        return;
      }

      const updatedReceiptData: ReceiptData = {
        ...receiptData,
        template: template || receiptData.template,
        document: document || receiptData.document,
        targetWidth: width,
        config: {
          ...receiptData.config,
          receiptWidth: width,
        },
      };

      await printer.printReceipt(updatedReceiptData);
      Alert.alert('Sukses', 'Struk transaksi berhasil dikirim ke printer.');
    } catch (e: any) {
      Alert.alert('Gagal Mencetak', e.message || 'Terjadi kesalahan saat mencetak.');
    } finally {
      setPrinting(false);
    }
  };

  if (!receiptData) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Pratinjau Struk</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.controls}>
            <Text style={styles.controlsLabel}>Ukuran Kertas:</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentBtn, width === '58mm' && styles.segmentBtnActive]}
                onPress={() => setWidth('58mm')}
              >
                <Text style={[styles.segmentText, width === '58mm' && styles.segmentTextActive]}>58mm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, width === '80mm' && styles.segmentBtnActive]}
                onPress={() => setWidth('80mm')}
              >
                <Text style={[styles.segmentText, width === '80mm' && styles.segmentTextActive]}>80mm</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.previewContainer}>
            <ReceiptPreview
              receiptData={receiptData}
              width={width}
              template={template}
              document={document}
            />
          </View>

          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button title="Tutup" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              <Button title={printing ? "Mencetak..." : "Cetak"} variant="primary" onPress={handlePrint} style={{ flex: 1 }} loading={printing} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxWidth: 540,
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  closeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  controlsLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  segmentTextActive: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
