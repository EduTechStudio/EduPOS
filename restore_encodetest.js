const fs = require('fs');
let content = fs.readFileSync('src/services/printer/EscPosEncoder.ts', 'utf-8');

const encodeTestStr = `
  public encodeTest(): number[] {
    this.initialize();
    this.setAlign('center');
    this.setBold(true);
    this.textLine('TEST PRINT');
    this.setBold(false);
    this.textLine('Printer terhubung dengan baik!');
    this.newline(3);
    this.cut();
    return this.buffer;
  }
`;

content = content.replace("return this.buffer;\n  }", "return this.buffer;\n  }\n" + encodeTestStr);
fs.writeFileSync('src/services/printer/EscPosEncoder.ts', content);
