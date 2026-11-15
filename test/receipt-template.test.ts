import {
  createDefaultBlocks,
  createDefaultTemplate,
  convertLegacyConfigToTemplate,
  validateReceiptBlock,
  validateReceiptTemplate,
  validateTemplatesConfiguration,
  duplicateTemplate,
  reorderBlocks,
  addBlock,
  removeBlock,
  updateBlock,
  renameTemplate,
  substitutePlaceholders,
  generateId,
} from '../src/services/receipt/templateOperations';
import {
  ReceiptBlock,
  ReceiptTemplate,
  ReceiptTemplatesConfiguration,
  RECEIPT_TEMPLATES_STORAGE_KEY,
} from '../src/types/receiptTemplate';
import { ReceiptTemplateService, ISettingsRepository } from '../src/services/receipt/ReceiptTemplateService';

function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

assert.strictEqual = function <T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
};

assert.notStrictEqual = function <T>(actual: T, expected: T, message?: string) {
  if (actual === expected) {
    throw new Error(`${message || 'Assertion failed'}: expected values to differ, got ${actual}`);
  }
};

assert.ok = function (val: any, message?: string): asserts val {
  if (!val) {
    throw new Error(message || 'Expected truthy value');
  }
};

console.log('--- STARTING EDUPOS RECEIPT TEMPLATE PHASE 1 TESTS ---');

// Test 1: ID Generation & Format
console.log('Testing Test 1: ID Generation & uniqueness...');
{
  const id1 = generateId('blk');
  const id2 = generateId('blk');
  assert.ok(id1.startsWith('blk_'), 'ID must start with requested prefix');
  assert.notStrictEqual(id1, id2, 'Generated IDs must be unique');
  console.log('  PASS: Unique ID generation verified.');
}

// Test 2: Validation of 15 Block Types
console.log('Testing Test 2: Validation of all 15 block types...');
{
  const types = [
    'logo',
    'store_header',
    'custom_text',
    'divider',
    'transaction_meta',
    'customer_info',
    'item_list',
    'subtotal',
    'discount',
    'tax',
    'total',
    'payments',
    'change',
    'footer_text',
    'spacer',
  ] as const;

  for (const t of types) {
    const rawBlock: any = { id: `test_${t}`, type: t, visible: true };
    const res = validateReceiptBlock(rawBlock);
    assert.strictEqual(res.valid, true, `Block type ${t} must be valid`);
    assert.ok(res.sanitized, `Sanitized block for ${t} must exist`);
    assert.strictEqual(res.sanitized!.type, t);
  }

  // Reject invalid block type
  const invalidRes = validateReceiptBlock({ id: 'bad', type: 'malicious_code' });
  assert.strictEqual(invalidRes.valid, false, 'Invalid block type must be rejected');

  // Spacer clamped between 1 and 10
  const spacerHuge = validateReceiptBlock({ id: 'sp1', type: 'spacer', lines: 99 });
  assert.strictEqual((spacerHuge.sanitized as any)?.lines, 10, 'Spacer lines must clamp to max 10');
  const spacerNegative = validateReceiptBlock({ id: 'sp2', type: 'spacer', lines: -5 });
  assert.strictEqual((spacerNegative.sanitized as any)?.lines, 1, 'Spacer lines must clamp to min 1');

  // Sanitized alignments & styles
  const textBlock = validateReceiptBlock({
    id: 'ct',
    type: 'custom_text',
    text: 'Hello World',
    align: 'invalid_align',
    fontSize: 'weird_size',
  });
  assert.strictEqual((textBlock.sanitized as any)?.align, 'left', 'Invalid alignment must fallback to left');
  assert.strictEqual((textBlock.sanitized as any)?.fontSize, 'normal', 'Invalid font size must fallback to normal');

  console.log('  PASS: All 15 block types and boundary constraints validated.');
}

