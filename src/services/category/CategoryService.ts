import { categoryRepository } from '@/database';
import { CategoryEntity } from '@/database/types';

export interface CreateCategoryInput {
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export class CategoryService {
  async getCategories(includeInactive: boolean = false): Promise<CategoryEntity[]> {
    return categoryRepository.getAll(includeInactive);
  }

  async getCategoryById(id: string): Promise<CategoryEntity | null> {
    return categoryRepository.getById(id);
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryEntity> {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Nama kategori tidak boleh kosong');
    }

    const trimmedName = input.name.trim();
    const existing = await categoryRepository.getByName(trimmedName);
    if (existing) {
      throw new Error(`Kategori dengan nama "${trimmedName}" sudah ada`);
    }

    const categoryId = `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return categoryRepository.create({
      id: categoryId,
      name: trimmedName,
      description: input.description?.trim() || null,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true ? 1 : 0,
    });
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<void> {
    const existing = await categoryRepository.getById(id);
    if (!existing) {
      throw new Error('Kategori tidak ditemukan');
    }

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new Error('Nama kategori tidak boleh kosong');
      }
      const trimmedName = input.name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await categoryRepository.getByName(trimmedName);
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Kategori dengan nama "${trimmedName}" sudah ada`);
        }
      }
    }

    const updates: Partial<Omit<CategoryEntity, 'id' | 'created_at'>> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.description !== undefined) updates.description = input.description ? input.description.trim() : null;
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;
    if (input.isActive !== undefined) updates.is_active = input.isActive ? 1 : 0;

    await categoryRepository.update(id, updates);
  }

  async setCategoryActiveStatus(id: string, isActive: boolean): Promise<void> {
    const category = await categoryRepository.getById(id);
    if (!category) {
      throw new Error('Kategori tidak ditemukan');
    }
    await categoryRepository.setActiveStatus(id, isActive);
  }
}

export const categoryService = new CategoryService();
