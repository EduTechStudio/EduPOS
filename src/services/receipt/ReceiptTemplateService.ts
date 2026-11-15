import {
  ReceiptTemplate,
  ReceiptTemplatesConfiguration,
  RECEIPT_TEMPLATES_STORAGE_KEY,
} from '@/types/receiptTemplate';
import {
  convertLegacyConfigToTemplate,
  createDefaultTemplate,
  createInitialTemplatesConfig,
  duplicateTemplate as duplicateTemplateOp,
  renameTemplate as renameTemplateOp,
  generateId,
  validateReceiptTemplate,
  validateTemplatesConfiguration,
} from './templateOperations';
import { ReceiptConfig } from '@/types/receipt';
import { defaultReceiptConfig } from '@/config/defaultReceiptConfig';

export interface ISettingsRepository {
  get(key: string): Promise<{ key: string; value: string; value_type?: string } | null>;
  set(key: string, value: string, valueType?: 'string' | 'number' | 'boolean' | 'json'): Promise<void>;
}

export interface GetTemplatesConfigResult {
  config: ReceiptTemplatesConfiguration;
  isFallback: boolean;
  error?: string;
}

export class ReceiptTemplateService {
  private repository?: ISettingsRepository;

  constructor(repository?: ISettingsRepository) {
    this.repository = repository;
  }

  private async getRepository(): Promise<ISettingsRepository> {
    if (this.repository) {
      return this.repository;
    }
    const db = await import('@/database');
    return db.settingsRepository;
  }

  /**
   * Helper to load legacy receipt configuration safely as fallback.
   */
  private async getLegacyReceiptConfig(): Promise<ReceiptConfig> {
    let baseConfig = { ...defaultReceiptConfig };
    try {
      const repo = await this.getRepository();
      const configSetting = await repo.get('receipt_config');
      if (configSetting && configSetting.value) {
        try {
          const parsed = JSON.parse(configSetting.value) as ReceiptConfig;
          baseConfig = { ...baseConfig, ...parsed };
        } catch {
          // ignore malformed JSON
        }
      }

      const profileSetting = await repo.get('store_profile');
      if (profileSetting && profileSetting.value) {
        try {
          const profile = JSON.parse(profileSetting.value);
          if (profile.name) baseConfig.storeName = profile.name;
          if (profile.address) baseConfig.storeAddress = profile.address;
          if (profile.phone) baseConfig.storePhone = profile.phone;
          if (profile.logo) baseConfig.logo = profile.logo;
        } catch {
          // ignore malformed JSON
        }
      }
    } catch {
      // ignore db errors
    }
    return baseConfig;
  }

  /**
   * Creates a synthesized fallback configuration in-memory based on legacy settings.
   * Does NOT write to SQLite.
   */
  async getFallbackConfig(): Promise<ReceiptTemplatesConfiguration> {
    const legacyConfig = await this.getLegacyReceiptConfig();
    const fallbackTemplate = convertLegacyConfigToTemplate(legacyConfig);
    return createInitialTemplatesConfig(fallbackTemplate);
  }

