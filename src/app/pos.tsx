import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { settingsRepository } from '@/database';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Keyboard,
} from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';
import { PhysicalBarcodeScannerReceiver } from '@/components/scanner/PhysicalBarcodeScannerReceiver';
import { CustomerSelectorModal } from '@/components/pos/CustomerSelectorModal';
import { DraftListModal } from '@/components/pos/DraftListModal';
import { BarcodeScanResult, barcodeLookupService } from '@/services/barcode';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/context/AuthContext';
import { usePOS } from '@/context/POSContext';
import { posService, categoryService } from '@/services';
import { draftService, DraftSaleWithItems } from '@/services/pos/DraftService';
import { customerRepository } from '@/database';
import { ProductEntity, CategoryEntity, CustomerEntity } from '@/database/types';
import { CartItem, DiscountState, CartTotals } from '@/services/pos/POSService';
import { CheckoutResult } from '@/services/checkout/CheckoutService';
import { useCatalogSearch } from '@/hooks/useCatalogSearch';
import { formatCurrency } from '@/utils/currency';
import { defaultPOSConfig } from '@/config/defaultPOSConfig';
import { DiscountModal } from '@/components/pos/DiscountModal';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { PhoneCartSheet } from '@/components/pos/PhoneCartSheet';
import { CartQuantityInput } from '@/components/pos/CartQuantityInput';
import { TransactionSuccessModal } from '@/components/pos/TransactionSuccessModal';
import { theme, useTheme } from '@/theme';

