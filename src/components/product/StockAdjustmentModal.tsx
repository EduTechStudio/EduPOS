import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { productService } from '@/services';
import { ProductEntity, MovementType } from '@/database/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';

interface StockAdjustmentModalProps {
  visible: boolean;
  product: ProductEntity | null;
  onClose: () => void;
  onAdjusted: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  visible,
  product,
  onClose,
  onAdjusted,
}) => {
  const { colors } = useTheme();
  const [movementType, setMovementType] = useState<MovementType>('ADJUSTMENT');
  const [quantityText, setQuantityText] = useState('1');
  const [direction, setDirection] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setMovementType('ADJUSTMENT');
      setQuantityText('1');
      setDirection('ADD');
      setNotes('');
      setErrorMsg(null);
    }
  }, [visible]);

  if (!product) return null;

  const handleSave = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      const rawQty = parseInt(quantityText, 10) || 0;
      if (rawQty <= 0) {
        throw new Error('Jumlah penyesuaian harus lebih dari 0');
      }

      const delta = direction === 'ADD' ? rawQty : -rawQty;

      await productService.adjustStock({
        productId: product.id,
        movementType,
        quantityDelta: delta,
        notes,
      });

      onAdjusted();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyesuaikan stok');
    } finally {
      setSaving(false);
    }
  };

  const currentStock = product.current_stock;
  const rawQty = parseInt(quantityText, 10) || 0;
  const delta = direction === 'ADD' ? rawQty : -rawQty;
  const estimatedNewStock = currentStock + delta;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Penyesuaian Stok</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <View style={[styles.productSummaryBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.productName, { color: colors.textPrimary }]}>{product.name}</Text>
              <Text style={[styles.productSKU, { color: colors.textSecondary }]}>SKU: {product.sku}</Text>
              <View style={styles.stockStatusRow}>
                <Text style={[styles.stockLabel, { color: colors.textSecondary }]}>Stok Saat Ini:</Text>
                <Text style={[styles.stockValue, { color: colors.textPrimary }]}>{currentStock} {product.unit}</Text>
              </View>
            </View>

            {errorMsg ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorSoft }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <Select
              label="Arah Penyesuaian *"
              selectedValue={direction}
              onSelect={(val) => setDirection(val as 'ADD' | 'DEDUCT')}
              options={[
                { label: '+ Tambah Stok (Pemasokan / Penyesuaian)', value: 'ADD' },
                { label: '- Kurangi Stok (Kerusakan / Kehilangan)', value: 'DEDUCT' },
              ]}
            />

            <Select
              label="Alasan Movement *"
              selectedValue={movementType}
              onSelect={(val) => setMovementType(val as MovementType)}
              options={[
                { label: 'ADJUSTMENT (Koreksi Opname)', value: 'ADJUSTMENT' },
                { label: 'PURCHASE (Restok Pembelian)', value: 'PURCHASE' },
                { label: 'DAMAGE (Barang Rusak)', value: 'DAMAGE' },
                { label: 'RETURN (Retur Pelanggan)', value: 'RETURN' },
              ]}
            />

            <Input
              label="Jumlah Kuantitas *"
              value={quantityText}
              onChangeText={setQuantityText}
              keyboardType="numeric"
              placeholder="1"
            />

            <View style={[
              styles.previewBox,
              { backgroundColor: estimatedNewStock < 0 ? colors.errorSoft : colors.primarySoft }
            ]}>
              <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Estimasi Stok Baru:</Text>
              <Text style={[
                styles.previewValue,
                { color: estimatedNewStock < 0 ? colors.error : colors.primary }
              ]}>
                {estimatedNewStock} {product.unit}
              </Text>
            </View>

            <Input
              label="Catatan / Alasan (Opsional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="contoh: Stok fisik selisih saat opname"
              multiline
            />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button title="Batal" variant="outline" onPress={onClose} />
            <Button
              title={saving ? 'Proses...' : 'Konfirmasi Stok'}
              variant="primary"
              loading={saving}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  body: {
    padding: theme.spacing.lg,
  },
  productSummaryBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  productName: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  productSKU: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  stockLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  stockValue: {
    ...theme.typography.header3,
    color: theme.colors.primary,
  },
  errorBanner: {
    backgroundColor: theme.colors.errorLight,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '600',
  },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.infoLight,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
  },
  previewLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.info,
    fontWeight: '600',
  },
  previewValue: {
    ...theme.typography.header3,
    color: theme.colors.info,
  },
  negativeStock: {
    color: theme.colors.error,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
