import { POSConfig } from './pos';

export type BusinessType = 'retail' | 'restaurant';

export interface BusinessTypePreset {
  id: BusinessType;
  name: string;
  description: string;
  defaultPOSConfig: POSConfig;
}
