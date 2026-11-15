import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Icon, IconName } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';
import { ReceiptBlock, ReceiptBlockType } from '@/types/receiptTemplate';
import { generateId } from '@/services/receipt/templateOperations';

interface BlockDefinition {
  type: ReceiptBlockType;
  label: string;
  description: string;
  icon: IconName;
  createDefault: () => ReceiptBlock;
}

const AVAILABLE_BLOCKS: BlockDefinition[] = [
  {
    type: 'custom_text',
    label: 'Teks Kustom',
    description: 'Tambahkan teks bebas, pesan promosi, slogan, atau catatan khusus',
    icon: 'edit',
    createDefault: () => ({
      id: generateId('blk_text'),
      type: 'custom_text',
      visible: true,
      text: 'Pesan Khusus Toko',
      align: 'center',
      fontSize: 'normal',
      bold: false,
    }),
  },
  {
    type: 'divider',
    label: 'Garis Pembatas',
    description: 'Pemisah garis tunggal, garis ganda, atau putus-putus',
    icon: 'minus',
    createDefault: () => ({
      id: generateId('blk_div'),
      type: 'divider',
      visible: true,
      style: 'single',
      spacing: 'none',
    }),
  },
  {
    type: 'spacer',
    label: 'Spasi Kosong',
    description: 'Memberikan ruang kosong (1-10 baris) antar blok cetak',
    icon: 'more',
    createDefault: () => ({
      id: generateId('blk_space'),
      type: 'spacer',
      visible: true,
      lines: 1,
    }),
  },
  {
    type: 'store_header',
    label: 'Header Toko',
    description: 'Nama toko, alamat, dan nomor telepon kontak',
    icon: 'store',
    createDefault: () => ({
      id: generateId('blk_header'),
      type: 'store_header',
      visible: true,
      showStoreName: true,
      showStoreAddress: true,
      showStorePhone: true,
      align: 'center',
    }),
  },
  {
    type: 'logo',
    label: 'Logo Toko',
    description: 'Cetak logo grafis toko di struk belanja',
    icon: 'camera',
    createDefault: () => ({
      id: generateId('blk_logo'),
      type: 'logo',
      visible: true,
      align: 'center',
    }),
  },
  {
    type: 'transaction_meta',
    label: 'Info Transaksi',
    description: 'Nomor nota/struk, tanggal/waktu transaksi, dan nama kasir',
    icon: 'receipt',
    createDefault: () => ({
      id: generateId('blk_meta'),
      type: 'transaction_meta',
      visible: true,
      showTransactionNumber: true,
      showDateTime: true,
      showCashier: true,
    }),
  },
  {
    type: 'customer_info',
    label: 'Info Pelanggan',
    description: 'Nama pelanggan yang terdaftar pada pesanan',
    icon: 'customers',
    createDefault: () => ({
      id: generateId('blk_cust'),
      type: 'customer_info',
      visible: true,
      label: 'Pelanggan',
    }),
  },
  {
    type: 'item_list',
    label: 'Daftar Produk',
    description: 'Daftar item belanjaan, jumlah kuantitas, harga, dan subtotal',
    icon: 'products',
    createDefault: () => ({
      id: generateId('blk_items'),
      type: 'item_list',
      visible: true,
      showSku: true,
      showUnitPrice: true,
      compact: false,
    }),
  },
  {
    type: 'subtotal',
    label: 'Subtotal',
    description: 'Baris subtotal tagihan sebelum diskon dan pajak',
    icon: 'transactions',
    createDefault: () => ({
      id: generateId('blk_subtotal'),
      type: 'subtotal',
      visible: true,
      label: 'Subtotal',
    }),
  },
  {
    type: 'discount',
    label: 'Diskon',
    description: 'Baris potongan harga atau diskon pesanan',
    icon: 'preset',
    createDefault: () => ({
      id: generateId('blk_discount'),
      type: 'discount',
      visible: true,
      label: 'Diskon',
    }),
  },
  {
    type: 'tax',
    label: 'Pajak',
    description: 'Baris pajak pertambahan nilai (PPN)',
    icon: 'expenses',
    createDefault: () => ({
      id: generateId('blk_tax'),
      type: 'tax',
      visible: true,
      label: 'Pajak',
    }),
  },
  {
    type: 'total',
    label: 'Total Belanja',
    description: 'Total akhir jumlah pembayaran transaksi',
    icon: 'payment',
    createDefault: () => ({
      id: generateId('blk_total'),
      type: 'total',
      visible: true,
      label: 'TOTAL',
      bold: true,
      fontSize: 'large',
    }),
  },
  {
    type: 'payments',
    label: 'Rincian Pembayaran',
    description: 'Metode pembayaran yang digunakan dan nomor referensi',
    icon: 'payment',
    createDefault: () => ({
      id: generateId('blk_payments'),
      type: 'payments',
      visible: true,
      showReference: true,
    }),
  },
  {
    type: 'change',
    label: 'Kembalian',
    description: 'Nominal uang kembalian pembeli',
    icon: 'payment',
    createDefault: () => ({
      id: generateId('blk_change'),
      type: 'change',
      visible: true,
      label: 'Kembalian',
    }),
  },
  {
    type: 'footer_text',
    label: 'Footer / Penutup',
    description: 'Pesan penutup struk atau ucapan terima kasih',
    icon: 'info',
    createDefault: () => ({
      id: generateId('blk_footer'),
      type: 'footer_text',
      visible: true,
      text: 'Terima kasih atas kunjungan Anda!',
      align: 'center',
    }),
  },
];

interface AddBlockModalProps {
  visible: boolean;
  onClose: () => void;
  onAddBlock: (block: ReceiptBlock) => void;
}

export const AddBlockModal: React.FC<AddBlockModalProps> = ({
  visible,
  onClose,
  onAddBlock,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Tambah Blok Struk</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Pilih elemen blok yang ingin disisipkan ke dalam tata letak struk
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {AVAILABLE_BLOCKS.map((item) => (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  const newBlock = item.createDefault();
                  onAddBlock(newBlock);
                  onClose();
                }}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Icon name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                </View>
                <Icon name="plus" size={18} color={colors.primary} />
              </TouchableOpacity>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  list: {
    flexGrow: 0,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  itemTextWrap: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
