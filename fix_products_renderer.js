const fs = require('fs');
let code = fs.readFileSync('src/app/products.tsx', 'utf-8');

const oldBlock = `                          <View style={styles.stockRow}>
                            <Text style={[styles.stockText, isOutOfStock ? { color: theme.colors.error } : isLowStock ? styles.warningText : {}]}>
                              Stok: {prod.current_stock} {prod.unit}
                            </Text>
                            {isOutOfStock ? (
                              <Text style={[styles.stockText, { color: theme.colors.error }]}>
                                ● Stok Habis
                              </Text>
                            ) : isLowStock ? (
                              <Text style={[styles.stockText, { color: theme.colors.warning }]}>
                                ⚠ Stok Menipis
                              </Text>
                            ) : (
                              <Text style={[styles.stockText, { color: theme.colors.success }]}>
                                ● Stok Aman
                              </Text>
                            )}
                          </View>`;

const newBlock = `                          <View style={styles.stockRow}>
                            <Text style={styles.stockText}>
                              Stok: {prod.stock_tracking === 1 ? prod.current_stock : 'Tidak Dilacak'}
                            </Text>
                            {prod.stock_tracking === 1 ? (
                              isOutOfStock ? (
                                <Text style={[styles.stockText, { color: theme.colors.error }]}>
                                  ● Stok Habis
                                </Text>
                              ) : isLowStock ? (
                                <Text style={[styles.stockText, { color: theme.colors.warning }]}>
                                  ⚠ Stok Menipis
                                </Text>
                              ) : (
                                <Text style={[styles.stockText, { color: theme.colors.success }]}>
                                  ● Stok Aman
                                </Text>
                              )
                            ) : null}
                          </View>`;

if(code.includes(oldBlock)) {
    code = code.replace(oldBlock, newBlock);
} else {
    console.error("Old block not found!");
}

// Remove the STOCK UI TEST
code = code.replace(/\{prod\.name\} STOCK UI TEST STOCK UI TEST/g, '{prod.name}');

fs.writeFileSync('src/app/products.tsx', code);
