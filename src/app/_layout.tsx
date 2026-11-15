import { AuthProvider } from '@/context/AuthContext';
import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme, ThemeProvider, useTheme } from '@/theme';
import { Icon, IconName } from '@/components/ui/Icon';
import { useResponsive } from '@/hooks/useResponsive';
import { DatabaseService } from '@/database';
import { POSProvider } from '@/context/POSContext';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { useAuth } from '@/context/AuthContext';
import { TouchableOpacity } from 'react-native';

import { EduPOSHeader } from '@/components/layout/EduPOSHeader';

function TabBarIcon({ name, color }: { name: IconName; color: ColorValue | string }) {
  return <Icon name={name} size={18} color={color} />;
}

function MainContent() {
  const { isTablet } = useResponsive();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
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
      backBehavior="firstRoute"
      screenOptions={({ route }) => ({
        headerShown: true,
        header: (props) => (
          <EduPOSHeader
            routeName={route.name}
            optionsTitle={props.options.title}
            dbReady={dbReady}
          />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: isTablet ? 64 : 58,
          paddingBottom: isTablet ? 8 : 6,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 12 : 10,
          fontWeight: '600',
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Kasir',
          tabBarIcon: ({ color }) => <TabBarIcon name="pos" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transaksi',
          tabBarIcon: ({ color }) => <TabBarIcon name="transactions" color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produk',
          tabBarIcon: ({ color }) => <TabBarIcon name="products" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Lainnya',
          tabBarIcon: ({ color }) => <TabBarIcon name="more" color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          href: null,
          unmountOnBlur: true,
          title: 'Pelanggan',
        } as any}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          unmountOnBlur: true,
          title: 'Pengaturan',
        } as any}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <POSProvider>
            <MainContent />
          </POSProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
