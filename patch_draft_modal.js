const fs = require('fs');
let code = fs.readFileSync('src/components/pos/DraftListModal.tsx', 'utf-8');

if (!code.includes("useAuth")) {
  code = code.replace(
    "import { theme } from '@/theme';",
    "import { theme } from '@/theme';\nimport { useAuth } from '@/context/AuthContext';"
  );
  
  code = code.replace(
    "export function DraftListModal({ visible, onClose, onResume }: DraftListModalProps) {",
    "export function DraftListModal({ visible, onClose, onResume }: DraftListModalProps) {\n  const { hasPermission } = useAuth();"
  );
  
  code = code.replace(
    /<Button title="Batalkan"[\s\S]*?\/>/,
    "{hasPermission('draft.cancel') && $&}"
  );
  
  code = code.replace(
    /<Button title="Lanjutkan"[\s\S]*?\/>/,
    "{hasPermission('draft.resume') && $&}"
  );

  fs.writeFileSync('src/components/pos/DraftListModal.tsx', code);
}