export default function POSScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission } = useAuth();
  const { cart, setCart, discount, setDiscount, customer: selectedCustomer, setCustomer: setSelectedCustomer, clearCart } = usePOS();
  const { isTablet } = useResponsive();
  const [posConfig, setPosConfig] = useState(defaultPOSConfig);
  
  if (!hasPermission('pos.view')) {
    return (
      <ScreenContainer>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{...theme.typography.header3, color: theme.colors.error}}>Akses Ditolak</Text>
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadPosConfig = async () => {
        try {
          const setting = await settingsRepository.get('pos_config');
          console.log("[POS DISPLAY DEBUG] show stock setting = ", setting?.value ? JSON.parse(setting.value).productDisplay?.showStock : 'Not Set');
          if (setting && setting.value && isActive) {
            setPosConfig(prev => ({ ...prev, ...JSON.parse(setting.value) }));
          }
        } catch(e) {
          console.error(e);
        }
      };
      loadPosConfig();
      return () => { isActive = false; };
    }, [])
  );

  // State for Catalog Metadata
  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [customers, setCustomers] = useState<CustomerEntity[]>([]);

  // Catalog Search State with Request Sequencing & Race Condition Prevention
  const {
    products,
    loading,
    loadError,
    searchQuery,
    selectedCategoryId,
    setSearchQuery,
    setSelectedCategoryId,
    resetFilters,
    refreshCatalog,
    submitSearch,
  } = useCatalogSearch(
    useCallback(
      (query, categoryId) => posService.getCashierProducts(query, categoryId),
      []
    ),
    { debounceMs: 250 }
  );

  // Modal States
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState<boolean>(false);
  const [isPhoneCartOpen, setIsPhoneCartOpen] = useState<boolean>(false);

  // Checkout Result Success Modal State
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  // Load static/slow-changing metadata (categories, customers) once on mount
  const loadMetadata = useCallback(async () => {
    try {
      const [catsResult, custsResult] = await Promise.allSettled([
        categoryService.getCategories(false),
        customerRepository.getAll(),
      ]);

      if (catsResult.status === 'fulfilled') {
        setCategories(catsResult.value);
      } else {
        console.error('[pos.tsx] Failed to load categories:', catsResult.reason);
      }

      if (custsResult.status === 'fulfilled') {
        setCustomers(custsResult.value);
      } else {
        console.error('[pos.tsx] Failed to load customers:', custsResult.reason);
      }
    } catch (err) {
      console.error('[pos.tsx] Failed to load cashier metadata:', err);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Calculations
  const totals: CartTotals = posService.calculateTotals(cart, discount);
  const isSplitView = isTablet && posConfig.tabletLayout.splitView;

  const [scannerVisible, setScannerVisible] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchKeystrokeTimesRef = useRef<number[]>([]);
  const previousManualQueryRef = useRef<string>('');
  const isScanProcessingRef = useRef(false);

  const handleBarcodeScan = async (result: BarcodeScanResult) => {
    // If scanning from camera, immediately close camera modal
    if (result.source === 'camera') {
      if (isScanProcessingRef.current) return;
      isScanProcessingRef.current = true;
      setScannerVisible(false);
    }

    try {
      const product = await barcodeLookupService.lookupProductByBarcode(result.value);
      if (!product) {
        Alert.alert('Tidak Ditemukan', `"Barcode ${result.value} tidak terdaftar."`);
        return;
      }
      if (!product.is_active) {
        Alert.alert('Produk Tidak Aktif', `"Produk ${product.name} sedang dinonaktifkan."`);
        return;
      }
      if (product.stock_tracking === 1 && product.current_stock <= 0) {
        Alert.alert('Stok Habis', `"Stok ${product.name} telah habis."`);
        return;
      }

      // Add product directly to existing cart (increments quantity if already in cart)
      setCart((prevCart) => posService.addItemToCart(prevCart, product));
    } catch (err: any) {
      Alert.alert('Stok Tidak Tersedia', err.message || 'Gagal menambahkan produk ke keranjang');
    } finally {
      if (result.source === 'camera') {
        isScanProcessingRef.current = false;
      }
    }
  };

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
            setSearchQuery(previousManualQueryRef.current);
            searchKeystrokeTimesRef.current = [];
            Keyboard.dismiss();
            handleBarcodeScan({
              value: cleaned,
              source: 'hardware',
              timestamp: now,
            });
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
        setSearchQuery(previousManualQueryRef.current);
        searchKeystrokeTimesRef.current = [];
        Keyboard.dismiss();
        handleBarcodeScan({
          value: scannedCode,
          source: 'hardware',
          timestamp: now,
        });
        return;
      }
    }
    submitSearch();
  };

  // Cart Actions
  const handleAddToCart = (product: ProductEntity) => {
    try {
      const updated = posService.addItemToCart(cart, product);
      setCart(updated);
    } catch (err: any) {
      Alert.alert('Stok Tidak Tersedia', err.message || 'Gagal menambahkan produk ke keranjang');
    }
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    try {
      const updated = posService.updateItemQuantity(cart, productId, delta);
      setCart(updated);
    } catch (err: any) {
      Alert.alert('Batas Stok', err.message || 'Gagal mengubah kuantitas');
    }
  };

  const handleSetQuantity = (productId: string, quantity: number) => {
    try {
      const updated = posService.setItemQuantity(cart, productId, quantity);
      setCart(updated);
    } catch (err: any) {
      Alert.alert('Batas Stok', err.message || 'Gagal mengubah kuantitas');
    }
  };

  const handleRemoveItem = (productId: string) => {
    const updated = posService.removeItemFromCart(cart, productId);
    setCart(updated);
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;

    Alert.alert(
      'Kosongkan Keranjang?',
      'Semua item dalam keranjang belanja saat ini akan dihapus.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kosongkan',
          style: 'destructive',
          onPress: () => {
            clearCart();
            setIsPhoneCartOpen(false);
          },
        },
      ]
    );
  };

  
  const handleHoldSale = async () => {
    if (cart.length === 0) return;
    try {
      await draftService.saveDraft(cart, selectedCustomer, { type: discount.type, value: discount.value }, totals);
      clearCart();
      setIsPhoneCartOpen(false);
      Alert.alert('Sukses', 'Transaksi berhasil disimpan sebagai draft.');
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Gagal menyimpan draft');
    }
  };

  
  const handleResumeDraft = async (draft: DraftSaleWithItems) => {
    const doResume = async () => {
      const newCart = draft.items.map(item => {
        const prod = products.find(p => p.id === item.product_id);
        return {
          productId: item.product_id,
          productName: item.product_name_snapshot,
          sku: item.sku_snapshot || '',
          barcode: null,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          availableStock: prod ? prod.current_stock : 9999, // Will be validated by POSService before checkout
          unit: prod ? prod.unit : 'pcs',
          stockTracking: prod ? prod.stock_tracking === 1 : true,
        };
      });
      setCart(newCart);
      setDiscount({ type: draft.discount_type || 'FIXED', value: draft.discount_value || 0, calculatedAmount: draft.discount_amount });
      if (draft.customer_id) {
        const c = customers.find(x => x.id === draft.customer_id);
        setSelectedCustomer(c || null);
      } else {
        setSelectedCustomer(null);
      }
      
      try {
        await draftService.resumeDraft(draft.id);
      } catch(e) {}
      
      setIsDraftsModalOpen(false);
    };

    if (cart.length > 0) {
      Alert.alert(
        'Keranjang saat ini masih berisi transaksi.',
        'Lanjutkan Draft akan mengganti keranjang saat ini. Lanjutkan?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Lanjutkan', onPress: doResume }
        ]
      );
    } else {
      doResume();
    }
  };


  const handleStartCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Keranjang Kosong', 'Pilih minimal satu produk untuk melakukan pembayaran.');
      return;
    }

    // Revalidate stock against fresh SQLite database state
    const validation = await posService.revalidateCartStock(cart);
    if (!validation.valid) {
      Alert.alert('Validasi Stok Berubah', validation.errors.join('\n'));
      refreshCatalog();
      return;
    }

    setIsPhoneCartOpen(false);
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutSuccess = (result: CheckoutResult) => {
    setIsCheckoutModalOpen(false);
    setCheckoutResult(result);
    // Clear cart ONLY after successful atomic SQLite commit
    clearCart();
    // Refresh catalog to reflect updated SQLite stock
    refreshCatalog();
  };

  return (
    <ScreenContainer
      scrollable={false}
      paddingHorizontal={isTablet ? theme.spacing.lg : theme.spacing.md}
      contentContainerStyle={{
        paddingVertical: isTablet ? theme.spacing.lg : theme.spacing.xs,
      }}
    >
      <ResponsiveContainer style={{ flex: 1 }}>
        {isTablet && (
          <SectionHeader
            title="Mesin Kasir"
            subtitle="Registrasi penjualan dan transaksi kasir offline"
            rightElement={<Badge label="Kasir Siap" variant="success" />}
          />
        )}

        <View style={isSplitView ? styles.tabletSplitView : styles.phoneStackView}>
          {/* Catalog Panel (Left on Tablet, Full Width on Phone) */}
          <View style={isSplitView ? styles.catalogColumnTablet : styles.fullColumn}>
            {/* Search Input */}
            <Input
              containerStyle={styles.searchInputContainer}
              placeholder="Cari produk (Nama, SKU, Barcode)..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              returnKeyType="search"
              leftIcon={<Icon name="search" size={18} color={colors.textMuted} />}
              rightIcon={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {searchQuery ? (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Hapus pencarian"
                    >
                      <Icon name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => setScannerVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Pindai barcode"
                  >
                    <Icon name="camera" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              }
            />

            {/* Category Filter Chips */}
            {categories.length > 0 && (
              <View style={styles.categoryContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryScrollContent}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedCategoryId(null)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selectedCategoryId === null ? colors.primary : colors.surface,
                        borderColor: selectedCategoryId === null ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color: selectedCategoryId === null ? '#FFFFFF' : colors.textPrimary,
                          fontWeight: selectedCategoryId === null ? '700' : '500',
                        },
                      ]}
                    >
                      Semua
                    </Text>
                  </TouchableOpacity>

                  {categories
                    .filter((c) => c.is_active === 1)
                    .map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.surface,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              {
                                color: isSelected ? '#FFFFFF' : colors.textPrimary,
                              },
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            )}

            <FlatList
              style={styles.catalogScroll}
              data={products}
              keyExtractor={(item) => item.id}
              numColumns={posConfig.layout === 'list' ? 1 : (isTablet ? 3 : 2)}
              key={posConfig.layout === 'list' ? 'list' : (isTablet ? 'grid-3' : 'grid-2')}
              contentContainerStyle={{ paddingBottom: (!isSplitView && cart.length > 0) ? 96 : theme.spacing.md }}
              columnWrapperStyle={posConfig.layout !== 'list' ? { gap: theme.spacing.sm, marginBottom: theme.spacing.sm } : undefined}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={
                loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat katalog produk...</Text>
                  </View>
                ) : (
                  <Card variant="subtle" style={[styles.emptyCard, { backgroundColor: colors.surfaceSubtle }]}>
                    <Icon name="search" size={36} color={colors.textMuted} style={{ marginBottom: theme.spacing.sm }} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                      {searchQuery
                        ? 'Produk Tidak Ditemukan'
                        : selectedCategoryId
                        ? 'Kategori Kosong'
                        : 'Katalog Kosong'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      {searchQuery
                        ? `Tidak ada produk yang cocok dengan pencarian "${searchQuery}".`
                        : selectedCategoryId
                        ? 'Belum ada produk aktif dalam kategori yang dipilih.'
                        : 'Belum ada produk aktif yang tersedia untuk kasir.'}
                    </Text>
                    {(searchQuery || selectedCategoryId) ? (
                      <Button
                        title="Reset Filter"
                        variant="outline"
                        size="sm"
                        style={{ marginTop: theme.spacing.md }}
                        onPress={resetFilters}
                      />
                    ) : null}
                  </Card>
                )
              }
              renderItem={({ item }) => {
                const isOutOfStock = item.stock_tracking === 1 && item.current_stock <= 0;
                const isLowStock = item.stock_tracking === 1 && item.current_stock <= item.minimum_stock && item.current_stock > 0;
                
                const handlePress = () => {
                  if (isOutOfStock) return;
                  handleAddToCart(item);
                };

                if (posConfig.layout === 'list') {
                  return (
                    <TouchableOpacity 
                      onPress={handlePress}
                      disabled={isOutOfStock}
                      activeOpacity={0.7}
                      style={styles.productListWrapper}>
                      <Card style={[
                        styles.listCard,
                        {
                          padding: isTablet ? theme.spacing.md : theme.spacing.sm,
                          backgroundColor: isOutOfStock ? (isDark ? '#1E2430' : '#F8FAFC') : colors.surface,
                          borderColor: isOutOfStock ? (isDark ? '#334155' : '#E2E8F0') : colors.border,
                        },
                        isOutOfStock && styles.outOfStockCard
                      ]}>
                        <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                            <Text style={[styles.productNameList, { color: isOutOfStock ? colors.textMuted : colors.textPrimary }]} numberOfLines={2}>
                              {item.name}
                            </Text>
                            {isOutOfStock && <Badge label="HABIS" variant="error" />}
                          </View>
                          <Text style={[styles.productSKU, { color: colors.textMuted, marginTop: 2 }]}>
                            {item.sku || '-'}
                          </Text>
                          {posConfig.productDisplay?.showStock && (
                            <View style={styles.listStockRow}>
                              <Text style={{ ...theme.typography.caption, color: colors.textSecondary }}>
                                Stok: {item.stock_tracking === 1 ? item.current_stock : 'Tidak Dilacak'}
                              </Text>
                              {item.stock_tracking === 1 && (
                                <Text
                                  style={{
                                    ...theme.typography.caption,
                                    fontWeight: 'bold',
                                    color: isOutOfStock ? colors.error : isLowStock ? colors.warning : colors.success,
                                  }}
                                >
                                  {isOutOfStock ? '● Habis' : isLowStock ? '● Stok Menipis' : '● Stok Aman'}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
                          <Text
                            style={[styles.productListPrice, { color: isOutOfStock ? colors.textMuted : colors.primary }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {formatCurrency(item.selling_price)}
                          </Text>
                          <Button 
                            title={isOutOfStock ? "—" : "+"} 
                            variant={isOutOfStock ? "outline" : "primary"} 
                            disabled={isOutOfStock} 
                            onPress={handlePress}
                            style={{ minWidth: 44, minHeight: 38 }}
                          />
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                }

                // GRID MODE
                return (
                  <View style={[styles.gridItemWrapper, { maxWidth: isTablet ? '32.5%' : '49%' }]}>
                    <TouchableOpacity 
                      onPress={handlePress}
                      disabled={isOutOfStock}
                      activeOpacity={0.7}
                      style={{ flex: 1 }}>
                      <Card style={[
                        styles.gridCard,
                        {
                          padding: isTablet ? theme.spacing.md : theme.spacing.sm,
                          backgroundColor: isOutOfStock ? (isDark ? '#1E2430' : '#F8FAFC') : colors.surface,
                          borderColor: isOutOfStock ? (isDark ? '#334155' : '#E2E8F0') : colors.border,
                        },
                        isOutOfStock && styles.outOfStockCard,
                      ]}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={[styles.productSKU, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.sku || '-'}
                          </Text>
                          {isOutOfStock && <Badge label="HABIS" variant="error" />}
                        </View>
                        
                        <View style={styles.gridProductNameContainer}>
                          <Text
                            style={[
                              styles.gridProductName,
                              { color: isOutOfStock ? colors.textMuted : colors.textPrimary },
                            ]}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {item.name}
                          </Text>
                        </View>
                        
                        <View style={styles.gridCardBottom}>
                          <Text
                            style={[
                              styles.gridProductPrice,
                              { color: isOutOfStock ? colors.textMuted : colors.primary },
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                          >
                            {formatCurrency(item.selling_price)}
                          </Text>
                          
                          {posConfig.productDisplay?.showStock && (
                            <View style={styles.gridStockRow}>
                              <Text
                                style={[styles.gridStockLabel, { color: colors.textSecondary }]}
                                numberOfLines={1}
                              >
                                {item.stock_tracking === 1 ? `Stok: ${item.current_stock}` : 'Non-stok'}
                              </Text>
                              {item.stock_tracking === 1 && (
                                <Text
                                  style={[
                                    styles.gridStockStatus,
                                    {
                                      color: isOutOfStock
                                        ? colors.error
                                        : isLowStock
                                        ? colors.warning
                                        : colors.success,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {isOutOfStock ? '● Habis' : isLowStock ? '● Menipis' : '● Aman'}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
        </View>

        {isTablet && (
          <View style={styles.cartColumnTablet}>
            <Card style={styles.cartCard}>
              <View style={[styles.cartHeader, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.cartTitle, { color: colors.textPrimary }]}>Keranjang Belanja</Text>
                  <Text style={[styles.customerSubtext, { color: colors.textSecondary }]}>
                    {totals.totalItemCount} item di keranjang
                  </Text>
                </View>
                {cart.length > 0 && (
                  <TouchableOpacity onPress={handleClearCart}>
                    <Text style={{ ...theme.typography.caption, color: colors.error, fontWeight: '600' }}>Kosongkan</Text>
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={cart}
                keyExtractor={(item) => item.productId}
                ListEmptyComponent={
                  <View style={{ padding: theme.spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="pos" size={36} color={colors.textMuted} style={{ marginBottom: theme.spacing.sm }} />
                    <Text style={{ ...theme.typography.bodyMedium, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 }}>
                      Keranjang Kosong
                    </Text>
                    <Text style={{ ...theme.typography.caption, color: colors.textSecondary, textAlign: 'center' }}>
                      Pilih produk di katalog untuk ditambahkan ke kasir.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[styles.cartItemRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1, paddingRight: theme.spacing.xs }}>
                      <Text style={[styles.cartItemName, { color: colors.textPrimary }]} numberOfLines={2}>{item.productName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginVertical: 2 }}>
                        <Text style={[styles.cartItemPrice, { color: colors.textSecondary }]}>
                          {formatCurrency(item.unitPrice)} / {item.unit || 'pcs'}
                        </Text>
                        {item.activeTier ? (
                          <Badge label="Grosir" variant="accent" />
                        ) : null}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CartQuantityInput
                        quantity={item.quantity}
                        unit={item.unit}
                        isStockTracked={item.stockTracking !== false}
                        availableStock={item.availableStock}
                        onCommitQuantity={(newQty) => handleSetQuantity(item.productId, newQty)}
                        onIncrement={() => handleUpdateQuantity(item.productId, 1)}
                        onDecrement={() => handleUpdateQuantity(item.productId, -1)}
                        compact={true}
                      />
                      <Text style={[styles.cartItemTotal, { color: colors.textPrimary, minWidth: 65, textAlign: 'right' }]} numberOfLines={1}>
                        {formatCurrency(item.subtotal)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveItem(item.productId)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Hapus item"
                        style={{ padding: 4 }}>
                        <Icon name="close" size={14} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />

              <View style={{ padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatCurrency(totals.subtotal)}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => hasPermission('pos.apply_discount') && setIsDiscountModalOpen(true)}
                  style={[styles.discountRowTrigger, !hasPermission('pos.apply_discount') && { opacity: 0.7 }]}>
                  <Text style={[styles.discountTriggerLabel, { color: colors.accent }]}>
                    Diskon {discount.calculatedAmount > 0 ? `(${discount.type === 'PERCENT' ? `${discount.value}%` : 'Nominal'})` : ''}:
                  </Text>
                  <Text style={[styles.discountTriggerValue, { color: colors.success }]}>
                    {discount.calculatedAmount > 0 ? `- ${formatCurrency(discount.calculatedAmount)}` : '+ Tambah Diskon'}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>TOTAL</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(totals.grandTotal)}</Text>
                </View>

                <View style={styles.checkoutActions}>
                  {/* Row 1: Simpan Produk | Kosongkan */}
                  <View style={styles.tabletCartActionRow1}>
                    <Button
                      title="Simpan Produk"
                      variant="secondary"
                      size="md"
                      disabled={cart.length === 0}
                      onPress={handleHoldSale}
                      style={styles.tabletCartBtnHalf}
                      textStyle={styles.tabletCartBtnTextSm}
                    />
                    <Button
                      title="Kosongkan"
                      variant="danger"
                      size="md"
                      disabled={cart.length === 0}
                      onPress={handleClearCart}
                      style={styles.tabletCartBtnHalf}
                      textStyle={styles.tabletCartBtnTextSm}
                    />
                  </View>

                  {/* Row 2: Transaksi Tersimpan */}
                  <View style={styles.tabletCartActionRow2}>
                    <Button
                      title="Transaksi Tersimpan"
                      variant="outline"
                      size="md"
                      fullWidth
                      onPress={() => setIsDraftsModalOpen(true)}
                      style={styles.tabletCartBtnFull}
                      textStyle={styles.tabletCartBtnTextSm}
                    />
                  </View>

                  {/* Row 3: Bayar */}
                  <View style={styles.tabletCartActionRow3}>
                    <Button
                      title={`Bayar ${formatCurrency(totals.grandTotal)} ›`}
                      variant="success"
                      size="lg"
                      fullWidth
                      disabled={cart.length === 0}
                      onPress={handleStartCheckout}
                      style={styles.tabletCartBtnPay}
                    />
                  </View>
                </View>
              </View>
              </Card>
            </View>
          )}
        </View>

        {/* Mobile Phone Bottom Floating Cart Summary Bar */}
        {!isSplitView && cart.length > 0 && (
          <View style={[styles.phoneFloatingCartBar, { backgroundColor: isDark ? '#1E293B' : colors.primaryDark, borderColor: isDark ? colors.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
            <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
              <Text style={[styles.phoneCartBarTitle, { color: isDark ? colors.textSecondary : '#DBEAFE' }]} numberOfLines={1}>
                {totals.totalItemCount} Item dalam Keranjang
              </Text>
              <Text
                style={[styles.phoneCartBarTotal, { color: '#FFFFFF' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {formatCurrency(totals.grandTotal)}
              </Text>
            </View>
            <Button
              title="Lihat Keranjang ›"
              variant="accent"
              size="md"
              onPress={() => setIsPhoneCartOpen(true)}
            />
          </View>
        )}

        {/* Modals */}
        <DiscountModal
          visible={isDiscountModalOpen}
          subtotal={totals.subtotal}
          currentDiscount={discount}
          onClose={() => setIsDiscountModalOpen(false)}
          onApplyDiscount={setDiscount}
        />

        <CheckoutModal
          visible={isCheckoutModalOpen}
          cart={cart}
          totals={totals}
          customer={selectedCustomer}
          onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
          onClearCustomer={() => setSelectedCustomer(null)}
          onClose={() => setIsCheckoutModalOpen(false)}
          onCheckoutSuccess={handleCheckoutSuccess}
        />

        <PhoneCartSheet
          visible={isPhoneCartOpen}
          cart={cart}
          totals={totals}
          discount={discount}
          customer={selectedCustomer}
          onClose={() => setIsPhoneCartOpen(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onSetQuantity={handleSetQuantity}
          onRemoveItem={handleRemoveItem}
          onOpenDiscount={() => hasPermission('pos.apply_discount') && setIsDiscountModalOpen(true)}
          onClearCart={handleClearCart}
          onHoldSale={handleHoldSale}
          onOpenDrafts={() => {
            setIsPhoneCartOpen(false);
            setIsDraftsModalOpen(true);
          }}
          onCheckout={handleStartCheckout}
        />

        <TransactionSuccessModal
          visible={!!checkoutResult}
          result={checkoutResult}
          onFinish={() => setCheckoutResult(null)}
        />
      </ResponsiveContainer>
      <PhysicalBarcodeScannerReceiver
        onScan={handleBarcodeScan}
        enabled={
          isScreenFocused &&
          !scannerVisible &&
          !isCheckoutModalOpen &&
          !isDiscountModalOpen &&
          !isDraftsModalOpen &&
          !isCustomerModalOpen &&
          !isPhoneCartOpen &&
          !checkoutResult
        }
        isManualInputFocused={isSearchFocused}
      />
      <BarcodeScannerModal visible={scannerVisible} onScan={handleBarcodeScan} onClose={() => setScannerVisible(false)} />
      <DraftListModal visible={isDraftsModalOpen} onResume={handleResumeDraft} onClose={() => setIsDraftsModalOpen(false)} />
      <CustomerSelectorModal visible={isCustomerModalOpen} customers={customers} selectedCustomer={selectedCustomer} onSelect={setSelectedCustomer} onClose={() => setIsCustomerModalOpen(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabletSplitView: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    flex: 1,
  },
  phoneStackView: {
    flexDirection: 'column',
    flex: 1,
  },
  catalogColumnTablet: {
    flex: 1.4,
  },
  cartColumnTablet: {
    flex: 1,
  },
  fullColumn: {
    width: '100%', flex: 1,
  },
  searchInputContainer: {
    marginBottom: theme.spacing.xs,
    width: '100%',
  },
  categoryContainer: {
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    flexShrink: 0,
    marginBottom: theme.spacing.xs,
    justifyContent: 'center',
  },
  categoryScroll: {
    flexGrow: 0,
    height: 36,
  },
  categoryScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: theme.spacing.xs,
  },
  categoryChip: {
    height: 32,
    minWidth: 54,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  categoryChipTextActive: {
    color: theme.colors.textInverse,
  },
  categoryChipTextInactive: {
    color: theme.colors.textPrimary,
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
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  catalogScroll: {
    flex: 1,
  },

  productList: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  productListWrapper: {
    marginBottom: theme.spacing.sm,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.md,
  },
  productNameList: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    flexShrink: 1,
  },
  listStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  productListPrice: {
    ...theme.typography.bodyLarge,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  productCardList: {
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  gridItemWrapper: {
    flex: 1,
  },
  gridCard: {
    flex: 1,
    minHeight: 136,
    borderRadius: theme.radius.md,
    justifyContent: 'space-between',
  },
  gridProductNameContainer: {
    height: 38,
    justifyContent: 'center',
    marginVertical: 2,
  },
  gridProductName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  gridCardBottom: {
    marginTop: 'auto',
    paddingTop: 4,
  },
  gridProductPrice: {
    ...theme.typography.priceSmall,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  gridStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  gridStockLabel: {
    ...theme.typography.caption,
    fontSize: 11,
  },
  gridStockStatus: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  productCard: {
    width: '48%',
    minWidth: 140,
    marginBottom: theme.spacing.xs,
  },
  outOfStockCard: {
    // Whole-card opacity removed so badges, warnings, and text remain crisp and legible
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productSKU: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  productName: {
    ...theme.typography.header3,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginVertical: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  productPrice: {
    ...theme.typography.price,
    fontSize: 13,
    color: theme.colors.primary,
  },
  stockText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  outOfStockText: {
    color: theme.colors.error,
    fontWeight: '700',
  },
  cartCard: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  cartTitle: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  customerSubtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  emptyCartBox: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCartTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyCartSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  cartItemsScroll: {
    flex: 1,
    marginBottom: theme.spacing.md,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  cartItemName: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cartItemPrice: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  cartQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: theme.spacing.xs,
  },
  cartQtyBtn: {
    width: 26,
    height: 26,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyBtnDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  cartQtyBtnText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  cartQtyText: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    minWidth: 18,
    textAlign: 'center',
  },
  cartItemTotal: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  summaryLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  discountRowTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  discountTriggerLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  discountTriggerValue: {
    ...theme.typography.bodySmall,
    color: theme.colors.success,
    fontWeight: '700',
  },
  totalRow: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    ...theme.typography.priceLarge,
    color: theme.colors.primary,
  },
  checkoutActions: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tabletCartActionRow1: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
  tabletCartBtnHalf: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: theme.spacing.xs,
  },
  tabletCartActionRow2: {
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
  tabletCartBtnFull: {
    width: '100%',
    minHeight: 40,
    paddingHorizontal: theme.spacing.xs,
  },
  tabletCartActionRow3: {
    width: '100%',
  },
  tabletCartBtnPay: {
    width: '100%',
    minHeight: 46,
  },
  tabletCartBtnTextSm: {
    fontSize: 13,
    fontWeight: '600',
  },
  phoneFloatingCartBar: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    elevation: 6,
    ...theme.shadows.lg,
  },
  phoneCartBarTitle: {
    ...theme.typography.caption,
    color: '#DBEAFE',
    fontWeight: '500',
  },
  phoneCartBarTotal: {
    ...theme.typography.header2,
    color: theme.colors.textInverse,
  },
});
