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

code = code.replace(
  /rightIcon=\{<TouchableOpacity[\s\S]*?opacity: 0\.7 \]\}>/,
  correctReplacement
);

fs.writeFileSync('src/app/pos.tsx', code);
