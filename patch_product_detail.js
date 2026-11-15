const fs = require('fs');
let code = fs.readFileSync('src/components/product/ProductDetailModal.tsx', 'utf-8');

if (!code.includes("useAuth")) {
  code = code.replace(
    "import { Icon } from '@/components/ui/Icon';",
    "import { Icon } from '@/components/ui/Icon';\nimport { useAuth } from '@/context/AuthContext';"
  );
  
  code = code.replace(
    "export function ProductDetailModal({",
    "export function ProductDetailModal({\n"
  );
  
  code = code.replace(
    "  const [movements, setMovements] = useState<StockMovementEntity[]>([]);",
    "  const { hasPermission } = useAuth();\n  const [movements, setMovements] = useState<StockMovementEntity[]>([]);"
  );
  
  code = code.replace(
    /<Button\s+title=\{product\.is_active === 1 \? 'Deaktivasi Produk' \: 'Aktivasi Produk'\}([\s\S]*?)onPress=\{onToggleActive\}\s+\/>/g,
    "{hasPermission('product.edit') && $&}"
  );
  
  code = code.replace(
    /<Button title="Penyesuaian Stok"[\s\S]*?\/>/g,
    "{hasPermission('product.stock_adjust') && $&}"
  );
  
  code = code.replace(
    /<Button title="Edit Produk"[\s\S]*?\/>/g,
    "{hasPermission('product.edit') && $&}"
  );

  fs.writeFileSync('src/components/product/ProductDetailModal.tsx', code);
}
