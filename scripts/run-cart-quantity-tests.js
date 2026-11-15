const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const Module = require('module');

// Mock React Native & Expo native modules for Node CLI test environment
const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'react-native') {
    return {
      Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
    };
  }
  if (id === 'expo-file-system/legacy' || id === 'expo-file-system') {
    return {
      documentDirectory: '/mock/documents/',
      getInfoAsync: async () => ({ exists: true }),
      readAsStringAsync: async () => '',
      writeAsStringAsync: async () => {},
      deleteAsync: async () => {},
      makeDirectoryAsync: async () => {},
      readDirectoryAsync: async () => [],
    };
  }
  if (id === 'expo-sharing') {
    return {
      isAvailableAsync: async () => true,
      shareAsync: async () => {},
    };
  }
  if (id === 'expo-document-picker') {
    return {
      getDocumentAsync: async () => ({ canceled: true }),
    };
  }
  if (id === 'expo-sqlite') {
    return {
      openDatabaseAsync: async () => ({
        execAsync: async () => {},
        getAllAsync: async () => [],
        runAsync: async () => {},
        getFirstAsync: async () => null,
        withTransactionAsync: async (cb) => cb(),
      }),
    };
  }
  return origRequire.apply(this, arguments);
};

// Register custom extension handler for .ts
require.extensions['.ts'] = function (module, filename) {
  let content = fs.readFileSync(filename, 'utf8');

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
require('../test/cart-quantity-wholesale.test.ts');
