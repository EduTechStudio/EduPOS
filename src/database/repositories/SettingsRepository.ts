import { getDatabase } from '../database';
import { SettingEntity } from '../types';
import { authorizationService } from '../../services/auth/AuthorizationService';

export class SettingsRepository {
  async get(key: string): Promise<SettingEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<SettingEntity>(
      'SELECT * FROM settings WHERE key = ?;',
      [key]
    );
  }

  async getAll(): Promise<SettingEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<SettingEntity>('SELECT * FROM settings;');
  }

  async set(key: string, value: string, valueType: 'string' | 'number' | 'boolean' | 'json' = 'string'): Promise<void> {
    if (key.includes('printer')) {
      authorizationService.requirePermission('printer.manage');
    } else if (key.includes('receipt')) {
      authorizationService.requirePermission('receipt.manage');
    } else if (key.includes('payment_gateway')) {
      authorizationService.requirePermission('payment.gateway.manage');
    } else if (key.includes('theme')) {
      // Theme preference is a visual display option accessible to all users
    } else {
      authorizationService.requirePermission('settings.manage');
    }
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO settings (key, value, value_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, value_type = excluded.value_type, updated_at = excluded.updated_at;`,
      [key, value, valueType, now, now]
    );
  }
}
