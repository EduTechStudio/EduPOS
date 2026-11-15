import { TextStyle } from 'react-native';

export const typography = {
  header1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  } as TextStyle,
  header2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  } as TextStyle,
  header3: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  } as TextStyle,
  bodyLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  } as TextStyle,
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  } as TextStyle,
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  } as TextStyle,
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  } as TextStyle,
  button: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  } as TextStyle,
  buttonSm: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  } as TextStyle,
  price: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  } as TextStyle,
  priceSmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  } as TextStyle,
  priceLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  } as TextStyle,
  tabularPrice: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
};

export type Typography = typeof typography;
