import React from 'react';
import { TextStyle, ColorValue } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '@/theme';

export type IconName =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'transactions'
  | 'reports'
  | 'customers'
  | 'expenses'
  | 'settings'
  | 'store'
  | 'printer'
  | 'receipt'
  | 'payment'
  | 'security'
  | 'backup'
  | 'preset'
  | 'check'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'chevronUp'
  | 'camera'
  | 'close'
  | 'logout'
  | 'edit'
  | 'plus'
  | 'minus'
  | 'backspace'
  | 'trash'
  | 'login'
  | 'search'
  | 'filter'
  | 'more'
  | 'database'
  | 'alert'
  | 'info'
  | 'refresh'
  | 'download'
  | 'sun'
  | 'moon'
  | 'user'
  | 'copy';

interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue | string;
  style?: TextStyle;
}

const featherMap: Record<IconName, keyof typeof Feather.glyphMap> = {
  dashboard: 'bar-chart-2',
  pos: 'shopping-cart',
  products: 'box',
  transactions: 'file-text',
  reports: 'trending-up',
  customers: 'users',
  expenses: 'dollar-sign',
  settings: 'settings',
  store: 'shopping-bag',
  printer: 'printer',
  receipt: 'file-text',
  payment: 'credit-card',
  security: 'shield',
  backup: 'hard-drive',
  database: 'database',
  preset: 'tag',
  check: 'check',
  chevronRight: 'chevron-right',
  chevronLeft: 'chevron-left',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  camera: 'camera',
  close: 'x',
  logout: 'log-out',
  edit: 'edit-2',
  plus: 'plus',
  minus: 'minus',
  backspace: 'delete',
  trash: 'trash-2',
  login: 'log-in',
  search: 'search',
  filter: 'filter',
  more: 'grid',
  alert: 'alert-triangle',
  info: 'info',
  refresh: 'rotate-cw',
  download: 'download',
  sun: 'sun',
  moon: 'moon',
  user: 'user',
  copy: 'copy',
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  color = theme.colors.textPrimary,
  style,
}) => {
  const glyph = featherMap[name] || 'help-circle';
  return (
    <Feather
      name={glyph}
      size={size}
      color={color as string}
      style={style}
    />
  );
};
