const fs = require('fs');
let lines = fs.readFileSync('src/app/pos.tsx', 'utf-8');

const oldBar = `<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
              <Button title="Transaksi Tersimpan" variant="outline" size="sm" onPress={() => setIsDraftsModalOpen(true)} style={{ flex: 1 }} />
              <Button title="Simpan Draft" variant="secondary" size="sm" disabled={cart.length === 0} onPress={handleHoldSale} style={{ flex: 1 }} />
            </View>`;
            
const newBar = `{!isSplitView && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
                <Button title="Transaksi Tersimpan" variant="outline" size="sm" onPress={() => setIsDraftsModalOpen(true)} style={{ flex: 1 }} />
                <Button title="Simpan Draft" variant="secondary" size="sm" disabled={cart.length === 0} onPress={handleHoldSale} style={{ flex: 1 }} />
              </View>
            )}`;

lines = lines.replace(oldBar, newBar);

fs.writeFileSync('src/app/pos.tsx', lines);
