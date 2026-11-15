const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');
if (!code.includes("FlatList,")) {
  code = code.replace(
    "  Alert,\n} from 'react-native';",
    "  Alert,\n  FlatList,\n} from 'react-native';"
  );
  fs.writeFileSync('src/app/pos.tsx', code);
}
