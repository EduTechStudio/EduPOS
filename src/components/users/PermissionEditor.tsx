import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/theme';
import { PermissionEntity } from '@/database/types';

interface PermissionEditorProps {
  permissions: PermissionEntity[];
  rolePermissions: Set<string>;
  overrides: Record<string, 'GRANT' | 'DENY'>;
  onOverrideChange: (permissionId: string, effect: 'GRANT' | 'DENY' | 'DEFAULT') => void;
  disabled?: boolean;
}


const LABEL_MAP: Record<string, string> = {
  'dashboard.view': 'Lihat Dashboard',
  'pos.view': 'Akses POS',
  'pos.checkout': 'Checkout',
  'pos.apply_discount': 'Diskon',
  'draft.view': 'Lihat Draft',
  'draft.create': 'Buat Draft',
  'draft.resume': 'Lanjutkan Draft',
  'draft.cancel': 'Batalkan Draft',
  'product.view': 'Lihat Produk',
  'product.create': 'Tambah Produk',
  'product.edit': 'Edit Produk',
  'product.delete': 'Hapus Produk',
  'product.stock_adjust': 'Sesuaikan Stok',
  'customer.view': 'Lihat Pelanggan',
  'customer.create': 'Tambah Pelanggan',
  'customer.edit': 'Edit Pelanggan',
  'customer.delete': 'Hapus Pelanggan',
  'transaction.view': 'Lihat Transaksi',
  'transaction.view_detail': 'Detail Transaksi',
  'transaction.cancel': 'Batalkan Transaksi',
  'transaction.refund': 'Refund Transaksi',
  'report.view': 'Lihat Laporan',
  'settings.view': 'Lihat Pengaturan',
  'settings.manage': 'Kelola Pengaturan',
  'user.view': 'Lihat Pengguna',
  'user.create': 'Tambah Pengguna',
  'user.edit': 'Edit Pengguna',
  'user.delete': 'Hapus Pengguna',
  'role.manage': 'Kelola Role',
  'backup.create': 'Buat Backup',
  'backup.restore': 'Restore Backup',
  'database.maintenance': 'Maintenance DB',
  'database.reset': 'Reset Database',
  'demo_data.manage': 'Kelola Data Demo',
  'receipt.manage': 'Kelola Struk',
  'printer.manage': 'Kelola Printer',
  'payment.manage': 'Kelola Pembayaran',
  'payment.gateway.manage': 'Kelola Gateway Pembayaran',
};

export function PermissionEditor({ permissions, rolePermissions, overrides, onOverrideChange, disabled }: PermissionEditorProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, PermissionEntity[]> = {};
    for (const p of permissions) {
      const cat = p.description || 'Lainnya';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [permissions]);

  return (
    <View style={styles.container}>
      {Object.entries(grouped).map(([cat, perms]) => (
        <View key={cat} style={styles.group}>
          <Text style={styles.groupTitle}>{cat.toUpperCase()}</Text>
          <View style={styles.permList}>
            {perms.map(p => {
              const hasRoleDefault = rolePermissions.has(p.id);
              const override = overrides[p.id];
              const isGranted = override === 'GRANT' || (hasRoleDefault && override !== 'DENY');
              
              return (
                <View key={p.id} style={styles.permRow}>
                  <View style={styles.permInfo}>
                    <Text style={[styles.permName, !isGranted && styles.permNameInactive]}>{LABEL_MAP[p.key] || p.name}</Text>
                    <Text style={styles.permSubtitle}>Role Default: {hasRoleDefault ? 'Allow' : 'Deny'}</Text>
                  </View>
                  
                  <View style={styles.segmentControl}>
                    <TouchableOpacity
                      disabled={disabled}
                      style={[styles.segmentBtn, !override && styles.segmentBtnActive]}
                      onPress={() => onOverrideChange(p.id, 'DEFAULT')}
                    >
                      <Text style={[styles.segmentText, !override && styles.segmentTextActive]}>Default</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      disabled={disabled}
                      style={[styles.segmentBtn, override === 'GRANT' && styles.segmentBtnActiveGrant]}
                      onPress={() => onOverrideChange(p.id, 'GRANT')}
                    >
                      <Text style={[styles.segmentText, override === 'GRANT' && styles.segmentTextActiveGrant]}>Allow</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      disabled={disabled}
                      style={[styles.segmentBtn, override === 'DENY' && styles.segmentBtnActiveDeny]}
                      onPress={() => onOverrideChange(p.id, 'DENY')}
                    >
                      <Text style={[styles.segmentText, override === 'DENY' && styles.segmentTextActiveDeny]}>Deny</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md },
  group: { marginBottom: theme.spacing.sm },
  groupTitle: {
    ...theme.typography.caption,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  permList: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  permRow: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  permInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
  permNameInactive: { color: theme.colors.textMuted },
  permSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: theme.radius.sm - 2,
  },
  segmentBtnActive: { backgroundColor: theme.colors.surface },
  segmentBtnActiveGrant: { backgroundColor: theme.colors.success },
  segmentBtnActiveDeny: { backgroundColor: theme.colors.error },
  segmentText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  segmentTextActive: { color: theme.colors.primary },
  segmentTextActiveGrant: { color: theme.colors.textInverse },
  segmentTextActiveDeny: { color: theme.colors.textInverse },
});