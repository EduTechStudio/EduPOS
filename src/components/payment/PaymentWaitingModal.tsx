import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { theme } from '@/theme';
import { formatCurrency } from '@/utils/currency';
import { paymentService } from '@/services/payment/PaymentService';
import { checkoutService, CheckoutResult } from '@/services/checkout/CheckoutService';

interface PaymentWaitingModalProps {
  visible: boolean;
  transactionId: string | null;
  paymentResult: any | null;
  onSuccess: (result: CheckoutResult) => void;
  onCancel: () => void;
}

export const PaymentWaitingModal: React.FC<PaymentWaitingModalProps> = ({
  visible,
  transactionId,
  paymentResult,
  onSuccess,
  onCancel
}) => {
  const [status, setStatus] = useState<string>('WAITING_FOR_PAYMENT');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    let interval: any;
    if (visible && transactionId && paymentResult && status === 'WAITING_FOR_PAYMENT') {
      interval = setInterval(async () => {
        if (polling) return;
        setPolling(true);
        try {
          const check = await paymentService.checkGatewayStatus(paymentResult.paymentId);
          setStatus(check.status);
          if (check.status === 'PAID') {
            clearInterval(interval);
            const finalResult = await checkoutService.finalizeGatewayCheckout(transactionId);
            onSuccess(finalResult);
          } else if (check.status === 'FAILED' || check.status === 'EXPIRED' || check.status === 'CANCELLED') {
            clearInterval(interval);
            await checkoutService.failGatewayCheckout(transactionId, check.status);
            Alert.alert('Payment Failed', `Payment is ${check.status}`);
            onCancel();
          }
        } catch (e) {
          console.error(e);
        } finally {
          setPolling(false);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [visible, transactionId, paymentResult, status, polling]);

  const handleSimulateSuccess = async () => {
    try {
      const { paymentGatewayManager } = await import('@/services/payment/gateway/PaymentGatewayManager');
      const gw = paymentGatewayManager.getActiveGateway() as any;
      if (gw.simulateSuccess) {
        await gw.simulateSuccess(paymentResult.paymentId);
        // Next poll will catch it
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateFailure = async () => {
    try {
      const { paymentGatewayManager } = await import('@/services/payment/gateway/PaymentGatewayManager');
      const gw = paymentGatewayManager.getActiveGateway() as any;
      if (gw.simulateFailure) {
        await gw.simulateFailure(paymentResult.paymentId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!visible || !paymentResult) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Payment {paymentResult.status}</Text>
          
          <Card variant="standard" style={styles.card}>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.value}>{formatCurrency(paymentResult.amount)}</Text>
            
            {paymentResult.qrCodeData && (
              <View style={styles.qrContainer}>
                <Text style={styles.qrText}>[ QR CODE: {paymentResult.qrCodeData} ]</Text>
              </View>
            )}

            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{status}</Text>
            {status === 'WAITING_FOR_PAYMENT' && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 10 }} />}
          </Card>

          <View style={styles.devControls}>
            <Text style={styles.devTitle}>MOCK / DEVELOPMENT CONTROLS</Text>
            <Button title="Simulate Success" onPress={handleSimulateSuccess} variant="success" size="sm" />
            <Button title="Simulate Failed" onPress={handleSimulateFailure} variant="danger" size="sm" style={{ marginTop: 8 }} />
          </View>

          <View style={styles.footer}>
            <Button title="Tutup / Cancel" variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.header3,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  value: {
    ...theme.typography.bodyLarge,
    marginBottom: theme.spacing.md,
  },
  qrContainer: {
    padding: theme.spacing.lg,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  qrText: {
    fontSize: 10,
    color: '#666',
  },
  devControls: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
  },
  devTitle: {
    ...theme.typography.caption,
    fontWeight: 'bold',
    color: theme.colors.warning,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  footer: {
    marginTop: theme.spacing.md,
  },
});
