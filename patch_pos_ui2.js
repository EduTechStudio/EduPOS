const fs = require('fs');
let pos = fs.readFileSync('src/app/pos.tsx', 'utf-8');

// 1. Add "Transaksi Tersimpan" below search bar
const catalogBar = `
            <Input
              placeholder="Cari produk (Nama, SKU, Barcode)..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<Text>🔍</Text>}
              rightIcon={<TouchableOpacity onPress={() => setScannerVisible(true)}><Icon name="camera" size={20} color={theme.colors.primary} /></TouchableOpacity>}
              containerStyle={{ marginBottom: theme.spacing.sm }}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
              <Button title="Transaksi Tersimpan" variant="outline" size="sm" onPress={() => setIsDraftsModalOpen(true)} style={{ flex: 1 }} />
            </View>
`;
pos = pos.replace(/<Input\s+placeholder="Cari produk[^>]+>\s*<\/TouchableOpacity>\}[\s\S]+?containerStyle=\{\{ marginBottom: theme\.spacing\.sm \}\}\s*\/>/m, catalogBar);

// 2. We already updated the tablet checkoutActions in a previous step, but let's make sure it's clean and safe.
const tabletEmptyCart = `<View style={styles.emptyCartBox}>
                    <Text style={styles.emptyCartTitle}>Keranjang Kosong</Text>
                    <Text style={styles.emptyCartSubtitle}>Pilih produk untuk mulai transaksi.</Text>
                  </View>`;
const tabletEmptyCartNew = `<View style={styles.emptyCartBox}>
                    <Text style={styles.emptyCartTitle}>Keranjang Kosong</Text>
                    <Text style={styles.emptyCartSubtitle}>Pilih produk untuk mulai transaksi.</Text>
                    <Button title="Transaksi Tersimpan" variant="outline" size="sm" onPress={() => setIsDraftsModalOpen(true)} style={{ marginTop: 16 }} />
                  </View>`;
pos = pos.replace(tabletEmptyCart, tabletEmptyCartNew);

fs.writeFileSync('src/app/pos.tsx', pos);
