const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');

const targetBlockStart = `<FlatList`;
const targetBlockEnd = `/>`;

let startIndex = code.indexOf(targetBlockStart);
let endIndex = code.indexOf(targetBlockEnd, startIndex) + targetBlockEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const oldBlock = code.substring(startIndex, endIndex);

    const newBlock = `<FlatList
              data={products}
              keyExtractor={(item) => item.id}
              numColumns={posConfig.layout === 'list' ? 1 : (isTablet ? 3 : 2)}
              key={posConfig.layout === 'list' ? 'list' : (isTablet ? 'grid-3' : 'grid-2')}
              contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
              columnWrapperStyle={posConfig.layout !== 'list' ? { gap: theme.spacing.sm, marginBottom: theme.spacing.sm } : undefined}
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
                      style={{ marginBottom: theme.spacing.sm }}>
                      <Card style={[
                        { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: theme.spacing.md },
                        isOutOfStock && styles.outOfStockCard
                      ]}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                            <Text style={styles.productName}>{item.name}</Text>
                            {isOutOfStock && <Badge label="HABIS" variant="error" size="sm" />}
                          </View>
                          {posConfig.productDisplay?.showStock && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: theme.spacing.sm }}>
                              <Text style={{ ...theme.typography.caption, color: theme.colors.textPrimary }}>
                                Stok: {item.stock_tracking === 1 ? item.current_stock : 'Tidak Dilacak'}
                              </Text>
                              {item.stock_tracking === 1 && (
                                isOutOfStock ? (
                                  <Text style={{ ...theme.typography.caption, color: theme.colors.error, fontWeight: 'bold' }}>
                                    ● Habis
                                  </Text>
                                ) : isLowStock ? (
                                  <Text style={{ ...theme.typography.caption, color: theme.colors.warning, fontWeight: 'bold' }}>
                                    ● Stok Menipis
                                  </Text>
                                ) : (
                                  <Text style={{ ...theme.typography.caption, color: theme.colors.success, fontWeight: 'bold' }}>
                                    ● Stok Aman
                                  </Text>
                                )
                              )}
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                          <Text style={{ ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 8 }}>
                            {formatCurrency(item.selling_price)}
                          </Text>
                          <Button 
                            title={isOutOfStock ? "—" : "+"} 
                            variant={isOutOfStock ? "outline" : "primary"} 
                            size="sm" 
                            disabled={isOutOfStock} 
                            onPress={handlePress}
                            style={{ minWidth: 40 }}
                          />
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                }

                // GRID MODE
                return (
                  <View style={{ flex: 1, minWidth: isTablet ? '30%' : '45%' }}>
                    <TouchableOpacity 
                      onPress={handlePress}
                      disabled={isOutOfStock}
                      style={{ flex: 1 }}>
                      <Card style={[{ flex: 1, padding: theme.spacing.md }, isOutOfStock && styles.outOfStockCard]}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.productSKU}>{item.sku || '-'}</Text>
                          {isOutOfStock && <Badge label="HABIS" variant="error" size="sm" />}
                        </View>
                        
                        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                        
                        <Text style={{ ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.primary, marginVertical: theme.spacing.xs }}>
                          {formatCurrency(item.selling_price)}
                        </Text>
                        
                        {posConfig.productDisplay?.showStock && (
                          <View style={{ marginTop: theme.spacing.xs }}>
                            <Text style={{ ...theme.typography.caption, color: theme.colors.textPrimary }}>
                              Stok: {item.stock_tracking === 1 ? item.current_stock : 'Tidak Dilacak'}
                            </Text>
                            {item.stock_tracking === 1 && (
                              isOutOfStock ? (
                                <Text style={{ ...theme.typography.caption, color: theme.colors.error, fontWeight: 'bold' }}>
                                  ● Habis
                                </Text>
                              ) : isLowStock ? (
                                <Text style={{ ...theme.typography.caption, color: theme.colors.warning, fontWeight: 'bold' }}>
                                  ● Stok Menipis
                                </Text>
                              ) : (
                                <Text style={{ ...theme.typography.caption, color: theme.colors.success, fontWeight: 'bold' }}>
                                  ● Stok Aman
                                </Text>
                              )
                            )}
                          </View>
                        )}
                      </Card>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />`;

    code = code.substring(0, startIndex) + newBlock + code.substring(endIndex);
    fs.writeFileSync('src/app/pos.tsx', code);
    console.log("Replaced FlatList logic in pos.tsx successfully.");
} else {
    console.error("FlatList block not found!");
}
