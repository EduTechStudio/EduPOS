const fs = require('fs');
const glob = require('glob'); // Not available, let's just manually list them

const files = [
  'src/app/_layout.tsx',
  'src/app/settings/users-permissions.tsx',
  'src/components/auth/LoginScreen.tsx',
  'src/components/users/AddUserModal.tsx',
  'src/components/users/EditUserModal.tsx',
  'src/components/users/ChangePinModal.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf-8');
    code = code.replace(/theme\.colors\.text\b/g, 'theme.colors.textPrimary');
    code = code.replace(/theme\.typography\.body\b/g, 'theme.typography.bodyMedium');
    
    // Icon replacements
    if (file.includes('LoginScreen.tsx')) {
      code = code.replace('name="backspace"', 'name="close"');
      code = code.replace('name="login"', 'name="check"');
    }
    
    fs.writeFileSync(file, code);
  }
}
