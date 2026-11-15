import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { draftService, DraftSaleWithItems } from '@/services/pos/DraftService';
import { formatCurrency } from '@/utils/currency';
import { theme, useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';

interface DraftListModalProps {
  visible: boolean;
  onResume: (draft: DraftSaleWithItems) => void;
  onClose: () => void;
}

export function DraftListModal({ visible, onResume, onClose }: DraftListModalProps) {
  const { colors, isDark } = useTheme();
  const { hasPermission } = useAuth();
  const [drafts, setDrafts] = useState<DraftSaleWithItems[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadDrafts();
    }
  }, [visible]);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const data = await draftService.getActiveDrafts();
      setDrafts(data);
    } catch (error) {
      console.error('Failed to load drafts', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (draft: DraftSaleWithItems) => {
    Alert.alert(
      'Batalkan Draft?',
      'Apakah Anda yakin ingin membatalkan transaksi draft ini secara permanen?',
      [
        { text: 'Tutup', style: 'cancel' },
        {
          text: 'Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              // Permission check happens inside service logic.
              await draftService.cancelDraft(draft.id);
              loadDrafts();
            } catch (error: any) {
              Alert.alert('Gagal', error.message || 'Gagal membatalkan draft');
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Draft / Simpan Pesanan</Text>
            <Button title="Tutup" variant="outline" size="sm" onPress={onClose} />
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Memuat draft...</Text>
            </View>
          ) : drafts.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
              <Icon name="transactions" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: 0 }]}>
                Tidak ada pesanan yang ditangguhkan.
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                Transaksi yang disimpan sementara akan muncul di sini.
              </Text>
            </View>
          ) : (
            <FlatList
              data={drafts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Card variant="standard" style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.draftNumber, { color: colors.textPrimary }]}>{item.draft_number}</Text>
                    <Badge label={new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} variant="info" />
                  </View>
                  <Text style={[styles.details, { color: colors.textSecondary }]}>
                    {item.items.reduce((acc, curr) => acc + curr.quantity, 0)} Items • {formatCurrency(item.total_amount)}
                  </Text>
                  <View style={styles.actions}>
                    {hasPermission('draft.cancel') && <Button title="Batalkan" variant="danger" size="sm" onPress={() => handleCancel(item)} style={{ flex: 1, marginRight: 8 }} />}
                    {hasPermission('draft.resume') && <Button title="Lanjutkan" variant="primary" size="sm" onPress={() => onResume(item)} style={{ flex: 1 }} />}
                  </View>
                </Card>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  draftNumber: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  details: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  }
});
