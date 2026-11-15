const fs = require('fs');

const files = ['src/components/users/AddUserModal.tsx', 'src/components/users/EditUserModal.tsx'];
for (const file of files) {
  let code = fs.readFileSync(file, 'utf-8');
  code = code.replace(/} catch \(e: any\) {\n\s*Alert\.alert\('Error', e\.message \|\| 'Gagal ([^']+)'\);\n\s*}/g, "} catch (e: any) {\n      console.error('[Users] Failed to $1', e);\n      Alert.alert('Error', e.message || 'Gagal $1');\n    }");
  fs.writeFileSync(file, code);
}
