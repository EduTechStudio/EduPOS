const fs = require('fs');
let code = fs.readFileSync('src/components/pos/DraftListModal.tsx', 'utf-8');
code = code.replace(
  "export function DraftListModal({ visible, onResume, onClose }: DraftListModalProps) {",
  "export function DraftListModal({ visible, onResume, onClose }: DraftListModalProps) {\n  const { hasPermission } = useAuth();"
);
fs.writeFileSync('src/components/pos/DraftListModal.tsx', code);
