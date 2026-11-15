import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme as useRNColorScheme, Appearance } from 'react-native';
import { lightColors, darkColors, Colors } from './colors';
import { createTheme, Theme } from './themeFactory';

interface ThemeContextType {
  theme: Theme;
  colors: Colors;
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  toggleTheme: () => void;
  setColorScheme: (scheme: 'light' | 'dark') => void;
}

const defaultScheme: 'light' | 'dark' = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
const defaultTheme = createTheme(defaultScheme === 'dark' ? darkColors : lightColors);

export const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  colors: defaultTheme.colors,
  colorScheme: defaultScheme,
  isDark: defaultScheme === 'dark',
  toggleTheme: () => {},
  setColorScheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useRNColorScheme();
  const [overrideScheme, setOverrideScheme] = useState<'light' | 'dark' | null>(null);

  // Load saved theme preference on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { settingsRepository } = await import('@/database');
        const setting = await settingsRepository.get('theme_preference');
        if (isMounted && setting && (setting.value === 'light' || setting.value === 'dark')) {
          setOverrideScheme(setting.value as 'light' | 'dark');
        }
      } catch {
        // Fallback to system / in-memory default
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeScheme: 'light' | 'dark' = overrideScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const theme = useMemo(() => {
    return createTheme(activeScheme === 'dark' ? darkColors : lightColors);
  }, [activeScheme]);

  const toggleTheme = () => {
    setOverrideScheme((prev) => {
      const next: 'light' | 'dark' = (prev ?? activeScheme) === 'dark' ? 'light' : 'dark';
      (async () => {
        try {
          const { settingsRepository } = await import('@/database');
          await settingsRepository.set('theme_preference', next, 'string');
        } catch (err) {
          console.warn('[ThemeContext] Failed to persist theme preference:', err);
        }
      })();
      return next;
    });
  };

  const setColorScheme = (scheme: 'light' | 'dark') => {
    setOverrideScheme(scheme);
    (async () => {
      try {
        const { settingsRepository } = await import('@/database');
        await settingsRepository.set('theme_preference', scheme, 'string');
      } catch (err) {
        console.warn('[ThemeContext] Failed to persist theme preference:', err);
      }
    })();
  };

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      colors: theme.colors,
      colorScheme: activeScheme,
      isDark: activeScheme === 'dark',
      toggleTheme,
      setColorScheme,
    }),
    [theme, activeScheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  return context;
}
