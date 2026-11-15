const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');

const correctReplacement = `              rightIcon={
                searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text>✕</Text>
                  </TouchableOpacity>
                ) : undefined
              }
            />

            <FlatList
              data={filteredProducts}
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
            />
          </Card>
        </View>

        {isTablet ? (
          <View style={styles.cartColumnTablet}>
            <Card style={styles.cartCard}>
              <View style={styles.cartHeader}>
                <Text style={styles.cartTitle}>Keranjang ({cart.length})</Text>
                {cart.length > 0 && (
                  <TouchableOpacity onPress={handleClearCart}>
                    <Text style={{color: 'red'}}>Kosongkan</Text>
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={cart}
                keyExtractor={(item) => item.productId}
                renderItem={({ item }) => (
                  <View style={styles.cartItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{item.productName}</Text>
                      <Text style={styles.cartItemPrice}>{item.quantity} x {formatCurrency(item.unitPrice)}</Text>
                    </View>
                    <Text style={styles.cartItemTotal}>{formatCurrency(item.subtotal)}</Text>
                  </View>
                )}
              />

              <View style={styles.cartFooter}>
                <TouchableOpacity
                  onPress={() => hasPermission('pos.apply_discount') && setIsDiscountModalOpen(true)}
                  style={[styles.discountRowTrigger, !hasPermission('pos.apply_discount') && { opacity: 0.7 }]}>`;

const startIdx = code.indexOf('rightIcon={<TouchableOpacity');
const endMarker = "!hasPermission('pos.apply_discount') && { opacity: 0.7 }]}>";
const endIdx = code.indexOf(endMarker) + endMarker.length;

if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
  const before = code.substring(0, startIdx);
  const after = code.substring(endIdx);
  fs.writeFileSync('src/app/pos.tsx', before + correctReplacement + after);
}
