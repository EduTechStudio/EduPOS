import { SQLiteDatabase } from 'expo-sqlite';
import { allPermissions, initialRoles, defaultRolePermissions } from '@/config/defaultRolesAndPermissions';
import { defaultPOSConfig } from '@/config/defaultPOSConfig';
import { defaultReceiptConfig } from '@/config/defaultReceiptConfig';
import { defaultPrinterConfig } from '@/config/defaultPrinterConfig';

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  console.log('[Seed] seedDatabase starting...');
  const startTime = Date.now();

  try {
    // Wrap seeding in an explicit, isolated transaction per Task C
    await db.withTransactionAsync(async () => {
      // ----------------------------------------------------
      // SECTION 1: Roles
      // ----------------------------------------------------
      const roleStatements: string[] = [];
      for (const role of initialRoles) {
        const name = role.name.replace(/'/g, "''");
        const desc = role.description.replace(/'/g, "''");
        roleStatements.push(
          `INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at, updated_at) VALUES ('${role.id}', '${name}', '${desc}', ${role.isSystem ? 1 : 0}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`
        );
      }
      console.log(`[Seed] [1/5] Executing ${roleStatements.length} role statements...`);
      try {
        await db.execAsync(roleStatements.join('\n'));
        console.log('[Seed] [1/5] Roles seeded successfully.');
      } catch (err: any) {
        console.error('[Seed] FAILED at Section 1 (Roles):', err?.message || err);
        for (let i = 0; i < roleStatements.length; i++) {
          try {
            await db.execAsync(roleStatements[i]);
          } catch (stmtErr: any) {
            console.error(`[Seed Diagnostic] EXACT FAILING STATEMENT in Section 1 (Roles) [index ${i}]:`, roleStatements[i]);
            console.error('[Seed Diagnostic] Error:', stmtErr?.message || stmtErr);
            console.error('[Seed Diagnostic] Stack:', stmtErr?.stack);
            break;
          }
        }
        throw err;
      }

      // ----------------------------------------------------
      // SECTION 2: Permissions
      // ----------------------------------------------------
      const permStatements: string[] = [];
      for (const perm of allPermissions) {
        const id = 'perm_' + perm.key.replace(/\./g, '_');
        const label = perm.label.replace(/'/g, "''");
        const category = (perm.category || '').replace(/'/g, "''");
        permStatements.push(
          `INSERT INTO permissions (id, key, name, description, created_at) VALUES ('${id}', '${perm.key}', '${label}', '${category}', CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET name = excluded.name, description = excluded.description;`
        );
      }
      console.log(`[Seed] [2/5] Executing ${permStatements.length} permission statements...`);
      try {
        await db.execAsync(permStatements.join('\n'));
        console.log('[Seed] [2/5] Permissions seeded successfully.');
      } catch (err: any) {
        console.error('[Seed] FAILED at Section 2 (Permissions):', err?.message || err);
        for (let i = 0; i < permStatements.length; i++) {
          try {
            await db.execAsync(permStatements[i]);
          } catch (stmtErr: any) {
            console.error(`[Seed Diagnostic] EXACT FAILING STATEMENT in Section 2 (Permissions) [index ${i}]:`, permStatements[i]);
            console.error('[Seed Diagnostic] Error:', stmtErr?.message || stmtErr);
            console.error('[Seed Diagnostic] Stack:', stmtErr?.stack);
            break;
          }
        }
        throw err;
      }

      // ----------------------------------------------------
      // SECTION 3: Role Permissions
      // ----------------------------------------------------
      const rpStatements: string[] = [];
      for (const rp of defaultRolePermissions) {
        for (const permKey of rp.permissions) {
          rpStatements.push(
            `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT '${rp.roleId}', id FROM permissions WHERE key = '${permKey}';`
          );
        }
      }
      console.log(`[Seed] [3/5] Executing ${rpStatements.length} role-permission statements...`);
      try {
        await db.execAsync(rpStatements.join('\n'));
        console.log('[Seed] [3/5] Role permissions seeded successfully.');
      } catch (err: any) {
        console.error('[Seed] FAILED at Section 3 (Role Permissions):', err?.message || err);
        for (let i = 0; i < rpStatements.length; i++) {
          try {
            await db.execAsync(rpStatements[i]);
          } catch (stmtErr: any) {
            console.error(`[Seed Diagnostic] EXACT FAILING STATEMENT in Section 3 (Role Permissions) [index ${i}]:`, rpStatements[i]);
            console.error('[Seed Diagnostic] Error:', stmtErr?.message || stmtErr);
            console.error('[Seed Diagnostic] Stack:', stmtErr?.stack);
            break;
          }
        }
        throw err;
      }

      // ----------------------------------------------------
      // SECTION 4: Default Users (Owner & Cashier)
      // ----------------------------------------------------
      const userStatements: string[] = [
        `INSERT OR IGNORE INTO users (id, name, username, pin_hash, role_id, is_active, created_at, updated_at) VALUES ('user_owner', 'Store Owner', 'owner', '1234_hashed', 'owner', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        `INSERT OR IGNORE INTO users (id, name, username, pin_hash, role_id, is_active, created_at, updated_at) VALUES ('user_cashier', 'Primary Cashier', 'cashier', '0000_hashed', 'cashier', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      ];
      console.log(`[Seed] [4/5] Executing ${userStatements.length} default user statements...`);
      try {
        await db.execAsync(userStatements.join('\n'));
        console.log('[Seed] [4/5] Default users verified/seeded successfully.');
      } catch (err: any) {
        console.error('[Seed] FAILED at Section 4 (Users):', err?.message || err);
        for (let i = 0; i < userStatements.length; i++) {
          try {
            await db.execAsync(userStatements[i]);
          } catch (stmtErr: any) {
            console.error(`[Seed Diagnostic] EXACT FAILING STATEMENT in Section 4 (Users) [index ${i}]: [REDACTED USER CREDENTIALS]`);
            console.error('[Seed Diagnostic] Error:', stmtErr?.message || stmtErr);
            console.error('[Seed Diagnostic] Stack:', stmtErr?.stack);
            break;
          }
        }
        throw err;
      }

      // ----------------------------------------------------
      // SECTION 5: Default Settings
      // ----------------------------------------------------
      const settingsList = [
        { key: 'business_type', value: 'retail', type: 'string' },
        { key: 'store_name', value: defaultReceiptConfig.storeName, type: 'string' },
        { key: 'store_address', value: defaultReceiptConfig.storeAddress, type: 'string' },
        { key: 'store_phone', value: defaultReceiptConfig.storePhone, type: 'string' },
        { key: 'pos_config', value: JSON.stringify(defaultPOSConfig), type: 'json' },
        { key: 'receipt_config', value: JSON.stringify(defaultReceiptConfig), type: 'json' },
        { key: 'printer_config', value: JSON.stringify(defaultPrinterConfig), type: 'json' },
      ];
      const settingsStatements: string[] = [];
      for (const s of settingsList) {
        const val = s.value.replace(/'/g, "''");
        settingsStatements.push(
          `INSERT OR IGNORE INTO settings (key, value, value_type, created_at, updated_at) VALUES ('${s.key}', '${val}', '${s.type}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`
        );
      }
      console.log(`[Seed] [5/5] Executing ${settingsStatements.length} setting statements...`);
      try {
        await db.execAsync(settingsStatements.join('\n'));
        console.log('[Seed] [5/5] Default settings verified/seeded successfully.');
      } catch (err: any) {
        console.error('[Seed] FAILED at Section 5 (Settings):', err?.message || err);
        for (let i = 0; i < settingsStatements.length; i++) {
          try {
            await db.execAsync(settingsStatements[i]);
          } catch (stmtErr: any) {
            console.error(`[Seed Diagnostic] EXACT FAILING STATEMENT in Section 5 (Settings) [index ${i}]:`, settingsStatements[i]);
            console.error('[Seed Diagnostic] Error:', stmtErr?.message || stmtErr);
            console.error('[Seed Diagnostic] Stack:', stmtErr?.stack);
            break;
          }
        }
        throw err;
      }
    });

    console.log(`[Seed] Seed data verified and applied safely in ${Date.now() - startTime}ms.`);
  } catch (e: any) {
    console.error('[Database] SEED FAILED:', e?.message || e);
    console.error('[Database] SEED STACK:', e?.stack);
    throw e;
  }
}
