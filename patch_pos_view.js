const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');

if (!code.includes("if (!hasPermission('pos.view')) {")) {
  code = code.replace(
    "const [posConfig, setPosConfig] = useState(defaultPOSConfig);",
    "const [posConfig, setPosConfig] = useState(defaultPOSConfig);\n  \n  if (!hasPermission('pos.view')) {\n    return (\n      <ScreenContainer>\n        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>\n          <Text style={{...theme.typography.header3, color: theme.colors.error}}>Akses Ditolak</Text>\n        </View>\n      </ScreenContainer>\n    );\n  }"
  );

  fs.writeFileSync('src/app/pos.tsx', code);
}
