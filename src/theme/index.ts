import { Appearance } from 'react-native';
import { colors, lightColors, darkColors, Colors } from './colors';
import { typography, Typography } from './typography';
import { spacing, Spacing } from './spacing';
import { radius, Radius } from './radius';
import { shadows, Shadows } from './shadows';
import { createTheme, Theme } from './themeFactory';
import { ThemeProvider, useTheme, ThemeContext } from './ThemeContext';

const currentScheme = Appearance.getColorScheme();
export const theme = createTheme(currentScheme === 'dark' ? darkColors : lightColors);

export {
  colors,
  lightColors,
  darkColors,
  typography,
  spacing,
  radius,
  shadows,
  createTheme,
  ThemeProvider,
  useTheme,
  ThemeContext,
};

export type { Theme, Colors, Typography, Spacing, Radius, Shadows };
