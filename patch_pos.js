const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');

const targetBlock = `            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              numColumns={isTablet ? 3 : 2}
              renderItem={({ item }) => (
                <View style={{ flex: 1, padding: 4 }}>
                  <TouchableOpacity 
                    onPress={() => handleAddToCart(item)}
                    style={styles.productCard}>
                    <Card style={{ flex: 1, padding: 8 }}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productPrice}>{formatCurrency(item.selling_price)}</Text>
                    </Card>
                  </TouchableOpacity>
                </View>
              )}
            />`;

const newBlock = `            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              numColumns={isTablet ? 3 : 2}
              renderItem={({ item }) => {
                const isOutOfStock = item.stock_tracking === 1 && item.current_stock <= 0;
                const isLowStock = item.stock_tracking === 1 && item.current_stock <= item.minimum_stock && item.current_stock > 0;
                return (
                <View style={{ flex: 1, padding: 4 }}>
                  <TouchableOpacity 
                    onPress={() => handleAddToCart(item)}
                    style={styles.productCard}>
                    <Card style={{ flex: 1, padding: 8 }}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.productPrice}>{formatCurrency(item.selling_price)}</Text>
                      {posConfig.productDisplay?.showStock && (
                        <View style={{ marginTop: 4 }}>
                          <Text style={{ ...theme.typography.caption, color: theme.colors.textPrimary }}>
                            Stok: {item.stock_tracking === 1 ? item.current_stock : 'Tidak Dilacak'}
                          </Text>
                          {item.stock_tracking === 1 && (
                            isOutOfStock ? (
                              <Text style={{ ...theme.typography.caption, color: theme.colors.error }}>
                                ● Stok Habis
                              </Text>
                            ) : isLowStock ? (
                              <Text style={{ ...theme.typography.caption, color: theme.colors.warning }}>
                                ⚠ Stok Menipis
                              </Text>
                            ) : (
                              <Text style={{ ...theme.typography.caption, color: theme.colors.success }}>
                                ● Stok Aman
                              </Text>
                            )
                          )}
                        </View>
                      )}
                    </Card>
                  </TouchableOpacity>
                </View>
              )}}
            />`;

if (code.includes(targetBlock)) {
    code = code.replace(targetBlock, newBlock);
    fs.writeFileSync('src/app/pos.tsx', code);
    console.log("Patched pos.tsx successfully.");
} else {
    console.error("Target block not found in pos.tsx!");
}
