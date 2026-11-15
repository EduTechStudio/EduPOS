const fs = require('fs');
let code = fs.readFileSync('src/app/_layout.tsx', 'utf-8');

if (!code.includes("LoginScreen")) {
  code = code.replace(
    "import { POSProvider } from '@/context/POSContext';",
    "import { POSProvider } from '@/context/POSContext';\nimport { LoginScreen } from '@/components/auth/LoginScreen';\nimport { useAuth } from '@/context/AuthContext';\nimport { TouchableOpacity } from 'react-native';"
  );

  const mainContentStr = `
function MainContent() {
  const { isTablet } = useResponsive();
  const { isAuthenticated, currentUser, currentRole, logout } = useAuth();
  const [dbReady, setDbReady] = useState<boolean>(false);

  useEffect(() => {
    DatabaseService.init()
      .then(() => setDbReady(true))
      .catch((err) => console.error('[RootLayout] Database initialization failed:', err));
  }, []);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTitleStyle: {
            ...theme.typography.header3,
            color: theme.colors.textInverse,
          },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.headerRightBadge}>
                <Text style={styles.headerRightText}>
                  {dbReady ? 'SQLite DB Ready' : 'Initializing DB...'}
                </Text>
              </View>
              <View style={{ marginRight: theme.spacing.md, alignItems: 'flex-end' }}>
                <Text style={{ color: theme.colors.textInverse, fontWeight: 'bold' }}>{currentUser?.name}</Text>
                <Text style={{ color: theme.colors.textInverse, fontSize: 10, opacity: 0.8 }}>{currentRole?.name}</Text>
              </View>
              <TouchableOpacity onPress={logout} style={{ marginRight: theme.spacing.lg }}>
                <Icon name="logout" size={24} color={theme.colors.textInverse} />
              </TouchableOpacity>
            </View>
          ),
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            height: isTablet ? 64 : 56,
            paddingBottom: isTablet ? 8 : 4,
          },
          tabBarLabelStyle: {
            fontSize: isTablet ? 12 : 10,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            headerTitle: 'Store POS • Dashboard',
            tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
          }}
        />
        <Tabs.Screen
          name="pos"
          options={{
            title: 'POS Register',
            headerTitle: 'Store POS • Register & Cashier',
            tabBarIcon: ({ color }) => <TabBarIcon name="pos" color={color} />,
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            headerTitle: 'Store POS • Product Catalog',
            tabBarIcon: ({ color }) => <TabBarIcon name="products" color={color} />,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            headerTitle: 'Store POS • Sales History',
            tabBarIcon: ({ color }) => <TabBarIcon name="transactions" color={color} />,
          }}
        />
        <Tabs.Screen name="customers"
          options={{
            title: 'Customers',
            headerTitle: 'Store POS • Customer Directory',
            tabBarIcon: ({ color }) => <TabBarIcon name="customers" color={color} />,
          }}
        />
        <Tabs.Screen name="settings" options={{ href: "/settings", unmountOnBlur: true, title: "Settings", headerTitle: "Store POS • Configuration Center", tabBarIcon: ({ color }: any) => <TabBarIcon name="settings" color={color} /> } as any} />
      </Tabs>
  );
}`;

  // Replace RootLayout default export
  code = code.replace(/export default function RootLayout\(\) \{[\s\S]*?\n\}/, 
    mainContentStr + "\n\nexport default function RootLayout() {\n  return (\n    <SafeAreaProvider>\n      <AuthProvider>\n        <POSProvider>\n          <MainContent />\n        </POSProvider>\n      </AuthProvider>\n    </SafeAreaProvider>\n  );\n}"
  );

  fs.writeFileSync('src/app/_layout.tsx', code);
}
