const fs = require('fs');
const lines = fs.readFileSync('src/app/_layout.tsx', 'utf-8').split('\n');

const newLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<Tabs.Screen name="settings"')) {
    skip = true;
    newLines.push('        <Tabs.Screen name="settings" options={{ unmountOnBlur: true, title: "Settings", headerTitle: "Store POS • Configuration Center", tabBarIcon: ({ color }: any) => <TabBarIcon name="settings" color={color} /> } as any} />');
  } else if (skip) {
    if (lines[i].includes('/>') && !lines[i].includes('<Tabs.Screen')) {
      skip = false;
    }
  } else {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync('src/app/_layout.tsx', newLines.join('\n'));
