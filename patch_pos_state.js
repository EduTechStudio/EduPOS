const fs = require('fs');
let content = fs.readFileSync('src/app/pos.tsx', 'utf-8');

content = content.replace(
  "const [scannerVisible, setScannerVisible] = useState(false);",
  "const [scannerVisible, setScannerVisible] = useState(false);\n  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);"
);
fs.writeFileSync('src/app/pos.tsx', content);
