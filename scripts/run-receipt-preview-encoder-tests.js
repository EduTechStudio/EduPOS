const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// Register custom extension handler for .ts
require.extensions['.ts'] = function (module, filename) {
  let content = fs.readFileSync(filename, 'utf8');

  // Mock native database module if loaded in node test environment
  if (filename.includes('ReceiptService.ts')) {
    content = content.replace(
      /import\s*\{\s*settingsRepository\s*\}\s*from\s*['"]@\/database['"];?/g,
      'const settingsRepository = { get: async () => null, set: async () => {} };'
    );
  }

  // Replace '@/...' with relative paths from this file
  content = content.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, importPath) => {
    const targetPath = path.resolve(__dirname, '..', 'src', importPath);
    let rel = path.relative(path.dirname(filename), targetPath);
    if (!rel.startsWith('.')) rel = './' + rel;
    return `from '${rel}'`;
  });

  const res = babel.transformSync(content, {
    filename,
    presets: ['babel-preset-expo'],
  });

  module._compile(res.code, filename);
};

// Execute the test suite
require('../test/receipt-preview-encoder.test.ts');
