import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { categoryService } from '@/services';
import { CategoryEntity } from '@/database/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';

interface CategoryManageModalProps {
  visible: boolean;
  onClose: () => void;
  onCategoryChanged: () => void;
}

export const CategoryManageModal: React.FC<CategoryManageModalProps> = ({
  visible,
  onClose,
  onCategoryChanged,
}) => {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryEntity | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryService.getCategories(true);
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadCategories();
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setSortOrder('0');
    setErrorMsg(null);
  };

  const handleSelectEdit = (cat: CategoryEntity) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setSortOrder(cat.sort_order.toString());
    setErrorMsg(null);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, {
          name,
          description,
          sortOrder: parseInt(sortOrder, 10) || 0,
        });
      } else {
        await categoryService.createCategory({
          name,
          description,
          sortOrder: parseInt(sortOrder, 10) || 0,
        });
      }
      resetForm();
      await loadCategories();
      onCategoryChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: CategoryEntity) => {
    try {
      await categoryService.setCategoryActiveStatus(cat.id, cat.is_active === 0);
      await loadCategories();
      onCategoryChanged();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengubah status kategori');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Kelola Kategori</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Category Form */}
            <View style={[styles.formContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                {editingCategory ? `Edit Kategori: ${editingCategory.name}` : 'Tambah Kategori Baru'}
              </Text>

              {errorMsg ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.errorSoft }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
                </View>
              ) : null}

              <Input label="Nama Kategori *" value={name} onChangeText={setName} placeholder="contoh: Makanan Ringan" />
              <Input label="Deskripsi (Opsional)" value={description} onChangeText={setDescription} placeholder="Keterangan singkat" />
              <Input label="Urutan Tampil" value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" placeholder="0" />

              <View style={styles.formActions}>
                {editingCategory ? (
                  <Button title="Batal Edit" variant="outline" size="sm" onPress={resetForm} />
                ) : null}
                <Button
                  title={saving ? 'Menyimpan...' : editingCategory ? 'Simpan Perubahan' : '+ Tambah Kategori'}
                  variant="primary"
                  size="sm"
                  loading={saving}
                  onPress={handleSave}
                />
              </View>
            </View>

            {/* Category List */}
            <Text style={[styles.listSectionTitle, { color: colors.textPrimary }]}>Daftar Kategori ({categories.length})</Text>
            {categories.map((cat) => (
              <View key={cat.id} style={[
                styles.catRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                cat.is_active === 0 && [styles.inactiveRow, { backgroundColor: colors.surfaceSubtle }]
              ]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.catTitleRow}>
                    <Text style={[styles.catName, { color: colors.textPrimary }]}>{cat.name}</Text>
                    <Badge label={cat.is_active === 1 ? 'Aktif' : 'Non-Aktif'} variant={cat.is_active === 1 ? 'success' : 'default'} />
                  </View>
                  {cat.description ? <Text style={[styles.catDesc, { color: colors.textSecondary }]}>{cat.description}</Text> : null}
                </View>
                <View style={styles.rowActions}>
                  <Button title="Edit" variant="outline" size="sm" onPress={() => handleSelectEdit(cat)} />
                  <Button
                    title={cat.is_active === 1 ? 'Deaktivasi' : 'Aktivasi'}
                    variant={cat.is_active === 1 ? 'danger' : 'success'}
                    size="sm"
                    onPress={() => handleToggleActive(cat)}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  body: {
    padding: theme.spacing.lg,
  },
  formContainer: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
  },
  formTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  errorBanner: {
    backgroundColor: theme.colors.errorLight,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  listSectionTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  inactiveRow: {
    opacity: 0.6,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  catName: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  catDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
});
