const fs = require('fs');
let code = fs.readFileSync('src/app/customers.tsx', 'utf-8');

if (!code.includes("useAuth")) {
  code = code.replace(
    "import { theme } from '@/theme';",
    "import { theme } from '@/theme';\nimport { useAuth } from '@/context/AuthContext';"
  );
  
  code = code.replace(
    "export default function CustomersScreen() {",
    "export default function CustomersScreen() {\n  const { hasPermission } = useAuth();"
  );
  
  code = code.replace(
    "const [customers, setCustomers] = useState<CustomerEntity[]>([]);",
    "const [customers, setCustomers] = useState<CustomerEntity[]>([]);\n  if (!hasPermission('customer.view')) {\n    return (\n      <ScreenContainer>\n        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>\n          <Text style={{...theme.typography.header3, color: theme.colors.error}}>Akses Ditolak</Text>\n        </View>\n      </ScreenContainer>\n    );\n  }"
  );

  code = code.replace(
    /rightElement=\{<Button title="\+ Add Customer"[\s\S]*?\/>\}/,
    "rightElement={hasPermission('customer.create') ? <Button title=\"+ Add Customer\" variant=\"primary\" size=\"sm\" onPress={() => handleOpenModal()} /> : undefined}"
  );
  
  code = code.replace(
    /<Button title="Edit"[\s\S]*?\/>/,
    "{hasPermission('customer.edit') && $&}"
  );
  
  code = code.replace(
    /<Button title="Delete"[\s\S]*?\/>/,
    "{hasPermission('customer.delete') && $&}"
  );

  fs.writeFileSync('src/app/customers.tsx', code);
}
