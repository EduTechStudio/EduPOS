import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  ActivityIndicator,
  Switch,
  Alert,
  Keyboard,
} from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/context/AuthContext';
import { productService, categoryService } from '@/services';
import { ProductEntity, CategoryEntity } from '@/database/types';
import { formatCurrency } from '@/utils/currency';
import { ProductFormModal } from '@/components/product/ProductFormModal';
import { StockAdjustmentModal } from '@/components/product/StockAdjustmentModal';
import { CategoryManageModal } from '@/components/product/CategoryManageModal';
import { ProductDetailModal } from '@/components/product/ProductDetailModal';
import { PhysicalBarcodeScannerReceiver } from '@/components/scanner/PhysicalBarcodeScannerReceiver';
import { BarcodeScanResult } from '@/services/barcode';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { Icon } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';

export default function ProductsScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission } = useAuth();
  const { isTablet } = useResponsive();
  
  if (!hasPermission('product.view')) {
    return (
      <ScreenContainer>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{...theme.typography.header3, color: theme.colors.error}}>Akses Ditolak</Text>
          <Text style={{...theme.typography.bodyMedium}}>Anda tidak memiliki izin melihat produk.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const [isScreenFocused, setIsScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [includeInactive, setIncludeInactive] = useState<boolean>(false);

  // Search input tracking
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchKeystrokeTimesRef = useRef<number[]>([]);
  const previousManualQueryRef = useRef<string>('');

  // Modals & Selection
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductEntity | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [stockProduct, setStockProduct] = useState<ProductEntity | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductEntity | null>(null);

  // Catalog search state with monotonic request sequencing and race condition prevention
  const {
    products,
    loading,
    loadError,
    searchQuery,
    selectedCategoryId,
    setSearchQuery,
    setSelectedCategoryId,
    resetFilters: resetSearchFilters,
    refreshCatalog,
    submitSearch,
  } = useCatalogSearch(
    useCallback(
      (query, categoryId) =>
        productService.searchProducts(query, categoryId, includeInactive),
      [includeInactive]
    ),
    { debounceMs: 250 }
  );

  // Refresh catalog when includeInactive toggle changes
  useEffect(() => {
    refreshCatalog();
  }, [includeInactive, refreshCatalog]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoryService.getCategories(true);
      setCategories(cats);
    } catch (err) {
      console.error('[products.tsx] Failed to load categories:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([loadCategories(), refreshCatalog()]);
  }, [loadCategories, refreshCatalog]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Handle Physical Scanner scan event: searches the exact barcode across all categories immediately
  const handlePhysicalScan = useCallback(
    (result: BarcodeScanResult) => {
      const barcode = result.value.trim();
      if (!barcode) return;

      // Reset category filter so product is searched across all categories
      setSelectedCategoryId(null);
      // Immediately dispatch barcode search without waiting for debounce
      setSearchQuery(barcode, true);
    },
    [setSearchQuery, setSelectedCategoryId]
  );

  const handleSearchChange = (text: string) => {
    const now = Date.now();
    searchKeystrokeTimesRef.current.push(now);

    if (searchKeystrokeTimesRef.current.length > 15) {
      searchKeystrokeTimesRef.current.shift();
    }

    const times = searchKeystrokeTimesRef.current;
    if (times.length >= 4) {
      const duration = times[times.length - 1] - times[0];
      const avgInterval = duration / (times.length - 1);
      // Fast hardware burst check (< 35ms per key average)
      if (avgInterval <= 35) {
        if (/[\r\n\t]/.test(text)) {
          const cleaned = text.replace(/[\r\n\t]+/g, '').trim();
          if (cleaned.length >= 3) {
            searchKeystrokeTimesRef.current = [];
            Keyboard.dismiss();
            setSelectedCategoryId(null);
            setSearchQuery(cleaned, true);
            return;
          }
        }
      }
    }

    previousManualQueryRef.current = text;
    setSearchQuery(text);
  };

  const handleSearchSubmit = () => {
    const times = searchKeystrokeTimesRef.current;
    const now = Date.now();
    if (times.length >= 3) {
      const duration = now - times[0];
      const avgInterval = duration / times.length;
      if (avgInterval <= 45 && searchQuery.length >= 3) {
        const scannedCode = searchQuery.trim();
        searchKeystrokeTimesRef.current = [];
        Keyboard.dismiss();
        setSelectedCategoryId(null);
        setSearchQuery(scannedCode, true);
        return;
      }
    }
    submitSearch();
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditProduct = (prod: ProductEntity) => {
    setEditingProduct(prod);
    setIsFormModalOpen(true);
  };

  const handleOpenStockAdjust = (prod: ProductEntity) => {
    setStockProduct(prod);
    setIsStockModalOpen(true);
  };

  const handleOpenDetail = (prod: ProductEntity) => {
    setSelectedProduct(prod);
    setIsDetailModalOpen(true);
  };

  const handleToggleActiveStatus = async (prod: ProductEntity) => {
    try {
      await productService.setProductActiveStatus(prod.id, prod.is_active === 0);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengubah status produk');
    }
  };

  const getCategoryName = (catId: string | null): string => {
    if (!catId) return 'Uncategorized';
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'Uncategorized';
  };

  const renderStockBadge = (prod: ProductEntity) => {
    if (prod.stock_tracking !== 1) {
      return <Badge label="Tanpa Stok" variant="default" />;
    }
    if (prod.current_stock <= 0) {
      return <Badge label="Stok Habis (0)" variant="error" />;
    }
    if (prod.current_stock <= prod.minimum_stock) {
      return <Badge label={`Menipis (${prod.current_stock})`} variant="warning" />;
    }
    return <Badge label={`Aman (${prod.current_stock})`} variant="success" />;
  };

  const renderProductItem = useCallback(
    ({ item: prod }: { item: ProductEntity }) => {
      const isInactive = prod.is_active === 0;

      return (
        <Card
          key={prod.id}
          variant="standard"
          onPress={() => handleOpenDetail(prod)}
          style={[
            styles.productCard,
            { borderColor: colors.border },
            isInactive && [styles.inactiveCard, { backgroundColor: colors.surfaceSubtle }],
          ]}>
          <View style={styles.productRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.titleBadgeRow}>
                <Text style={[styles.productName, { color: colors.textPrimary }, isInactive && styles.inactiveText]} numberOfLines={2}>
                  {prod.name}
                </Text>
                <Badge label={getCategoryName(prod.category_id)} variant="default" />
                {isInactive && <Badge label="Non-Aktif" variant="default" />}
              </View>

              <Text style={[styles.productMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                SKU: {prod.sku} {prod.barcode ? `• Barcode: ${prod.barcode}` : ''}
              </Text>

              <View style={styles.stockRow}>
                {renderStockBadge(prod)}
                <Text style={[styles.stockText, { color: colors.textSecondary }]}>
                  {prod.stock_tracking === 1 ? `Satuan: ${prod.unit} • Min: ${prod.minimum_stock}` : `Satuan: ${prod.unit}`}
                </Text>
              </View>
            </View>

            <View style={styles.rightCol}>
              <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(prod.selling_price)}</Text>
              <View style={styles.actionButtonsRow}>
                {hasPermission('product.stock_adjust') && (
                  <Button
                    title="Stok"
                    variant="outline"
                    size="sm"
                    onPress={() => handleOpenStockAdjust(prod)}
                  />
                )}
                {hasPermission('product.edit') && (
                  <Button
                    title="Edit"
                    variant="secondary"
                    size="sm"
                    onPress={() => handleOpenEditProduct(prod)}
                  />
                )}
              </View>
            </View>
          </View>
        </Card>
      );
    },
    [colors, categories, hasPermission]
  );

  const hasActiveFilters = searchQuery !== '' || selectedCategoryId !== null || includeInactive;

  const resetFilters = () => {
    resetSearchFilters();
    setIncludeInactive(false);
  };

  return (
    <ScreenContainer scrollable={false}>
      <ResponsiveContainer style={{ flex: 1 }}>
        <SectionHeader
          title="Katalog Produk"
          subtitle={`Total ${products.length} produk terdaftar`}
          rightElement={
            <View style={styles.topActions}>
              <Button
                title="Kategori"
                variant="outline"
                size="sm"
                onPress={() => setIsCategoryModalOpen(true)}
              />
              {hasPermission('product.create') && <Button title="+ Tambah Produk"
                variant="primary"
                size="sm"
                onPress={handleOpenAddProduct} />}
            </View>
          }
        />

        {/* Filter Bar */}
        <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input
            placeholder="Cari produk (Nama, SKU, Barcode)..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={handleSearchSubmit}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            leftIcon={<Icon name="search" size={18} color={colors.textMuted} />}
            rightIcon={
              searchQuery ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery('', true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Hapus pencarian"
                >
                  <Icon name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null
            }
            containerStyle={{ marginBottom: theme.spacing.sm }}
          />

          <View style={styles.filterControlsRow}>
            {/* Category Chips Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(null)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategoryId === null ? colors.primary : colors.surfaceSubtle,
                    borderColor: selectedCategoryId === null ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: selectedCategoryId === null ? '#FFFFFF' : colors.textPrimary,
                      fontWeight: selectedCategoryId === null ? '700' : '500',
                    },
                  ]}>
                  Semua ({products.length})
                </Text>
              </TouchableOpacity>

              {categories
                .filter((c) => c.is_active === 1)
                .map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color: isSelected ? '#FFFFFF' : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={styles.inactiveToggleRow}>
              <Text style={[styles.inactiveToggleLabel, { color: colors.textSecondary }]}>Non-Aktif</Text>
              <Switch value={includeInactive} onValueChange={setIncludeInactive} />
            </View>
          </View>
        </View>

        {/* Responsive Content Area */}
        <View style={isTablet ? styles.tabletLayout : styles.phoneLayout}>
          {/* Main Product List */}
          <View style={isTablet ? styles.leftPanelTablet : styles.fullWidth}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat data produk...</Text>
              </View>
            ) : loadError ? (
              <Card variant="subtle" style={[styles.emptyCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.error }]}>RUNTIME ERROR</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{loadError}</Text>
              </Card>
            ) : products.length === 0 ? (
              <Card variant="subtle" style={[styles.emptyCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Icon name="products" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery
                    ? 'Produk Tidak Ditemukan'
                    : selectedCategoryId
                    ? 'Belum Ada Produk di Kategori Ini'
                    : 'Belum Ada Produk'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery
                    ? `Tidak ada produk yang cocok dengan "${searchQuery}".`
                    : 'Silakan tambahkan produk baru ke dalam katalog toko Anda.'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.md }}>
                  {hasActiveFilters && (
                    <Button
                      title="Reset Filter"
                      variant="outline"
                      size="sm"
                      onPress={resetFilters}
                    />
                  )}
                  {hasPermission('product.create') && (
                    <Button
                      title="+ Tambah Produk"
                      variant="primary"
                      size="sm"
                      onPress={handleOpenAddProduct}
                    />
                  )}
                </View>
              </Card>
            ) : (
              <FlatList
                style={styles.productListScroll}
                data={products}
                keyExtractor={(item) => item.id}
                renderItem={renderProductItem}
                showsVerticalScrollIndicator={false}
                initialNumToRender={15}
                maxToRenderPerBatch={15}
                windowSize={7}
                removeClippedSubviews={Platform.OS === 'android'}
              />
            )}
          </View>

          {/* Tablet Side Inspection Panel */}
          {isTablet && (
            <View style={styles.rightPanelTablet}>
              <Card variant="elevated" style={styles.sideCard}>
                <Text style={styles.sideTitle}>Ringkasan Katalog Produk</Text>

                <View style={styles.sideStatRow}>
                  <Text style={styles.sideStatLabel}>Total Produk Aktif</Text>
                  <Text style={styles.sideStatValue}>
                    {products.filter((p) => p.is_active === 1).length} item
                  </Text>
                </View>

                <View style={styles.sideStatRow}>
                  <Text style={styles.sideStatLabel}>Peringatan Stok Menipis</Text>
                  <Text style={[styles.sideStatValue, { color: theme.colors.warning }]}>
                    {products.filter((p) => p.stock_tracking === 1 && p.current_stock <= p.minimum_stock).length} item
                  </Text>
                </View>

                <View style={styles.sideStatRow}>
                  <Text style={styles.sideStatLabel}>Total Kategori</Text>
                  <Text style={styles.sideStatValue}>{categories.length} kategori</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sideHint}>
                  Pilih produk dari daftar di sebelah kiri untuk melihat detail pergerakan stok lengkap dan opsi pengeditan.
                </Text>
              </Card>
            </View>
          )}
        </View>

        {/* Physical Scanner Receiver for Products Screen */}
        <PhysicalBarcodeScannerReceiver
          onScan={handlePhysicalScan}
          enabled={
            isScreenFocused &&
            !isFormModalOpen &&
            !isCategoryModalOpen &&
            !isStockModalOpen &&
            !isDetailModalOpen
          }
          isManualInputFocused={isSearchFocused}
        />

        {/* Modals */}
        <ProductFormModal
          visible={isFormModalOpen}
          product={editingProduct}
          onClose={() => setIsFormModalOpen(false)}
          onSaved={loadData}
        />

        <StockAdjustmentModal
          visible={isStockModalOpen}
          product={stockProduct}
          onClose={() => setIsStockModalOpen(false)}
          onAdjusted={loadData}
        />

        <CategoryManageModal
          visible={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoryChanged={loadData}
        />

        <ProductDetailModal
          visible={isDetailModalOpen}
          product={selectedProduct}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={() => {
            setIsDetailModalOpen(false);
            if (selectedProduct) handleOpenEditProduct(selectedProduct);
          }}
          onAdjustStock={() => {
            setIsDetailModalOpen(false);
            if (selectedProduct) handleOpenStockAdjust(selectedProduct);
          }}
          onToggleActive={() => {
            if (selectedProduct) handleToggleActiveStatus(selectedProduct);
          }}
        />
      </ResponsiveContainer>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  filterContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  categoryScroll: {
    flexGrow: 0,
    maxHeight: 48,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginRight: theme.spacing.xs,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipInactive: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
  },
  categoryChipText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: theme.colors.textInverse,
  },
  categoryChipTextInactive: {
    color: theme.colors.textPrimary,
  },
  inactiveToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  inactiveToggleLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  tabletLayout: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    flex: 1,
  },
  phoneLayout: {
    flexDirection: 'column',
    flex: 1,
  },
  leftPanelTablet: {
    flex: 1.6,
  },
  rightPanelTablet: {
    flex: 1,
  },
  fullWidth: {
    width: '100%', flex: 1,
  },
  loadingBox: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyCard: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  productListScroll: {
    flex: 1,
  },
  productCard: {
    marginBottom: theme.spacing.sm,
  },
  inactiveCard: {
    opacity: 0.65,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  productName: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  inactiveText: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  productMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: 4,
  },
  stockText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  warningText: {
    color: theme.colors.warning,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  price: {
    ...theme.typography.price,
    color: theme.colors.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  sideCard: {
    padding: theme.spacing.lg,
  },
  sideTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  sideStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  sideStatLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  sideStatValue: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  sideHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
