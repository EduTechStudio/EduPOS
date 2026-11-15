const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');

const targetBlock = `          const setting = await settingsRepository.get('pos_config');
          if (setting && setting.value && isActive) {
            setPosConfig(prev => ({ ...prev, ...JSON.parse(setting.value) }));
          }`;

const newBlock = `          const setting = await settingsRepository.get('pos_config');
          console.log("[POS DISPLAY DEBUG] show stock setting = ", setting?.value ? JSON.parse(setting.value).productDisplay?.showStock : 'Not Set');
          if (setting && setting.value && isActive) {
            setPosConfig(prev => ({ ...prev, ...JSON.parse(setting.value) }));
          }`;

if (code.includes(targetBlock)) {
    code = code.replace(targetBlock, newBlock);
    fs.writeFileSync('src/app/pos.tsx', code);
    console.log("Patched pos.tsx debug log successfully.");
} else {
    console.error("Target block not found in pos.tsx!");
}
