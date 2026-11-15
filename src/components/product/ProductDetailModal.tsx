import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { stockMovementRepository, categoryRepository, productPriceTierRepository } from '@/database';
import { ProductEntity, StockMovementEntity, ProductPriceTierEntity } from '@/database/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/utils/currency';
import { formatQuantity } from '@/utils/quantity';
import { theme, useTheme } from '@/theme';

interface ProductDetailModalProps {
  visible: boolean;
  product: ProductEntity | null;
  onClose: () => void;
  onEdit: () => void;
  onAdjustStock: () => void;
  onToggleActive: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  visible,
  product,
  onClose,
  onEdit,
  onAdjustStock,
  onToggleActive,
}) => {
  const { colors } = useTheme();
  const [categoryName, setCategoryName] = useState<string>('Uncategorized');
  const { hasPermission } = useAuth();
  const [movements, setMovements] = useState<StockMovementEntity[]>([]);
  const [loadingMovements, setLoadingMovements] = useState<boolean>(false);
  const [tiers, setTiers] = useState<ProductPriceTierEntity[]>([]);

  useEffect(() => {
    if (visible && product) {
      loadDetails();
    }
  }, [visible, product]);

  const loadDetails = async () => {
    if (!product) return;
    setLoadingMovements(true);
    try {
      if (product.category_id) {
        const cat = await categoryRepository.getById(product.category_id);
        setCategoryName(cat ? cat.name : 'Uncategorized');
      } else {
        setCategoryName('Uncategorized');
      }

      const [history, priceTiers] = await Promise.all([
        stockMovementRepository.getByProductId(product.id),
        productPriceTierRepository.getByProductId(product.id),
      ]);
      setMovements(history);
      setTiers(priceTiers);
    } catch (err) {
      console.error('Failed to load product details:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  if (!product) return null;

  const isLowStock = product.stock_tracking === 1 && product.current_stock <= product.minimum_stock;
  const isOutOfStock = product.stock_tracking === 1 && product.current_stock <= 0;
  const margin = product.selling_price - product.purchase_price;
  const marginPercent = product.selling_price > 0 ? Math.round((margin / product.selling_price) * 100) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{product.name}</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>SKU: {product.sku} • {categoryName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status Badges */}
            <View style={styles.badgeRow}>
              <Badge
                label={product.is_active === 1 ? 'Aktif' : 'Non-Aktif'}
                variant={product.is_active === 1 ? 'success' : 'default'}
              />
              {product.stock_tracking !== 1 ? (
                <Badge label="Tanpa Pelacakan Stok" variant="default" />
              ) : isOutOfStock ? (
                <Badge label="STOK HABIS (0)" variant="error" />
              ) : isLowStock ? (
                <Badge label={`STOK MENIPIS (${product.current_stock})`} variant="warning" />
              ) : (
                <Badge label={`STOK AMAN (${product.current_stock})`} variant="success" />
              )}
            </View>

            {/* Price & Stock Grid */}
            <View style={[styles.gridBox, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={styles.gridCol}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Harga Jual</Text>
                <Text style={[styles.gridValuePrice, { color: colors.primary }]}>{formatCurrency(product.selling_price)}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Harga Beli (HPP)</Text>
                <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{formatCurrency(product.purchase_price)}</Text>
              </View>

              <View style={styles.gridCol}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Estimasi Profit Margin</Text>
                <Text style={[styles.gridValueSuccess, { color: colors.success }]}>{formatCurrency(margin)} ({marginPercent}%)</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Stok Saat Ini</Text>
                <Text style={[styles.gridValue, { color: colors.textPrimary }, isLowStock && { color: colors.warning }]}>
                  {product.current_stock} {product.unit} (Min: {product.minimum_stock})
                </Text>
              </View>
            </View>

            {/* Details Table */}
            <View style={[styles.detailCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Barcode</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{product.barcode || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Satuan (Unit)</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{product.unit}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Pelacakan Stok</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{product.stock_tracking === 1 ? 'Aktif' : 'Nonaktif'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tanggal Dibuat</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{new Date(product.created_at).toLocaleString('id-ID')}</Text>
              </View>
              {product.description ? (
                <View style={[styles.detailRowStack, { borderTopColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Deskripsi</Text>
                  <Text style={[styles.detailDescText, { color: colors.textPrimary }]}>{product.description}</Text>
                </View>
              ) : null}
            </View>

            {/* Wholesale Price Tiers */}
            {tiers.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Harga Grosir ({tiers.length})
                </Text>
                <View style={[styles.detailCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  {tiers.map((t, idx) => (
                    <View
                      key={t.id}
                      style={[
                        styles.detailRow,
                        idx < tiers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 8 },
                      ]}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Min. {formatQuantity(t.min_quantity)} {product.unit}
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.primary, fontWeight: '700' }]}>
                        {formatCurrency(t.unit_price)} / {product.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Stock Movement History */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Riwayat Pergerakan Stok ({movements.length})</Text>
            {movements.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada catatan pergerakan stok.</Text>
            ) : (
              movements.map((m) => (
                <View key={m.id} style={[styles.smRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.smType, { color: colors.textPrimary }]}>{m.movement_type} ({m.quantity > 0 ? `+${m.quantity}` : m.quantity})</Text>
                    <Text style={[styles.smDate, { color: colors.textSecondary }]}>{new Date(m.created_at).toLocaleString('id-ID')}</Text>
                    {m.notes ? <Text style={[styles.smNotes, { color: colors.textMuted }]}>{m.notes}</Text> : null}
                  </View>
                  <Badge
                    label={m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`}
                    variant={m.quantity > 0 ? 'success' : 'error'}
                  />
                </View>
              ))
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {hasPermission('product.edit') && <Button
              title={product.is_active === 1 ? 'Deaktivasi' : 'Aktivasi'}
              variant={product.is_active === 1 ? 'danger' : 'success'}
              size="sm"
              onPress={onToggleActive}
            />}
            {hasPermission('product.stock_adjust') && <Button title="Penyesuaian Stok" variant="secondary" size="sm" onPress={onAdjustStock} />}
            {hasPermission('product.edit') && <Button title="Edit Produk" variant="primary" size="sm" onPress={onEdit} />}
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
    maxWidth: 600,
    maxHeight: '90%',
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
  badgeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  gridBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  gridCol: {
    width: '46%',
  },
  gridLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  gridValue: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  gridValuePrice: {
    ...theme.typography.price,
    color: theme.colors.primary,
    marginTop: 2,
  },
  gridValueSuccess: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: theme.colors.success,
    marginTop: 2,
  },
  textWarning: {
    color: theme.colors.warning,
  },
  detailCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailRowStack: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  detailLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  detailDescText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  sectionTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  smRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  smType: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  smDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  smNotes: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
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
