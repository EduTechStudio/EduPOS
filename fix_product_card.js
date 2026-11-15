const fs = require('fs');
let code = fs.readFileSync('src/app/products.tsx', 'utf-8');

// Replace the stock badge logic with text dots
code = code.replace(
  "                            {isOutOfStock ? (\n                              <Badge label=\"STOK HABIS\" variant=\"error\" />\n                            ) : isLowStock ? (\n                              <Badge label=\"MENIPIS\" variant=\"warning\" />\n                            ) : null}",
  `                            {isOutOfStock ? (
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
                            )}`
);

// I should also fix the Icon line that uses isLowStock
code = code.replace(
  "                            <Text style={[styles.stockText, isLowStock && styles.warningText]}>\n                              Stok: {prod.current_stock} {prod.unit}\n                            </Text>",
  `                            <Text style={[styles.stockText, isOutOfStock ? { color: theme.colors.error } : isLowStock ? styles.warningText : {}]}>
                              Stok: {prod.current_stock} {prod.unit}
                            </Text>`
);

// We need to fix the Icon too, if it exists
code = code.replace(
  "<Icon name=\"package\" size={14} color={isLowStock ? theme.colors.warning : theme.colors.textSecondary} />",
  "<Icon name=\"package\" size={14} color={isOutOfStock ? theme.colors.error : isLowStock ? theme.colors.warning : theme.colors.success} />"
);

fs.writeFileSync('src/app/products.tsx', code);
