const fs = require('fs');
let code = fs.readFileSync('src/app/index.tsx', 'utf-8');

if (!code.includes("useAuth")) {
  code = code.replace(
    "import { theme } from '@/theme';",
    "import { theme } from '@/theme';\nimport { useAuth } from '@/context/AuthContext';"
  );
  
  code = code.replace(
    "export default function DashboardScreen() {",
    "export default function DashboardScreen() {\n  const { hasPermission } = useAuth();"
  );
  
  code = code.replace(
    "const [reportData, setReportData] = useState<DailyReportData | null>(null);",
    "const [reportData, setReportData] = useState<DailyReportData | null>(null);\n\n  if (!hasPermission('dashboard.view')) {\n    return (\n      <ScreenContainer>\n        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>\n          <Text style={{...theme.typography.header3, color: theme.colors.error}}>Akses Ditolak</Text>\n        </View>\n      </ScreenContainer>\n    );\n  }"
  );

  fs.writeFileSync('src/app/index.tsx', code);
}
