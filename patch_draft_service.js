const fs = require('fs');
let code = fs.readFileSync('src/services/pos/DraftService.ts', 'utf-8');

if (!code.includes("requirePermission('draft.create')")) {
  code = code.replace(
    "async saveDraft(cartItems: CartItem[], customerId: string | null, discountType: 'FIXED' | 'PERCENTAGE', discountValue: number, notes?: string): Promise<string> {",
    "async saveDraft(cartItems: CartItem[], customerId: string | null, discountType: 'FIXED' | 'PERCENTAGE', discountValue: number, notes?: string): Promise<string> {\n    authorizationService.requirePermission('draft.create');"
  );
  
  code = code.replace(
    "async resumeDraft(draftId: string): Promise<DraftSaleDetail> {",
    "async resumeDraft(draftId: string): Promise<DraftSaleDetail> {\n    authorizationService.requirePermission('draft.resume');"
  );
  
  code = code.replace(
    "async cancelDraft(draftId: string): Promise<void> {",
    "async cancelDraft(draftId: string): Promise<void> {\n    authorizationService.requirePermission('draft.cancel');"
  );
  
  // Wait, I should make sure it actually replaces properly, sometimes the signatures differ. Let's do a more robust replace.
}
fs.writeFileSync('src/services/pos/DraftService.ts', code);