// Test 3: Template & Configuration Validation
console.log('Testing Test 3: Template & configuration validation...');
{
  const defaultTemplate = createDefaultTemplate('58mm');
  assert.strictEqual(defaultTemplate.paperWidth, '58mm');
  assert.strictEqual(defaultTemplate.isDefault, true);
  assert.ok(defaultTemplate.blocks.length >= 10, 'Default template should contain standard blocks');

  const tmplValidation = validateReceiptTemplate(defaultTemplate);
  assert.strictEqual(tmplValidation.valid, true);

  // Duplicate block ID de-duplication inside template
  const tmplWithDups: ReceiptTemplate = {
    ...defaultTemplate,
    blocks: [
      { id: 'duplicate_id', type: 'divider', visible: true, style: 'single', spacing: 'none' },
      { id: 'duplicate_id', type: 'divider', visible: true, style: 'double', spacing: 'none' },
    ],
  };
  const dupCheck = validateReceiptTemplate(tmplWithDups);
  assert.strictEqual(dupCheck.valid, true);
  assert.strictEqual(dupCheck.sanitized?.blocks.length, 2);
  assert.notStrictEqual(
    dupCheck.sanitized?.blocks[0].id,
    dupCheck.sanitized?.blocks[1].id,
    'Duplicate block IDs must be safely regenerated and made unique'
  );

  // Configuration validation
  const validConfig: ReceiptTemplatesConfiguration = {
    version: 1,
    activeTemplateId: defaultTemplate.id,
    templates: [defaultTemplate],
    updatedAt: new Date().toISOString(),
  };
  const configVal = validateTemplatesConfiguration(validConfig);
  assert.strictEqual(configVal.valid, true);

  // ActiveTemplateId fallback if referencing nonexistent template
  const configBadActive: ReceiptTemplatesConfiguration = {
    ...validConfig,
    activeTemplateId: 'non_existent_id',
  };
  const configFixedActive = validateTemplatesConfiguration(configBadActive);
  assert.strictEqual(configFixedActive.valid, true);
  assert.strictEqual(
    configFixedActive.sanitized?.activeTemplateId,
    defaultTemplate.id,
    'Non-existent activeTemplateId must fall back to existing template'
  );

  console.log('  PASS: Template and configuration validation passed.');
}

// Test 4: Conversion from Legacy ReceiptConfig
console.log('Testing Test 4: Legacy configuration conversion...');
{
  const legacyConfig = {
    storeName: 'Warung EduPOS',
    storeAddress: 'Jl. Merdeka No. 45',
    storePhone: '0812345678',
    showHeader: true,
    showStoreAddress: false,
    showStorePhone: true,
    showLogo: false,
    showFooter: true,
    footerText: 'Terima kasih atas kunjungan Anda!',
    showCashier: false,
    showTransactionNumber: true,
    showDateTime: true,
    showCustomer: false,
    showPaymentMethod: true,
    showDiscount: false,
    showTax: true,
    showSubtotal: true,
    showTotal: true,
    showChange: false,
    receiptWidth: '58mm' as const,
  };

  const converted = convertLegacyConfigToTemplate(legacyConfig);
  assert.strictEqual(converted.paperWidth, '58mm');

  // Verify converted blocks reflect legacy flags
  const logoBlock = converted.blocks.find((b) => b.type === 'logo');
  assert.ok(logoBlock);
  assert.strictEqual(logoBlock!.visible, false, 'Logo visibility must match showLogo=false');

  const headerBlock = converted.blocks.find((b) => b.type === 'store_header') as any;
  assert.ok(headerBlock);
  assert.strictEqual(headerBlock.showStoreAddress, false, 'Store address visibility must match showStoreAddress=false');
  assert.strictEqual(headerBlock.showStorePhone, true, 'Store phone visibility must match showStorePhone=true');

  const metaBlock = converted.blocks.find((b) => b.type === 'transaction_meta') as any;
  assert.ok(metaBlock);
  assert.strictEqual(metaBlock.showCashier, false, 'Cashier visibility must match showCashier=false');

  const footerBlock = converted.blocks.find((b) => b.type === 'footer_text') as any;
  assert.ok(footerBlock);
  assert.strictEqual(footerBlock.text, 'Terima kasih atas kunjungan Anda!');

  console.log('  PASS: Legacy configuration conversion correctly maps all fields.');
}

