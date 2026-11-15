import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CartItem, CartTotals } from '@/services/pos/POSService';
import { checkoutService, CheckoutResult } from '@/services/checkout/CheckoutService';
import { CustomerEntity } from '@/database/types';
import { PaymentWaitingModal } from '../payment/PaymentWaitingModal';
import { defaultPaymentMethods } from '@/config/defaultPaymentConfig';
import { settingsRepository } from '@/database';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency, parseCurrencyInput } from '@/utils/currency';
import { theme, useTheme } from '@/theme';

interface CheckoutModalProps {
  visible: boolean;
  cart: CartItem[];
  totals: CartTotals;
  customer: CustomerEntity | null;
  onOpenCustomerModal: () => void;
  onClearCustomer: () => void;
  onClose: () => void;
  onCheckoutSuccess: (result: CheckoutResult) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  cart,
  totals,
  customer,
  onOpenCustomerModal,
  onClearCustomer,
  onClose,
  onCheckoutSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const [enabledMethods, setEnabledMethods] = useState(defaultPaymentMethods.filter((pm) => pm.enabled));

  useEffect(() => {
    if (visible) {
      settingsRepository.get('payment_methods').then(setting => {
        if (setting && setting.value) {
          const loadedMethods = JSON.parse(setting.value);
          setEnabledMethods(loadedMethods.filter((pm: any) => pm.enabled));
          
          // Ensure selected method is still active
          setPaymentMethod(prev => {
             if (!loadedMethods.find((m: any) => m.id === prev && m.enabled)) {
                const firstActive = loadedMethods.find((m: any) => m.enabled);
                return firstActive ? firstActive.id : 'cash';
             }
             return prev;
          });
        }
      });
    }
  }, [visible]);

  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [receivedAmountText, setReceivedAmountText] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setPaymentMethod('cash');
      setReceivedAmountText(totals.grandTotal.toString());
      setReferenceNumber('');
      setNotes('');
      setErrorMsg(null);
      setProcessing(false);
    }
  }, [visible, totals.grandTotal]);

  const receivedAmount = parseCurrencyInput(receivedAmountText);
  const changeAmount = Math.max(0, receivedAmount - totals.grandTotal);
  const isUnderpaid = paymentMethod === 'cash' && receivedAmount < totals.grandTotal;

  // Quick Amount Suggestions for Cash
  const getQuickAmounts = (): number[] => {
    const total = totals.grandTotal;
    const suggestions = new Set<number>();
    suggestions.add(total); // Exact amount

    const roundToNext10k = Math.ceil(total / 10000) * 10000;
    if (roundToNext10k > total) suggestions.add(roundToNext10k);

    const roundToNext50k = Math.ceil(total / 50000) * 50000;
    if (roundToNext50k > total) suggestions.add(roundToNext50k);

    const roundToNext100k = Math.ceil(total / 100000) * 100000;
    if (roundToNext100k > total) suggestions.add(roundToNext100k);

    return Array.from(suggestions).sort((a, b) => a - b);
  };

  const [waitingVisible, setWaitingVisible] = useState(false);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<any | null>(null);

  const handleConfirmPayment = async () => {
    setErrorMsg(null);

    if (paymentMethod === 'cash' && isUnderpaid) {
      setErrorMsg('Uang pembayaran kurang.');
      return;
    }

    const selectedMethodConfig = enabledMethods.find(m => m.id === paymentMethod);
    if (!selectedMethodConfig?.isGateway && paymentMethod !== 'cash' && (!referenceNumber || referenceNumber.trim().length === 0)) {
      setErrorMsg(`Kode referensi wajib diisi untuk pembayaran ${paymentMethod.toUpperCase()}`);
      return;
    }

    setProcessing(true);
    try {
      const input = {
        items: cart,
        customer,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        grandTotal: totals.grandTotal,
        paymentMethod,
        receivedAmount: paymentMethod === 'cash' ? receivedAmount : totals.grandTotal,
        changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
        referenceNumber: paymentMethod === 'cash' ? null : referenceNumber,
        notes,
      };

      if (selectedMethodConfig?.isGateway) {
        const result = await checkoutService.createGatewayCheckoutIntent(input);
        setPendingTxId(result.transactionId);
        setPaymentResult(result.paymentResult);
        setWaitingVisible(true);
        setProcessing(false);
        return;
      }

      const result = await checkoutService.processCheckout(input);
      onCheckoutSuccess(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Transaksi gagal disimpan');
      setProcessing(false);
    }
  };

  const handleGatewaySuccess = (result: CheckoutResult) => {
    setWaitingVisible(false);
    onCheckoutSuccess(result);
  };

  const handleGatewayCancel = () => {
    setWaitingVisible(false);
    setPendingTxId(null);
    setPaymentResult(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Pembayaran & Checkout</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Pelanggan: {customer ? customer.name : 'Umum / Walk-in'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={processing} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Total Display */}
            <View style={[styles.totalDisplayCard, { backgroundColor: colors.primary }]}>
              <Text style={[styles.totalDisplayLabel, { color: '#DBEAFE' }]}>TOTAL HARUS DIBAYAR</Text>
              <Text style={styles.totalDisplayValue}>{formatCurrency(totals.grandTotal)}</Text>
              <Text style={[styles.totalDisplaySubtext, { color: '#E0E7FF' }]}>
                {totals.totalItemCount} item • Subtotal: {formatCurrency(totals.subtotal)}
                {totals.discountAmount > 0 ? ` • Diskon: -${formatCurrency(totals.discountAmount)}` : ''}
              </Text>
            </View>

            
            {/* Customer Selector */}
            <View style={{ marginBottom: theme.spacing.lg }}>
              <Text style={{ ...theme.typography.bodySmall, fontWeight: 'bold', color: colors.textSecondary, marginBottom: theme.spacing.xs }}>Pelanggan</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={onOpenCustomerModal}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: theme.spacing.sm,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: theme.radius.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="customers" size={16} color={colors.primary} />
                    <Text style={{ marginLeft: 6, ...theme.typography.bodyMedium, color: colors.textPrimary, fontWeight: 'bold', flex: 1 }}>
                      {customer ? customer.name : 'Pelanggan Umum'}
                    </Text>
                  </View>
                  <Icon name="chevronDown" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {customer && (
                  <TouchableOpacity onPress={onClearCustomer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: theme.spacing.sm, marginLeft: theme.spacing.xs }}>
                    <Icon name="close" size={16} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Payment Method Selector */}
            <Select
              label="Pilih Metode Pembayaran *"
              selectedValue={paymentMethod}
              onSelect={(val) => {
                setPaymentMethod(val as any);
                setErrorMsg(null);
                if (val === 'cash') {
                  setReceivedAmountText(totals.grandTotal.toString());
                } else {
                  setReferenceNumber('');
                }
              }}
              options={enabledMethods.map((pm) => ({
                label: pm.name,
                value: pm.id,
              }))}
            />

            {/* Cash Specific Inputs */}
            {paymentMethod === 'cash' && (
              <View style={styles.paymentSection}>
                <Input
                  label="Uang Diterima (Rp) *"
                  value={receivedAmountText}
                  onChangeText={setReceivedAmountText}
                  keyboardType="numeric"
                  helperText={`Format: ${formatCurrency(receivedAmount)}`}
                  error={isUnderpaid ? `Uang pembayaran kurang ${formatCurrency(totals.grandTotal - receivedAmount)}.` : undefined}
                />

                <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>Pilih Uang Pas / Pecahan Cepat:</Text>
                <View style={styles.quickButtonsRow}>
                  {getQuickAmounts().map((amt) => {
                    const isExact = amt === totals.grandTotal;
                    const isSelected = receivedAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        onPress={() => setReceivedAmountText(amt.toString())}
                        style={[
                          styles.quickBtn,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.quickBtnText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.textPrimary,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}>
                          {formatCurrency(amt)}{isExact ? ' (Pas)' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Change Box */}
                <View style={[
                  styles.changeBox,
                  {
                    backgroundColor: isUnderpaid ? colors.errorSoft : colors.successSoft,
                    borderWidth: 1,
                    borderColor: isUnderpaid ? colors.error : colors.success,
                  }
                ]}>
                  <Text style={[styles.changeLabel, { color: isUnderpaid ? colors.error : colors.textPrimary }]}>
                    {isUnderpaid ? 'Status Pembayaran:' : 'Kembalian:'}
                  </Text>
                  <Text style={[
                    styles.changeValue,
                    { color: isUnderpaid ? colors.error : colors.success, fontWeight: '700', fontSize: 16 }
                  ]}>
                    {isUnderpaid ? `Kurang ${formatCurrency(totals.grandTotal - receivedAmount)}` : formatCurrency(changeAmount)}
                  </Text>
                </View>
              </View>
            )}

            {/* Non-Cash Manual Reference Inputs */}
            {paymentMethod !== 'cash' && (
              <View style={styles.paymentSection}>
                <Input
                  label={`Kode Referensi / Nomor Transaksi (${paymentMethod.toUpperCase()}) *`}
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                  placeholder="contoh: QRIS-992019381 / TRF-88192"
                />
                <Text style={styles.manualNoticeText}>
                  Konfirmasi manual pembayaran {paymentMethod.toUpperCase()}. Masukkan kode referensi dari bukti transaksi pelanggan.
                </Text>
              </View>
            )}

            <Input
              label="Catatan Transaksi (Opsional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Catatan tambahan kasir"
            />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button title="Batal" variant="outline" size="sm" disabled={processing} onPress={onClose} />
            <Button
              title={processing ? 'Memproses Transaksi...' : `Konfirmasi Bayar (${formatCurrency(totals.grandTotal)})`}
              variant="success"
              size="md"
              loading={processing}
              disabled={processing || isUnderpaid}
              onPress={handleConfirmPayment}
            />
          </View>
        </View>
      </View>
      <PaymentWaitingModal visible={waitingVisible} transactionId={pendingTxId} paymentResult={paymentResult} onSuccess={handleGatewaySuccess} onCancel={handleGatewayCancel} />
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
    maxWidth: 580,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
  totalDisplayCard: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  totalDisplayLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  totalDisplayValue: {
    ...theme.typography.priceLarge,
    fontSize: 26,
    color: theme.colors.textInverse,
    marginVertical: 2,
  },
  totalDisplaySubtext: {
    ...theme.typography.caption,
    color: theme.colors.surfaceSubtle,
  },
  paymentSection: {
    marginVertical: theme.spacing.xs,
  },
  quickLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  quickBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  quickBtnSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quickBtnText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  quickBtnTextSelected: {
    color: theme.colors.textInverse,
  },
  changeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.successLight,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  changeBoxError: {
    backgroundColor: theme.colors.errorLight,
  },
  changeLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  changeValue: {
    ...theme.typography.header2,
    color: theme.colors.success,
  },
  changeValueError: {
    color: theme.colors.error,
  },
  manualNoticeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
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
