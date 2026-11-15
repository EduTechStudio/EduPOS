const fs = require('fs');
let code = fs.readFileSync('src/app/settings/index.tsx', 'utf-8');

const regex = /const menuItems = \[([\s\S]*?)\];/;
const replacement = `const menuItems = [
    { id: 'store-profile', title: 'Store Profile', subtitle: 'Manage store identity, address, contact, logo, and business type.', icon: 'store' as IconName, route: '/settings/store-profile' },
    { id: 'receipt-printer', title: 'Receipt & Printer', subtitle: 'Configure receipt format, receipt information, and printer settings.', icon: 'receipt' as IconName, route: '/settings/receipt-printer' },
    { id: 'payment-methods', title: 'Payment Methods', subtitle: 'Manage available payment methods and payment configuration.', icon: 'payment' as IconName, route: '/settings/payment-methods' },
  ];
  if (hasPermission('user.view')) {
    menuItems.push({ id: 'users-permissions', title: 'Users & Permissions', subtitle: 'Manage users, roles, PIN, and permissions.', icon: 'security' as IconName, route: '/settings/users-permissions' });
  }
  menuItems.push({ id: 'system-configuration', title: 'System Configuration', subtitle: 'Backup, restore, transaction archive, and system maintenance.', icon: 'settings' as IconName, route: '/settings/system-configuration' });`;

if (!code.includes("useAuth")) {
  code = code.replace("import React from 'react';", "import React from 'react';\nimport { useAuth } from '@/context/AuthContext';");
  code = code.replace("export default function SettingsIndexScreen() {", "export default function SettingsIndexScreen() {\n  const { hasPermission } = useAuth();");
}
code = code.replace(regex, replacement);

fs.writeFileSync('src/app/settings/index.tsx', code);
