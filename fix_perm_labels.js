const fs = require('fs');
let code = fs.readFileSync('src/components/users/PermissionEditor.tsx', 'utf-8');

const idLabelMap = `
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
`;

code = code.replace("export function PermissionEditor", idLabelMap + "\nexport function PermissionEditor");

code = code.replace(
  "<Text style={[styles.permName, !isGranted && styles.permNameInactive]}>{p.name}</Text>",
  "<Text style={[styles.permName, !isGranted && styles.permNameInactive]}>{LABEL_MAP[p.key] || p.name}</Text>"
);

fs.writeFileSync('src/components/users/PermissionEditor.tsx', code);
