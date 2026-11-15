const fs = require('fs');
let code = fs.readFileSync('src/components/layout/SectionHeader.tsx', 'utf-8');

code = code.replace(
  "import { Icon } from '@/components/ui/Icon';",
  "import { Icon, IconName } from '@/components/ui/Icon';"
);
code = code.replace(
  "action?: { icon: string; label: string; onPress: () => void; };",
  "action?: { icon: IconName; label: string; onPress: () => void; };"
);

fs.writeFileSync('src/components/layout/SectionHeader.tsx', code);
