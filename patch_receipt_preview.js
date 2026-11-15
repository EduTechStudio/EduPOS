const fs = require('fs');
let content = fs.readFileSync('src/components/receipt/ReceiptPreview.tsx', 'utf-8');

// The original renders address/phone if they exist. We need to respect the new toggles.
// Original:
// {receiptData.store.address ? <Text style={styles.storeDetail}>{receiptData.store.address}</Text> : null}
// {receiptData.store.phone ? <Text style={styles.storeDetail}>{receiptData.store.phone}</Text> : null}

// If showLogo is enabled and there is a logo, we render it (just an Image, or text placeholder).
content = content.replace("import { View, Text, StyleSheet, ScrollView } from 'react-native';", "import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';");

content = content.replace(
  "{receiptData.store.address ? <Text style={styles.storeDetail}>{receiptData.store.address}</Text> : null}",
  "{(receiptData.config.showStoreAddress !== false && receiptData.store.address) ? <Text style={styles.storeDetail}>{receiptData.store.address}</Text> : null}"
);

content = content.replace(
  "{receiptData.store.phone ? <Text style={styles.storeDetail}>{receiptData.store.phone}</Text> : null}",
  "{(receiptData.config.showStorePhone !== false && receiptData.store.phone) ? <Text style={styles.storeDetail}>{receiptData.store.phone}</Text> : null}"
);

const logoCode = `
          <View style={styles.header}>
            {(receiptData.config.showLogo !== false && receiptData.config.logo) && (
              <Image source={{ uri: receiptData.config.logo }} style={{ width: 80, height: 80, resizeMode: 'contain', alignSelf: 'center', marginBottom: 8 }} />
            )}
`;
content = content.replace("<View style={styles.header}>", logoCode);

fs.writeFileSync('src/components/receipt/ReceiptPreview.tsx', content);
