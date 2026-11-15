import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { DiscountState, DiscountType } from '@/services/pos/POSService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency, parseCurrencyInput } from '@/utils/currency';
import { theme, useTheme } from '@/theme';

interface DiscountModalProps {
  visible: boolean;
  subtotal: number;
  currentDiscount: DiscountState;
  onClose: () => void;
  onApplyDiscount: (discount: DiscountState) => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  visible,
  subtotal,
  currentDiscount,
  onClose,
  onApplyDiscount,
}) => {
  const { colors } = useTheme();
  const [type, setType] = useState<DiscountType>('FIXED');
  const [valueText, setValueText] = useState('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setType(currentDiscount.type);
      setValueText(currentDiscount.value.toString());
      setErrorMsg(null);
    }
  }, [visible, currentDiscount]);

  const rawVal = type === 'FIXED' ? parseCurrencyInput(valueText) : parseFloat(valueText) || 0;

  let previewAmount = 0;
  if (type === 'FIXED') {
    previewAmount = Math.min(Math.max(0, rawVal), subtotal);
  } else {
    const pct = Math.min(Math.max(0, rawVal), 100);
    previewAmount = Math.min(Math.round((subtotal * pct) / 100), subtotal);
  }

  const handleApply = () => {
    setErrorMsg(null);

    if (type === 'FIXED' && rawVal > subtotal) {
      setErrorMsg(`Diskon (Rp ${formatCurrency(rawVal)}) tidak boleh melebihi subtotal (${formatCurrency(subtotal)})`);
      return;
    }

    if (type === 'PERCENT' && (rawVal < 0 || rawVal > 100)) {
      setErrorMsg('Persentase diskon harus antara 0% hingga 100%');
      return;
    }

    onApplyDiscount({
      type,
      value: rawVal,
      calculatedAmount: previewAmount,
    });
    onClose();
  };

  const handleRemoveDiscount = () => {
    onApplyDiscount({
      type: 'FIXED',
      value: 0,
      calculatedAmount: 0,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Atur Diskon Transaksi</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {errorMsg ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorSoft }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <Select
              label="Tipe Diskon *"
              selectedValue={type}
              onSelect={(val) => setType(val as DiscountType)}
              options={[
                { label: 'Potongan Nominal (Rp)', value: 'FIXED' },
                { label: 'Potongan Persentase (%)', value: 'PERCENT' },
              ]}
            />

            <Input
              label={type === 'FIXED' ? 'Nilai Diskon Nominal (Rp) *' : 'Persentase Diskon (%) *'}
              value={valueText}
              onChangeText={setValueText}
              keyboardType="numeric"
              placeholder={type === 'FIXED' ? '10000' : '10'}
            />

            <View style={[styles.previewBox, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Subtotal Order:</Text>
                <Text style={[styles.previewValue, { color: colors.textPrimary }]}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Estimasi Diskon:</Text>
                <Text style={[styles.previewValueDiscount, { color: colors.success }]}>- {formatCurrency(previewAmount)}</Text>
              </View>
              <View style={[styles.previewRow, styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Subtotal Setelah Diskon:</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(Math.max(0, subtotal - previewAmount))}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button title="Hapus Diskon" variant="outline" size="sm" onPress={handleRemoveDiscount} />
            <Button title="Terapkan Diskon" variant="primary" size="sm" onPress={handleApply} />
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
    maxWidth: 480,
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
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  previewLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  previewValue: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  previewValueDiscount: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.success,
  },
  totalRow: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  totalValue: {
    ...theme.typography.header3,
    color: theme.colors.primary,
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
