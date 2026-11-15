import { useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
  isTablet: boolean;
  isLandscape: boolean;
  width: number;
  height: number;
  columns: number;
  contentMaxWidth: number;
  spacingMultiplier: number;
  navMode: 'bottom_tabs' | 'sidebar';
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  // Tablet threshold standard is width >= 768 in portrait or landscape
  const isTablet = Math.min(width, height) >= 600 || width >= 768;
  const isLandscape = width > height;

  // Calculate grid column count based on available screen width
  let columns = 1;
  if (width >= 1200) {
    columns = 4;
  } else if (width >= 900) {
    columns = 3;
  } else if (width >= 600) {
    columns = 2;
  } else {
    columns = 1;
  }

  // Maximum content width for readability
  const contentMaxWidth = isTablet ? 1280 : width;

  // Spacing multiplier
  const spacingMultiplier = isTablet ? 1.25 : 1.0;

  // Navigation mode
  const navMode: 'bottom_tabs' | 'sidebar' = isTablet ? 'sidebar' : 'bottom_tabs';

  return {
    isTablet,
    isLandscape,
    width,
    height,
    columns,
    contentMaxWidth,
    spacingMultiplier,
    navMode,
  };
}
