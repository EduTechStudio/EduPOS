const fs = require('fs');
let code = fs.readFileSync('src/app/products.tsx', 'utf-8');

if (!code.includes("useAuth")) {
  code = code.replace(
    "import { useResponsive } from '@/hooks/useResponsive';",
    "import { useResponsive } from '@/hooks/useResponsive';\nimport { useAuth } from '@/context/AuthContext';"
  );
  
  code = code.replace(
    "export default function ProductsScreen() {",
    "export default function ProductsScreen() {\n  const { hasPermission } = useAuth();"
  );
  
  // Guard the route
  code = code.replace(
    "const { isTablet } = useResponsive();",
    "const { isTablet } = useResponsive();\n  \n  if (!hasPermission('product.view')) {\n    return (\n      <ScreenContainer>\n        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>\n          <Text style={{...theme.typography.header3, color: theme.colors.error}}>Akses Ditolak</Text>\n          <Text style={{...theme.typography.body}}>Anda tidak memiliki izin melihat produk.</Text>\n        </View>\n      </ScreenContainer>\n    );\n  }"
  );

  // Hide Create button
  code = code.replace(
    /<Button\s+title="\+ Tambah Produk"/g,
    "{hasPermission('product.create') && <Button title=\"+ Tambah Produk\""
  );
  code = code.replace(
    /onPress={handleOpenAddProduct}\s+\/>/g,
    "onPress={handleOpenAddProduct} />}"
  );

  fs.writeFileSync('src/app/products.tsx', code);
}
