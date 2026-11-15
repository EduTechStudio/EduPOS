const fs = require('fs');
let content = fs.readFileSync('src/services/receipt/ReceiptService.ts', 'utf-8');

const replacement = `  async getReceiptConfig(): Promise<ReceiptConfig> {
    let baseConfig = { ...defaultReceiptConfig };
    
    // 1. Get receipt config
    const configSetting = await settingsRepository.get('receipt_config');
    if (configSetting && configSetting.value) {
      try {
        const parsed = JSON.parse(configSetting.value) as ReceiptConfig;
        baseConfig = { ...baseConfig, ...parsed };
      } catch (e) {
        // ignore
      }
    }
    
    // 2. Override store identity from store_profile if exists
    const profileSetting = await settingsRepository.get('store_profile');
    if (profileSetting && profileSetting.value) {
      try {
        const profile = JSON.parse(profileSetting.value);
        if (profile.name) baseConfig.storeName = profile.name;
        if (profile.address) baseConfig.storeAddress = profile.address;
        if (profile.phone) baseConfig.storePhone = profile.phone;
        if (profile.logo) baseConfig.logo = profile.logo;
      } catch (e) {
        // ignore
      }
    }
    
    return baseConfig;
  }`;

content = content.replace(/async getReceiptConfig\(\): Promise<ReceiptConfig> \{[\s\S]*?return defaultReceiptConfig;\n  \}/, replacement);
fs.writeFileSync('src/services/receipt/ReceiptService.ts', content);
