const fs = require('fs');
let code = fs.readFileSync('src/app/settings/store-profile.tsx', 'utf-8');

const targetBlock = `            <View style={[styles.fieldGroup, { zIndex: 9 }]}>
              <Select
                label="Product Display"`;

const newBlock = `            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.label}>Tampilkan Stok Produk</Text>
                  <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>
                    Tampilkan jumlah stok pada kartu produk di POS Register.
                  </Text>
                </View>
                <Switch
                  value={posConfig.productDisplay?.showStock ?? false}
                  onValueChange={(val) => setPosConfig({
                    ...posConfig,
                    productDisplay: { ...(posConfig.productDisplay || {}), showStock: val }
                  })}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { zIndex: 9 }]}>
              <Select
                label="Product Display"`;

if (code.includes(targetBlock)) {
    code = code.replace(targetBlock, newBlock);
    fs.writeFileSync('src/app/settings/store-profile.tsx', code);
    console.log("Patched store-profile.tsx successfully.");
} else {
    console.error("Target block not found in store-profile.tsx!");
}