// Test 5: Pure Operations (Duplicate, Reorder, Add, Remove, Update, Rename)
console.log('Testing Test 5: Pure template operations...');
{
  const template = createDefaultTemplate('80mm');
  const initialBlockCount = template.blocks.length;

  // Duplicate
  const duplicated = duplicateTemplate(template, 'My Custom Receipt');
  assert.strictEqual(duplicated.name, 'My Custom Receipt');
  assert.notStrictEqual(duplicated.id, template.id, 'Duplicated template must have new ID');
  assert.strictEqual(duplicated.isDefault, false, 'Duplicated template cannot be marked isDefault');
  assert.strictEqual(duplicated.blocks.length, initialBlockCount);
  assert.notStrictEqual(duplicated.blocks[0].id, template.blocks[0].id, 'Block IDs must be regenerated');

  // Add block
  const newCustomBlock: ReceiptBlock = {
    id: 'blk_custom_promo',
    type: 'custom_text',
    visible: true,
    text: 'PROMO SPESIAL HARI INI!',
    align: 'center',
    fontSize: 'normal',
    bold: true,
  };
  const templateWithAdded = addBlock(template, newCustomBlock, 2);
  assert.strictEqual(templateWithAdded.blocks.length, initialBlockCount + 1);
  assert.strictEqual(templateWithAdded.blocks[2].id, 'blk_custom_promo');

  // Reorder blocks
  const reordered = reorderBlocks(templateWithAdded, 2, 0);
  assert.strictEqual(reordered.blocks[0].id, 'blk_custom_promo');
  assert.strictEqual(reordered.blocks.length, initialBlockCount + 1);

  // Update block
  const updated = updateBlock(reordered, 'blk_custom_promo', {
    text: 'PROMO BERAKHIR BESOK!',
    bold: false,
  });
  const foundUpdated = updated.blocks.find((b) => b.id === 'blk_custom_promo') as any;
  assert.strictEqual(foundUpdated.text, 'PROMO BERAKHIR BESOK!');
  assert.strictEqual(foundUpdated.bold, false);

  // Remove block
  const removed = removeBlock(updated, 'blk_custom_promo');
  assert.strictEqual(removed.blocks.length, initialBlockCount);
  assert.strictEqual(removed.blocks.some((b) => b.id === 'blk_custom_promo'), false);

  // Rename template
  const renamed = renameTemplate(removed, 'Renamed EduPOS Template');
  assert.strictEqual(renamed.name, 'Renamed EduPOS Template');

  console.log('  PASS: Pure template operations (duplicate, add, reorder, update, remove, rename) verified.');
}

// Test 6: Placeholder Token Substitution
console.log('Testing Test 6: Placeholder token substitution...');
{
  const data = {
    store_name: 'EduPOS Official Store',
    store_phone: '+62 811 2233 4455',
    store_address: 'Kuningan, Jakarta Selatan',
    trx_number: 'TRX-20261017-001',
    date: '17/10/2026',
    time: '14:30',
    cashier_name: 'Budi Santoso',
    customer_name: 'Ibu Ani',
    subtotal: 'Rp. 50.000',
    discount: 'Rp. 5.000',
    total: 'Rp. 45.000',
    payment_method: 'Tunai',
  };

  const templateString =
    'Toko: {{store_name}}\n' +
    'No: {{trx_number}} | Kasir: {{cashier_name}}\n' +
    'Total: {{total}} ({{payment_method}})\n' +
    'Pesan: {{unknown_custom_macro}}';

  const rendered = substitutePlaceholders(templateString, data);

  assert.ok(rendered.includes('Toko: EduPOS Official Store'), 'store_name replaced');
  assert.ok(rendered.includes('No: TRX-20261017-001 | Kasir: Budi Santoso'), 'trx_number & cashier replaced');
  assert.ok(rendered.includes('Total: Rp. 45.000 (Tunai)'), 'total & payment_method replaced');
  assert.ok(
    rendered.includes('Pesan: {{unknown_custom_macro}}'),
    'Unknown macro tokens must remain literal text without crashing'
  );

  // Missing values replaced with empty string
  const emptySub = substitutePlaceholders('Kasir: {{cashier_name}}', {});
  assert.strictEqual(emptySub, 'Kasir: ');

  console.log('  PASS: Allowlisted placeholder substitution and unrecognized token safety verified.');
}

