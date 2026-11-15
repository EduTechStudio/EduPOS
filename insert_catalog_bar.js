const fs = require('fs');
let lines = fs.readFileSync('src/app/pos.tsx', 'utf-8').split('\n');

const newCode = `            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Button title="Transaksi Tersimpan" variant="outline" size="sm" onPress={() => setIsDraftsModalOpen(true)} style={{ flex: 1 }} />
            </View>`;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('containerStyle={{ marginBottom: theme.spacing.sm }}')) {
    // skip the next line which is "/>"
    lines.splice(i + 2, 0, newCode);
    break;
  }
}

fs.writeFileSync('src/app/pos.tsx', lines.join('\n'));
