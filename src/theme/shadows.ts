import { ViewStyle } from 'react-native';

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,
  sm: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,
  md: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.11,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,
};

export type Shadows = typeof shadows;
