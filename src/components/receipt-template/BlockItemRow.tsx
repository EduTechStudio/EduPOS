import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Icon, IconName } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';
import { ReceiptBlock, ReceiptBlockType } from '@/types/receiptTemplate';

const BLOCK_META: Record<ReceiptBlockType, { label: string; icon: IconName; subtitle: string }> = {
  logo: { label: 'Logo Toko', icon: 'camera', subtitle: 'Gambar logo' },
  store_header: { label: 'Header Toko', icon: 'store', subtitle: 'Nama & kontak toko' },
  custom_text: { label: 'Teks Kustom', icon: 'edit', subtitle: 'Pesan khusus / promo' },
  divider: { label: 'Garis Pembatas', icon: 'minus', subtitle: 'Pemisah garis' },
  transaction_meta: { label: 'Info Transaksi', icon: 'receipt', subtitle: 'Nota, tanggal, kasir' },
  customer_info: { label: 'Info Pelanggan', icon: 'customers', subtitle: 'Nama pembeli' },
  item_list: { label: 'Daftar Produk', icon: 'products', subtitle: 'Item belanja & harga' },
  subtotal: { label: 'Subtotal', icon: 'transactions', subtitle: 'Subtotal tagihan' },
  discount: { label: 'Diskon', icon: 'preset', subtitle: 'Potongan harga' },
  tax: { label: 'Pajak (PPN)', icon: 'expenses', subtitle: 'Pajak transaksi' },
  total: { label: 'Total Belanja', icon: 'payment', subtitle: 'Total bayar akhir' },
  payments: { label: 'Rincian Pembayaran', icon: 'payment', subtitle: 'Metode & referensi' },
  change: { label: 'Kembalian', icon: 'payment', subtitle: 'Uang kembalian' },
  footer_text: { label: 'Footer Penutup', icon: 'info', subtitle: 'Ucapan terima kasih' },
  spacer: { label: 'Spasi Kosong', icon: 'more', subtitle: 'Baris kosong' },
};

interface BlockItemRowProps {
  block: ReceiptBlock;
  index: number;
  totalBlocks: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: (visible: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const BlockItemRow: React.FC<BlockItemRowProps> = ({
  block,
  index,
  totalBlocks,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  const meta = BLOCK_META[block.type] || {
    label: block.type,
    icon: 'more' as IconName,
    subtitle: 'Blok struk',
  };

  const isFirst = index === 0;
  const isLast = index === totalBlocks - 1;

  // Detailed summary preview for quick glance
  const getBlockSummary = () => {
    switch (block.type) {
      case 'custom_text':
        return `"${block.text.length > 20 ? block.text.slice(0, 20) + '...' : block.text}"`;
      case 'divider':
        return `Gaya: ${block.style}`;
      case 'spacer':
        return `${block.lines} Baris Kosong`;
      case 'footer_text':
        return `"${block.text.length > 20 ? block.text.slice(0, 20) + '...' : block.text}"`;
      case 'store_header':
        return `Rata: ${block.align}`;
      default:
        return meta.subtitle;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: block.visible ? colors.surface : colors.surfaceSubtle,
          borderColor: colors.border,
          opacity: block.visible ? 1 : 0.65,
        },
      ]}
    >
      {/* Drag/Order Indicator & Move Controls */}
      <View style={styles.orderControls}>
        <TouchableOpacity
          style={[styles.arrowBtn, { opacity: isFirst ? 0.25 : 1 }]}
          disabled={isFirst}
          onPress={onMoveUp}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityLabel={`Pindah ${meta.label} ke atas`}
        >
          <Icon name="chevronUp" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.indexNumber, { color: colors.textSecondary }]}>{index + 1}</Text>

        <TouchableOpacity
          style={[styles.arrowBtn, { opacity: isLast ? 0.25 : 1 }]}
          disabled={isLast}
          onPress={onMoveDown}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityLabel={`Pindah ${meta.label} ke bawah`}
        >
          <Icon name="chevronDown" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Info */}
      <TouchableOpacity
        style={styles.mainInfo}
        activeOpacity={0.7}
        onPress={onEdit}
        accessibilityLabel={`Edit properti ${meta.label}`}
      >
        <View style={[styles.iconBadge, { backgroundColor: colors.primary + '16' }]}>
          <Icon name={meta.icon} size={18} color={colors.primary} />
        </View>

        <View style={styles.textWrap}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
              {meta.label}
            </Text>
            {!block.visible && (
              <View style={[styles.hiddenBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.hiddenText, { color: colors.textMuted }]}>Nonaktif</Text>
              </View>
            )}
          </View>
          <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={1}>
            {getBlockSummary()}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Action Controls */}
      <View style={styles.actions}>
        <Switch
          value={block.visible}
          onValueChange={onToggleVisible}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle }]}
          onPress={onEdit}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityLabel={`Edit ${meta.label}`}
        >
          <Icon name="edit" size={16} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.colors.error + '14' }]}
          onPress={onDelete}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityLabel={`Hapus ${meta.label}`}
        >
          <Icon name="trash" size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  orderControls: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    width: 28,
  },
  arrowBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexNumber: {
    fontSize: 11,
    fontWeight: '700',
    marginVertical: 1,
  },
  mainInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
    paddingRight: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  hiddenBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  hiddenText: {
    fontSize: 10,
    fontWeight: '600',
  },
  summary: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
