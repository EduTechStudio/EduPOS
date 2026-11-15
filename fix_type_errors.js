const fs = require('fs');
let modal = fs.readFileSync('src/components/pos/DraftListModal.tsx', 'utf-8');
modal = modal.replace(
  "await draftService.cancelDraft(draft.id, { userId: 'cashier_ui' });",
  "await draftService.cancelDraft(draft.id);"
);
fs.writeFileSync('src/components/pos/DraftListModal.tsx', modal);

let checkout = fs.readFileSync('src/services/checkout/CheckoutService.ts', 'utf-8');
checkout = checkout.replace(
  "private _ensureUser(inputCashierId?: string) {",
  "private _ensureUser(inputCashierId?: string | null) {"
);
checkout = checkout.replace(
  "const id = inputCashierId || authorizationService.getCurrentUser()?.id;",
  "const id = inputCashierId || authorizationService.getCurrentUser()?.id;\n    if (id === null) throw new Error('Authentication required for checkout');"
);
fs.writeFileSync('src/services/checkout/CheckoutService.ts', checkout);
