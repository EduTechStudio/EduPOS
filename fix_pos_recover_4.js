const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');

code = code.replace(
  "              )}\n            />\n          </Card>\n        </View>",
  "              )}\n            />\n        </View>"
);

fs.writeFileSync('src/app/pos.tsx', code);
