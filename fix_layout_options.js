const fs = require('fs');
let layout = fs.readFileSync('src/app/_layout.tsx', 'utf-8');
// find the options block for settings
const findSettings = /<Tabs\.Screen name="settings"\s*options=\{\{\s*unmountOnBlur:\s*true\s*as\s*any,\s*title:\s*'Settings',/g;
layout = layout.replace(findSettings, `<Tabs.Screen name="settings"\n          options={{ unmountOnBlur: true, title: 'Settings' } as any}\n          //`);
// let's do a more robust replace
layout = layout.replace(/options=\{\{\s*unmountOnBlur:\s*true\s*as\s*any,\s*title:\s*'Settings',[\s\S]*?\}\}/, "options={{ unmountOnBlur: true, title: 'Settings', headerTitle: 'Store POS • Configuration Center', tabBarIcon: ({ color }: any) => <TabBarIcon name=\"settings\" color={color} /> } as any}");

fs.writeFileSync('src/app/_layout.tsx', layout);
