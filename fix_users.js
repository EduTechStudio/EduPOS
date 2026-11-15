const fs = require('fs');

// DraftService
let draft = fs.readFileSync('src/services/pos/DraftService.ts', 'utf-8');
if (draft.includes("authorizationService.getCurrentUser()?.id || 'system'")) {
  draft = draft.replace(
    "const db = await getDatabase();",
    "const user = authorizationService.getCurrentUser();\n    if (!user) throw new Error('Authentication required to save draft');\n    const db = await getDatabase();"
  );
  draft = draft.replace(
    "authorizationService.getCurrentUser()?.id || 'system',",
    "user.id,"
  );
  fs.writeFileSync('src/services/pos/DraftService.ts', draft);
}

// CheckoutService
let checkout = fs.readFileSync('src/services/checkout/CheckoutService.ts', 'utf-8');
if (checkout.includes("authorizationService.getCurrentUser()?.id || 'system'")) {
  checkout = checkout.replace(
    "export class CheckoutService {",
    "export class CheckoutService {\n  private _ensureUser(inputCashierId?: string) {\n    const id = inputCashierId || authorizationService.getCurrentUser()?.id;\n    if (!id) throw new Error('Authentication required for checkout');\n    return id;\n  }"
  );
  checkout = checkout.replace(/input\.cashierId \|\| authorizationService\.getCurrentUser\(\)\?\.id \|\| 'system'/g, "this._ensureUser(input.cashierId)");
  fs.writeFileSync('src/services/checkout/CheckoutService.ts', checkout);
}
