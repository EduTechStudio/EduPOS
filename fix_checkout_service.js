const fs = require('fs');
let code = fs.readFileSync('src/services/checkout/CheckoutService.ts', 'utf-8');

if (!code.includes("requirePermission('pos.checkout')")) {
  code = code.replace(
    "async processCheckout(input: ProcessCheckoutInput): Promise<CheckoutResult> {",
    "async processCheckout(input: ProcessCheckoutInput): Promise<CheckoutResult> {\n    authorizationService.requirePermission('pos.checkout');"
  );
  fs.writeFileSync('src/services/checkout/CheckoutService.ts', code);
}
