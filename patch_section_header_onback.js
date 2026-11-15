const fs = require('fs');

const files = [
  'store-profile.tsx',
  'pos-configuration.tsx',
  'receipt-printer.tsx',
  'payment-methods.tsx',
  'users-permissions.tsx',
  'system-configuration.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync('src/app/settings/' + file, 'utf-8');
  content = content.replace(/<SectionHeader\s+title="([^"]+)"\s+subtitle="([^"]+)"/, '<SectionHeader\n          title="$1"\n          subtitle="$2"\n          onBack={() => router.back()}');
  fs.writeFileSync('src/app/settings/' + file, content);
});
