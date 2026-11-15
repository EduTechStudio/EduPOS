import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { productService, categoryService } from '@/services';
import { ProductEntity, CategoryEntity } from '@/database/types';
import { CreateProductPriceTierInput } from '@/services/product/ProductService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';
import { PhysicalBarcodeScannerReceiver } from '@/components/scanner/PhysicalBarcodeScannerReceiver';
import { BarcodeScanResult } from '@/services/barcode';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { parseCurrencyInput, formatCurrency } from '@/utils/currency';
import { parseQuantityInput, formatQuantity } from '@/utils/quantity';
import { theme, useTheme } from '@/theme';

interface TierFormItem {
  id: string;
  minQuantityText: string;
  unitPriceText: string;
}

interface ProductFormModalProps {
  visible: boolean;
  product?: ProductEntity | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  product,
  onClose,
  onSaved,
}) => {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<CategoryEntity[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [purchasePriceText, setPurchasePriceText] = useState('0');
  const [sellingPriceText, setSellingPriceText] = useState('0');
  const [unit, setUnit] = useState('pcs');
  const [stockTracking, setStockTracking] = useState(true);
  const [initialStockText, setInitialStockText] = useState('0');
  const [minimumStockText, setMinimumStockText] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Wholesale Price Tiers state
  const [priceTiers, setPriceTiers] = useState<TierFormItem[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCategories();
      if (product) {
        setName(product.name);
        setSku(product.sku);
        setBarcode(product.barcode || '');
        setDescription(product.description || '');
        setCategoryId(product.category_id);
        setPurchasePriceText(product.purchase_price.toString());
        setSellingPriceText(product.selling_price.toString());
        setUnit(product.unit || 'pcs');
        setStockTracking(product.stock_tracking === 1);
        setInitialStockText(product.current_stock.toString());
        setMinimumStockText(product.minimum_stock.toString());
        setIsActive(product.is_active === 1);
        loadTiers(product.id);
      } else {
        setName('');
        setSku('');
        setBarcode('');
        setDescription('');
        setCategoryId(null);
        setPurchasePriceText('0');
        setSellingPriceText('0');
        setUnit('pcs');
        setStockTracking(true);
        setInitialStockText('0');
        setMinimumStockText('0');
        setIsActive(true);
        setPriceTiers([]);
      }
      setErrorMsg(null);
    }
  }, [visible, product]);

  const loadTiers = async (productId: string) => {
    try {
      setLoadingTiers(true);
      const tiers = await productService.getPriceTiers(productId);
      const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
      setPriceTiers(
        sorted.map((t) => ({
          id: t.id,
          minQuantityText: formatQuantity(t.min_quantity),
          unitPriceText: t.unit_price.toString(),
        }))
      );
    } catch (err) {
      console.error('Failed to load price tiers:', err);
    } finally {
      setLoadingTiers(false);
    }
  };

  const handleAddTier = () => {
    setPriceTiers((prev) => [
      ...prev,
      {
        id: `tier_${Date.now()}_${Math.random()}`,
        minQuantityText: '',
        unitPriceText: '',
      },
    ]);
  };

  const handleUpdateTier = (id: string, field: 'minQuantityText' | 'unitPriceText', val: string) => {
    setPriceTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: val } : t))
    );
  };

  const handleRemoveTier = (id: string) => {
    setPriceTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.getCategories(false);
      setCategories(data);
      if (data.length > 0 && !categoryId && !product) {
        setCategoryId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      const purchasePrice = parseCurrencyInput(purchasePriceText);
      const sellingPrice = parseCurrencyInput(sellingPriceText);
      const initialStock = parseInt(initialStockText, 10) || 0;
      const minimumStock = parseInt(minimumStockText, 10) || 0;

      // Parse and validate wholesale price tiers
      const parsedTiers: CreateProductPriceTierInput[] = [];
      for (let i = 0; i < priceTiers.length; i++) {
        const t = priceTiers[i];
        const rowNum = i + 1;
        const minQtyTrim = t.minQuantityText.trim();
        const priceTrim = t.unitPriceText.trim();

        // Skip completely blank rows
        if (minQtyTrim === '' && priceTrim === '') {
          continue;
        }

        if (minQtyTrim === '') {
          setErrorMsg(`Tingkat ${rowNum}: Jumlah minimal pembelian belum diisi`);
          setSaving(false);
          return;
        }

        if (priceTrim === '') {
          setErrorMsg(`Tingkat ${rowNum}: Harga grosir belum diisi`);
          setSaving(false);
          return;
        }

        const parsedQty = parseQuantityInput(minQtyTrim, { allowDecimal: true });
        if (parsedQty === null || parsedQty <= 0) {
          setErrorMsg(`Tingkat ${rowNum}: Jumlah minimal "${minQtyTrim}" tidak valid (harus angka lebih besar dari 0)`);
          setSaving(false);
          return;
        }

        const parsedPrice = parseCurrencyInput(priceTrim);
        if (parsedPrice < 0) {
          setErrorMsg(`Tingkat ${rowNum}: Harga grosir tidak boleh negatif`);
          setSaving(false);
          return;
        }

        parsedTiers.push({
          minQuantity: parsedQty,
          unitPrice: parsedPrice,
        });
      }

      if (product) {
        await productService.updateProduct(product.id, {
          name,
          sku,
          barcode,
          description,
          categoryId,
          purchasePrice,
          sellingPrice,
          stockTracking,
          minimumStock,
          unit,
          isActive,
          priceTiers: parsedTiers,
        });
      } else {
        await productService.createProduct({
          name,
          sku,
          barcode,
          description,
          categoryId,
          purchasePrice,
          sellingPrice,
          stockTracking,
          initialStock,
          minimumStock,
          unit,
          isActive,
          priceTiers: parsedTiers,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {errorMsg ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorSoft }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Informasi Dasar</Text>
            <Input label="Nama Produk *" value={name} onChangeText={setName} placeholder="contoh: Iced Caramel Latte" />
            <Input label="SKU (Opsional - Auto jika kosong)" value={sku} onChangeText={setSku} placeholder="DRK-001" />
            <Input label="Barcode (Opsional)" value={barcode} onChangeText={setBarcode} placeholder="8991001001" rightIcon={<TouchableOpacity onPress={() => setScannerVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Icon name="camera" size={20} color={colors.primary} /></TouchableOpacity>} />

            <Select
              label="Kategori Produk *"
              selectedValue={categoryId || (categories[0]?.id ?? '')}
              onSelect={(val) => setCategoryId(val)}
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
            />

            <Input label="Satuan (Unit)" value={unit} onChangeText={setUnit} placeholder="pcs, cup, kg, portion" />

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Harga & Keuangan</Text>
            <Input
              label="Harga Jual (Rp) *"
              value={sellingPriceText}
              onChangeText={setSellingPriceText}
              keyboardType="numeric"
              helperText={`Format: ${formatCurrency(parseCurrencyInput(sellingPriceText))}`}
            />
            <Input
              label="Harga Beli / HPP (Rp)"
              value={purchasePriceText}
              onChangeText={setPurchasePriceText}
              keyboardType="numeric"
              helperText={`Format: ${formatCurrency(parseCurrencyInput(purchasePriceText))}`}
            />

            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.sectionHeaderNoMargin, { color: colors.textPrimary }]}>Harga Grosir (Opsional)</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Harga bertingkat per satuan ({unit || 'pcs'}) berdasarkan jumlah pembelian minimum.
                </Text>
              </View>
              <Button
                title="+ Tingkat"
                variant="outline"
                size="sm"
                onPress={handleAddTier}
                leftIcon={<Icon name="plus" size={14} color={colors.primary} />}
              />
            </View>

            {loadingTiers ? (
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginVertical: 8 }]}>
                Memuat tingkat harga grosir...
              </Text>
            ) : priceTiers.length === 0 ? (
              <View style={[styles.emptyTierCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Icon name="info" size={16} color={colors.textSecondary} />
                <Text style={[styles.emptyTierText, { color: colors.textSecondary }]}>
                  Belum ada harga grosir. Produk ini akan selalu menggunakan harga jual normal ({formatCurrency(parseCurrencyInput(sellingPriceText)) || 'Rp 0'}).
                </Text>
              </View>
            ) : (
              priceTiers.map((t, index) => {
                const parsedMin = parseQuantityInput(t.minQuantityText, { allowDecimal: true });
                const parsedPrice = parseCurrencyInput(t.unitPriceText);
                return (
                  <View
                    key={t.id}
                    style={[styles.tierCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <View style={styles.tierCardHeader}>
                      <Text style={[styles.tierIndexLabel, { color: colors.primary }]}>
                        Tingkat {index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveTier(t.id)}
                        style={styles.tierRemoveBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="trash" size={15} color={colors.error} />
                        <Text style={[styles.tierRemoveText, { color: colors.error }]}>Hapus</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.tierInputsRow}>
                      <View style={{ flex: 1 }}>
                        <Input
                          label={`Min. Beli (${unit || 'pcs'}) *`}
                          value={t.minQuantityText}
                          onChangeText={(val) => handleUpdateTier(t.id, 'minQuantityText', val)}
                          placeholder="contoh: 10 atau 0.5"
                          keyboardType="numeric"
                          helperText={
                            parsedMin !== null && parsedMin > 0
                              ? `≥ ${formatQuantity(parsedMin)} ${unit || 'pcs'}`
                              : undefined
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Harga Satuan (Rp) *"
                          value={t.unitPriceText}
                          onChangeText={(val) => handleUpdateTier(t.id, 'unitPriceText', val)}
                          placeholder="contoh: 900"
                          keyboardType="numeric"
                          helperText={
                            t.unitPriceText.trim().length > 0
                              ? `${formatCurrency(parsedPrice)} / ${unit || 'pcs'}`
                              : undefined
                          }
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Pengaturan Stok</Text>
            <View style={[styles.switchRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Lacak Stok Produk Ini</Text>
              <Switch value={stockTracking} onValueChange={setStockTracking} />
            </View>

            {stockTracking && (
              <>
                {!product && (
                  <Input
                    label="Stok Awal"
                    value={initialStockText}
                    onChangeText={setInitialStockText}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                )}
                <Input
                  label="Batas Stok Minimum"
                  value={minimumStockText}
                  onChangeText={setMinimumStockText}
                  keyboardType="numeric"
                  placeholder="5"
                />
              </>
            )}

            <View style={[styles.switchRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Status Produk Aktif</Text>
              <Switch value={isActive} onValueChange={setIsActive} />
            </View>

            <Input label="Deskripsi Tambahan" value={description} onChangeText={setDescription} placeholder="Catatan atau komposisi" multiline />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button title="Batal" variant="outline" onPress={onClose} />
            <Button
              title={saving ? 'Menyimpan...' : product ? 'Simpan Perubahan' : '+ Buat Produk'}
              variant="primary"
              loading={saving}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
      <PhysicalBarcodeScannerReceiver
        enabled={visible && !scannerVisible}
        onScan={(res) => {
          setBarcode(res.value);
        }}
      />
      <BarcodeScannerModal
        visible={scannerVisible}
        onScan={(res) => {
          setScannerVisible(false);
          setBarcode(res.value);
        }}
        onClose={() => setScannerVisible(false)}
      />
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
    maxWidth: 640,
    maxHeight: '92%',
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
  sectionHeader: {
    ...theme.typography.header3,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 4,
  },
  sectionHeaderNoMargin: {
    ...theme.typography.header3,
    color: theme.colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 4,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  emptyTierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginVertical: theme.spacing.xs,
  },
  emptyTierText: {
    ...theme.typography.caption,
    flex: 1,
  },
  tierCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  tierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  tierIndexLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
  tierRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierRemoveText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  tierInputsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  switchLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
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
