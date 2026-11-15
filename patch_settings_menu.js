const fs = require('fs');
let code = fs.readFileSync('src/app/settings/index.tsx', 'utf-8');

const rewrite = `  const { hasPermission } = useAuth();
  
  if (!hasPermission('settings.view')) {
    return (
      <ScreenContainer>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{fontSize: 24, fontWeight: 'bold', color: 'red'}}>Akses Ditolak</Text>
        </View>
      </ScreenContainer>
    );
  }

  const menuItems = [
    { id: 'store-profile', title: 'Store Profile', subtitle: 'Manage store identity, address, contact, logo, and business type.', icon: 'store' as any, route: '/settings/store-profile' },
  ];
  
  if (hasPermission('printer.manage') || hasPermission('receipt.manage')) {
    menuItems.push({ id: 'receipt-printer', title: 'Receipt & Printer', subtitle: 'Configure receipt format, receipt information, and printer settings.', icon: 'receipt' as any, route: '/settings/receipt-printer' });
  }
  
  if (hasPermission('payment.gateway.manage')) {
    menuItems.push({ id: 'payment-methods', title: 'Payment Methods', subtitle: 'Manage available payment methods and payment configuration.', icon: 'payment' as any, route: '/settings/payment-methods' });
  }

  if (hasPermission('user.view')) {
    menuItems.push({ id: 'users-permissions', title: 'Users & Permissions', subtitle: 'Manage users, roles, PIN, and permissions.', icon: 'security' as any, route: '/settings/users-permissions' });
  }
  
  if (hasPermission('settings.manage')) {
    menuItems.push({ id: 'system-configuration', title: 'System Configuration', subtitle: 'Backup, restore, transaction archive, and system maintenance.', icon: 'settings' as any, route: '/settings/system-configuration' });
  }`;

code = code.replace(
  /const \{ hasPermission \} = useAuth\(\);[\s\S]*?menuItems\.push\(\{ id: 'system-configuration'[\s\S]*?\}\);/,
  rewrite
);

fs.writeFileSync('src/app/settings/index.tsx', code);