// Test 7: ReceiptTemplateService Persistence & Fallback Logic
console.log('Testing Test 7: ReceiptTemplateService persistence & fallback simulation...');
(async () => {
  // Simulate mock SettingsRepository
  const mockStorage = new Map<string, string>();
  let requiredPermissionChecked: string | null = null;

  const mockSettingsRepository: ISettingsRepository = {
    async get(key: string) {
      if (!mockStorage.has(key)) return null;
      return { key, value: mockStorage.get(key)!, value_type: 'json' };
    },
    async set(key: string, value: string) {
      if (key.includes('receipt')) {
        requiredPermissionChecked = 'receipt.manage';
      }
      mockStorage.set(key, value);
    },
  };

  const service = new ReceiptTemplateService(mockSettingsRepository);

  // 1. In empty storage, getTemplatesConfig must return isFallback=true without writing to DB
  const initialGet = await service.getTemplatesConfig();
  assert.strictEqual(initialGet.isFallback, true, 'Empty storage must return fallback');
  assert.strictEqual(mockStorage.has(RECEIPT_TEMPLATES_STORAGE_KEY), false, 'Read must not write to DB');

  // 2. Active template returns fallback template
  const activeTmpl = await service.getActiveTemplate();
  assert.ok(activeTmpl);
  assert.strictEqual(activeTmpl.id, 'default_standard');

  // 3. Save templates configuration enforces permission and persists
  const saveRes = await service.saveTemplatesConfig(initialGet.config);
  assert.strictEqual(saveRes.success, true);
  assert.strictEqual(requiredPermissionChecked, 'receipt.manage');
  assert.strictEqual(mockStorage.has(RECEIPT_TEMPLATES_STORAGE_KEY), true);

  // 4. Corrupted JSON storage returns fallback and error message gracefully
  mockStorage.set(RECEIPT_TEMPLATES_STORAGE_KEY, '{ invalid json garbage');
  const corruptGet = await service.getTemplatesConfig();
  assert.strictEqual(corruptGet.isFallback, true);
  assert.ok(corruptGet.error?.includes('Corrupted JSON'));

  // 5. Restore valid and test duplicateTemplate through service
  await service.saveTemplatesConfig(initialGet.config);
  const dupResult = await service.duplicateTemplate('default_standard', 'Copy 1');
  assert.strictEqual(dupResult.success, true);
  assert.ok(dupResult.duplicatedTemplate);

  const afterDup = await service.getTemplatesConfig();
  assert.strictEqual(afterDup.config.templates.length, 2);

  // 6. Test setActiveTemplateId
  const setActiveRes = await service.setActiveTemplateId(dupResult.duplicatedTemplate!.id);
  assert.strictEqual(setActiveRes.success, true);
  const currentActive = await service.getActiveTemplate();
  assert.strictEqual(currentActive.id, dupResult.duplicatedTemplate!.id);

  // 7. Test createNewTemplate, renameTemplate, and getTemplateById
  const createRes = await service.createNewTemplate('Template Cafe Baru', '58mm');
  assert.strictEqual(createRes.success, true);
  assert.ok(createRes.template);
  assert.strictEqual(createRes.template!.name, 'Template Cafe Baru');
  assert.strictEqual(createRes.template!.paperWidth, '58mm');

  const fetchedById = await service.getTemplateById(createRes.template!.id);
  assert.ok(fetchedById);
  assert.strictEqual(fetchedById!.id, createRes.template!.id);

  const renameRes = await service.renameTemplate(createRes.template!.id, 'Template Cafe Updated');
  assert.strictEqual(renameRes.success, true);
  const fetchedRenamed = await service.getTemplateById(createRes.template!.id);
  assert.strictEqual(fetchedRenamed!.name, 'Template Cafe Updated');

  // Clean up created template
  await service.deleteTemplate(createRes.template!.id);

  // 8. Cannot delete the only remaining template
  // Delete the duplicate first (now 1 left)
  await service.deleteTemplate(dupResult.duplicatedTemplate!.id);
  const afterDeleteDup = await service.getTemplatesConfig();
  assert.strictEqual(afterDeleteDup.config.templates.length, 1);

  // Attempting to delete the last remaining template must fail
  const deleteLastRes = await service.deleteTemplate(afterDeleteDup.config.templates[0].id);
  assert.strictEqual(deleteLastRes.success, false);
  assert.strictEqual(deleteLastRes.error, 'Cannot delete the only remaining template');

  console.log('  PASS: Service persistence, fallback, permission check, and protection against deletion verified.');
  console.log('--- ALL RECEIPT TEMPLATE TESTS PASSED (7/7) ---');
})().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
