const fs = require('fs');
let code = fs.readFileSync('src/app/settings/users-permissions.tsx', 'utf-8');

if (!code.includes("if (!hasPermission('user.view')) {")) {
  code = code.replace(
    "const [users, setUsers] = useState<UserEntity[]>([]);",
    "const [users, setUsers] = useState<UserEntity[]>([]);\n\n  if (!hasPermission('user.view')) {\n    return (\n      <ScreenContainer>\n        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>\n          <Text style={{fontSize: 24, fontWeight: 'bold', color: 'red'}}>Akses Ditolak</Text>\n        </View>\n      </ScreenContainer>\n    );\n  }"
  );

  fs.writeFileSync('src/app/settings/users-permissions.tsx', code);
}
