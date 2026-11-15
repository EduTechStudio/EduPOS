const fs = require('fs');
let code = fs.readFileSync('src/services/checkout/CheckoutService.ts', 'utf-8');

if (!code.includes("pos.apply_discount")) {
  code = code.replace(
    "async processCheckout(",
    "async processCheckout("
  );
  
  // Find processCheckout implementation
  code = code.replace(
    "if (payments.length === 0) {",
    "if (discount && discount.calculatedAmount > 0) {\n      authorizationService.requirePermission('pos.apply_discount');\n    }\n    if (payments.length === 0) {"
  );
  
  fs.writeFileSync('src/services/checkout/CheckoutService.ts', code);
}