  /**
   * Retrieves all templates and active template configuration.
   * If not found or corrupted, returns a synthesized fallback configuration without modifying SQLite.
   */
  async getTemplatesConfig(): Promise<GetTemplatesConfigResult> {
    try {
      const repo = await this.getRepository();
      const setting = await repo.get(RECEIPT_TEMPLATES_STORAGE_KEY);
      if (!setting || !setting.value) {
        const fallback = await this.getFallbackConfig();
        return { config: fallback, isFallback: true };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(setting.value);
      } catch (parseErr: any) {
        const fallback = await this.getFallbackConfig();
        return {
          config: fallback,
          isFallback: true,
          error: `Corrupted JSON: ${parseErr?.message || 'Parse error'}`,
        };
      }

      const validation = validateTemplatesConfiguration(parsed);
      if (!validation.valid || !validation.sanitized) {
        const fallback = await this.getFallbackConfig();
        return {
          config: fallback,
          isFallback: true,
          error: `Invalid template schema: ${validation.errors.join(', ')}`,
        };
      }

      return { config: validation.sanitized, isFallback: false };
    } catch (err: any) {
      const fallback = await this.getFallbackConfig();
      return {
        config: fallback,
        isFallback: true,
        error: `Database read error: ${err?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Retrieves the currently active ReceiptTemplate.
   * Guaranteed never to throw; always returns a valid template.
   */
  async getActiveTemplate(): Promise<ReceiptTemplate> {
    const { config } = await this.getTemplatesConfig();
    const active = config.templates.find((t) => t.id === config.activeTemplateId);
    if (active) return active;
    if (config.templates.length > 0) return config.templates[0];
    return createDefaultTemplate();
  }

  /**
   * Validates and saves the entire ReceiptTemplatesConfiguration to SQLite.
   * Automatically invokes authorization check via settingsRepository.
   */
  async saveTemplatesConfig(config: ReceiptTemplatesConfiguration): Promise<{ success: boolean; error?: string }> {
    const validation = validateTemplatesConfiguration(config);
    if (!validation.valid || !validation.sanitized) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    try {
      const repo = await this.getRepository();
      const serialized = JSON.stringify(validation.sanitized);
      await repo.set(RECEIPT_TEMPLATES_STORAGE_KEY, serialized, 'json');
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to save receipt templates',
      };
    }
  }

  /**
   * Sets the active template ID.
   */
  async setActiveTemplateId(templateId: string): Promise<{ success: boolean; error?: string }> {
    const { config } = await this.getTemplatesConfig();
    const target = config.templates.find((t) => t.id === templateId);
    if (!target) {
      return { success: false, error: `Template not found: ${templateId}` };
    }

    const updatedConfig: ReceiptTemplatesConfiguration = {
      ...config,
      activeTemplateId: templateId,
      updatedAt: new Date().toISOString(),
    };

    return this.saveTemplatesConfig(updatedConfig);
  }

  /**
   * Saves or updates a single template. If template with the ID exists, updates it.
   * If not, adds it to the templates list.
   */
  async saveTemplate(template: ReceiptTemplate): Promise<{ success: boolean; error?: string }> {
    const validation = validateReceiptTemplate(template);
    if (!validation.valid || !validation.sanitized) {
      return {
        success: false,
        error: `Template validation failed: ${validation.errors.join(', ')}`,
      };
    }

    const sanitizedTemplate = validation.sanitized;
    const { config } = await this.getTemplatesConfig();

    const existingIndex = config.templates.findIndex((t) => t.id === sanitizedTemplate.id);
    let updatedTemplates: ReceiptTemplate[];

    if (existingIndex >= 0) {
      updatedTemplates = [...config.templates];
      updatedTemplates[existingIndex] = sanitizedTemplate;
    } else {
      updatedTemplates = [...config.templates, sanitizedTemplate];
    }

    const updatedConfig: ReceiptTemplatesConfiguration = {
      ...config,
      templates: updatedTemplates,
      updatedAt: new Date().toISOString(),
    };

    return this.saveTemplatesConfig(updatedConfig);
  }

  /**
   * Duplicates a template and saves it to configuration.
   */
  async duplicateTemplate(
    templateId: string,
    newName?: string
  ): Promise<{ success: boolean; duplicatedTemplate?: ReceiptTemplate; error?: string }> {
    const { config } = await this.getTemplatesConfig();
    const source = config.templates.find((t) => t.id === templateId);
    if (!source) {
      return { success: false, error: `Source template not found: ${templateId}` };
    }

    const duplicated = duplicateTemplateOp(source, newName);
    const updatedConfig: ReceiptTemplatesConfiguration = {
      ...config,
      templates: [...config.templates, duplicated],
      updatedAt: new Date().toISOString(),
    };

    const saveRes = await this.saveTemplatesConfig(updatedConfig);
    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    return { success: true, duplicatedTemplate: duplicated };
  }

  /**
   * Deletes a template. Prevents deleting the last remaining template.
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    const { config } = await this.getTemplatesConfig();

    if (config.templates.length <= 1) {
      return { success: false, error: 'Cannot delete the only remaining template' };
    }

    const target = config.templates.find((t) => t.id === templateId);
    if (!target) {
      return { success: false, error: `Template not found: ${templateId}` };
    }

    const updatedTemplates = config.templates.filter((t) => t.id !== templateId);
    let nextActiveId = config.activeTemplateId;

    if (config.activeTemplateId === templateId) {
      nextActiveId = updatedTemplates[0].id;
    }

    const updatedConfig: ReceiptTemplatesConfiguration = {
      ...config,
      activeTemplateId: nextActiveId,
      templates: updatedTemplates,
      updatedAt: new Date().toISOString(),
    };

    return this.saveTemplatesConfig(updatedConfig);
  }

  /**
   * Retrieves a template by its ID.
   */
  async getTemplateById(templateId: string): Promise<ReceiptTemplate | null> {
    const { config } = await this.getTemplatesConfig();
    return config.templates.find((t) => t.id === templateId) || null;
  }

  /**
   * Creates a new template from safe default and saves it to configuration.
   */
  async createNewTemplate(
    name: string,
    paperWidth: import('@/types/receiptTemplate').ReceiptWidth = '80mm'
  ): Promise<{ success: boolean; template?: ReceiptTemplate; error?: string }> {
    const def = createDefaultTemplate(paperWidth);
    const newTemplate: ReceiptTemplate = {
      ...def,
      id: generateId('tmpl'),
      name: name.trim() || 'Template Baru',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saveRes = await this.saveTemplate(newTemplate);
    if (!saveRes.success) {
      return { success: false, error: saveRes.error };
    }

    return { success: true, template: newTemplate };
  }

  /**
   * Renames a template and saves the updated configuration.
   */
  async renameTemplate(templateId: string, newName: string): Promise<{ success: boolean; error?: string }> {
    const { config } = await this.getTemplatesConfig();
    const target = config.templates.find((t) => t.id === templateId);
    if (!target) {
      return { success: false, error: `Template not found: ${templateId}` };
    }

    const renamed = renameTemplateOp(target, newName);
    return this.saveTemplate(renamed);
  }

  /**
   * Resets template configuration to a single default template based on standard config.
   */
  async resetToDefault(): Promise<{ success: boolean; error?: string }> {
    const def = createDefaultTemplate();
    const initialConfig = createInitialTemplatesConfig(def);
    return this.saveTemplatesConfig(initialConfig);
  }
}

export const receiptTemplateService = new ReceiptTemplateService();
