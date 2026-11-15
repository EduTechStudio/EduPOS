import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { theme, useTheme } from '@/theme';
import { ReceiptBlock, ReceiptTemplate, ReceiptWidth } from '@/types/receiptTemplate';
import { receiptTemplateService } from '@/services/receipt/ReceiptTemplateService';
import {
  addBlock,
  removeBlock,
  reorderBlocks,
  updateBlock,
  validateReceiptTemplate,
} from '@/services/receipt/templateOperations';
import { BlockItemRow } from '@/components/receipt-template/BlockItemRow';
import { BlockPropertyModal } from '@/components/receipt-template/BlockPropertyModal';
import { AddBlockModal } from '@/components/receipt-template/AddBlockModal';
import { ReceiptPreviewModal } from '@/components/receipt/ReceiptPreviewModal';
import { createSampleReceiptData } from '@/services/receipt/ReceiptService';

export default function ReceiptBlockEditorScreen() {
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('receipt.manage');

  const { id } = useLocalSearchParams<{ id: string }>();

  const [savedTemplate, setSavedTemplate] = useState<ReceiptTemplate | null>(null);
  const [draftTemplate, setDraftTemplate] = useState<ReceiptTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [editingBlock, setEditingBlock] = useState<ReceiptBlock | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const sampleData = React.useMemo(() => createSampleReceiptData(), []);

  const hasUnsavedChanges = Boolean(
    savedTemplate &&
      draftTemplate &&
      JSON.stringify(savedTemplate) !== JSON.stringify(draftTemplate)
  );

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Perubahan Belum Disimpan',
        'Anda memiliki perubahan pada susunan blok struk yang belum disimpan. Yakin ingin keluar?',
        [
          { text: 'Tetap di Sini', style: 'cancel' },
          {
            text: 'Buang Perubahan',
            style: 'destructive',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/settings/receipt-templates');
              }
            },
          },
        ]
      );
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/settings/receipt-templates');
      }
    }
  }, [hasUnsavedChanges]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleBack])
  );

  useEffect(() => {
    if (!id) return;
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const tmpl = await receiptTemplateService.getTemplateById(id);
      if (tmpl) {
        setSavedTemplate(tmpl);
        setDraftTemplate(JSON.parse(JSON.stringify(tmpl)));
      } else {
        Alert.alert('Template Tidak Ditemukan', 'Template struk yang diminta tidak dapat ditemukan.', [
          { text: 'Kembali', onPress: handleBack },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Kesalahan', e?.message || 'Gagal memuat template.');
    } finally {
      setLoading(false);
    }
  };

  // Reorder Block
  const handleMoveBlock = (fromIndex: number, toIndex: number) => {
    if (!draftTemplate) return;
    const updated = reorderBlocks(draftTemplate, fromIndex, toIndex);
    setDraftTemplate(updated);
  };

  // Toggle Block Visibility
  const handleToggleVisible = (blockId: string, visible: boolean) => {
    if (!draftTemplate) return;
    const updated = updateBlock(draftTemplate, blockId, { visible });
    setDraftTemplate(updated);
  };

  // Remove Block
  const handleDeleteBlock = (block: ReceiptBlock) => {
    if (!draftTemplate) return;
    Alert.alert(
      'Hapus Blok Struk',
      `Apakah Anda yakin ingin menghapus blok "${block.type.replace('_', ' ')}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            const updated = removeBlock(draftTemplate, block.id);
            setDraftTemplate(updated);
          },
        },
      ]
    );
  };

  // Add Block
  const handleAddBlock = (newBlock: ReceiptBlock) => {
    if (!draftTemplate) return;
    const updated = addBlock(draftTemplate, newBlock);
    setDraftTemplate(updated);
  };

  // Update Block from Modal
  const handleSaveBlockProperties = (updatedBlock: ReceiptBlock) => {
    if (!draftTemplate) return;
    const updated = updateBlock(draftTemplate, updatedBlock.id, updatedBlock);
    setDraftTemplate(updated);
  };

  // Update Paper Width
  const handlePaperWidthChange = (width: ReceiptWidth) => {
    if (!draftTemplate) return;
    setDraftTemplate({
      ...draftTemplate,
      paperWidth: width,
      updatedAt: new Date().toISOString(),
    });
  };

  // Save Entire Template
  const handleSaveTemplate = async () => {
    if (!draftTemplate) return;

    // Validate draft
    const validation = validateReceiptTemplate(draftTemplate);
    if (!validation.valid || !validation.sanitized) {
      Alert.alert(
        'Validasi Template Gagal',
        validation.errors.join('\n') || 'Terdapat kesalahan pada data blok struk.'
      );
      return;
    }

    setSaving(true);
    try {
      const res = await receiptTemplateService.saveTemplate(validation.sanitized);
      if (res.success) {
        setSavedTemplate(validation.sanitized);
        setDraftTemplate(JSON.parse(JSON.stringify(validation.sanitized)));
        Alert.alert('Tersimpan', 'Perubahan template struk berhasil disimpan.');
      } else {
        Alert.alert('Gagal Menyimpan', res.error || 'Terjadi kesalahan sistem.');
      }
    } catch (e: any) {
      Alert.alert('Kesalahan', e?.message || 'Gagal menyimpan template.');
    } finally {
      setSaving(false);
    }
  };

  // Discard draft
  const handleDiscardDraft = () => {
    if (!savedTemplate) return;
    Alert.alert(
      'Buang Perubahan',
      'Kembalikan seluruh susunan blok ke kondisi terakhir yang tersimpan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buang',
          style: 'destructive',
          onPress: () => {
            setDraftTemplate(JSON.parse(JSON.stringify(savedTemplate)));
          },
        },
      ]
    );
  };

  if (!canManage) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader title="Editor Template Struk" onBack={handleBack} />
          <View style={[styles.centerWrap, { padding: theme.spacing.xl }]}>
            <Icon name="alert" size={48} color={theme.colors.error} />
            <Text style={[styles.accessDeniedTitle, { color: theme.colors.error }]}>Akses Ditolak</Text>
            <Text style={[styles.accessDeniedDesc, { color: colors.textSecondary }]}>
              Anda tidak memiliki izin (receipt.manage) untuk mengedit template struk belanja.
            </Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  if (loading || !draftTemplate) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader title="Editor Template Struk" onBack={handleBack} />
          <View style={[styles.centerWrap, { padding: theme.spacing.xxl }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ ...theme.typography.bodyMedium, color: colors.textSecondary, marginTop: 12 }}>
              Memuat editor struk...
            </Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  const activeBlocksCount = draftTemplate.blocks.filter((b) => b.visible).length;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title={draftTemplate.name}
            subtitle={`Atur urutan dan isi informasi cetak pada kertas ${draftTemplate.paperWidth}`}
            onBack={handleBack}
            rightElement={
              <View style={styles.topRightActions}>
                <Button
                  title="Pratinjau"
                  variant="outline"
                  size="sm"
                  onPress={() => setPreviewVisible(true)}
                  style={{ marginRight: theme.spacing.xs }}
                />
                {hasUnsavedChanges && (
                  <Button
                    title="Batal"
                    variant="outline"
                    size="sm"
                    onPress={handleDiscardDraft}
                    style={{ marginRight: theme.spacing.xs }}
                  />
                )}
                <Button
                  title="Simpan"
                  variant="primary"
                  size="sm"
                  loading={saving}
                  onPress={handleSaveTemplate}
                />
              </View>
            }
          />

          {/* Unsaved changes banner */}
          {hasUnsavedChanges && (
            <View style={[styles.unsavedBanner, { backgroundColor: colors.primary + '14', borderColor: colors.primary }]}>
              <Icon name="info" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.unsavedText, { color: colors.primary }]}>
                Ada perubahan belum tersimpan. Tekan tombol Simpan di atas untuk memperbarui.
              </Text>
            </View>
          )}

          {/* Template Configuration Overview Card */}
          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.overviewHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Pengaturan Kertas & Blok</Text>
              <View style={styles.badgesWrap}>
                <Badge label={`${activeBlocksCount} Blok Aktif`} variant="primary" />
                <Badge label={`${draftTemplate.blocks.length} Total Blok`} variant="default" />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.paperWidthField}>
              <Select
                label="Format Lebar Kertas Struk"
                selectedValue={draftTemplate.paperWidth}
                onSelect={(val) => handlePaperWidthChange(val as ReceiptWidth)}
                options={[
                  { label: '80mm (Iware MP-81MPO / Lebar)', value: '80mm' },
                  { label: '58mm (Standar Portabel Mini)', value: '58mm' },
                ]}
              />
            </View>
          </Card>

          {/* Block List Card */}
          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.blockListHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Urutan Elemen Struk</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Gunakan panah untuk mengubah posisi atau edit untuk mengubah teks &amp; tampilan.
                </Text>
              </View>
              <Button
                title="+ Tambah Blok"
                variant="outline"
                size="sm"
                onPress={() => setAddModalVisible(true)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {draftTemplate.blocks.length === 0 ? (
              <View style={[styles.emptyWrap, { padding: theme.spacing.xl }]}>
                <Icon name="info" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Belum ada blok struk. Tekan tombol "+ Tambah Blok" untuk menyusun struk belanja.
                </Text>
              </View>
            ) : (
              <View style={styles.blocksContainer}>
                {draftTemplate.blocks.map((block, idx) => (
                  <BlockItemRow
                    key={block.id}
                    block={block}
                    index={idx}
                    totalBlocks={draftTemplate.blocks.length}
                    onMoveUp={() => handleMoveBlock(idx, idx - 1)}
                    onMoveDown={() => handleMoveBlock(idx, idx + 1)}
                    onToggleVisible={(visible) => handleToggleVisible(block.id, visible)}
                    onEdit={() => setEditingBlock(block)}
                    onDelete={() => handleDeleteBlock(block)}
                  />
                ))}
              </View>
            )}

            <View style={styles.bottomAddBtnWrap}>
              <Button
                title="+ Tambah Blok Lainnya"
                variant="outline"
                size="md"
                onPress={() => setAddModalVisible(true)}
              />
            </View>
          </Card>

          <View style={{ height: theme.spacing.xxl }} />

          {/* Property Modal */}
          <BlockPropertyModal
            visible={Boolean(editingBlock)}
            block={editingBlock}
            onClose={() => setEditingBlock(null)}
            onSave={handleSaveBlockProperties}
          />

          {/* Add Block Modal */}
          <AddBlockModal
            visible={addModalVisible}
            onClose={() => setAddModalVisible(false)}
            onAddBlock={handleAddBlock}
          />

          {/* Receipt Preview Modal for Drafts */}
          <ReceiptPreviewModal
            visible={previewVisible}
            receiptData={sampleData}
            template={draftTemplate}
            onClose={() => setPreviewVisible(false)}
          />
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badgesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.md,
  },
  paperWidthField: {
    zIndex: 10,
  },
  blockListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  blocksContainer: {
    marginTop: theme.spacing.xs,
  },
  bottomAddBtnWrap: {
    marginTop: theme.spacing.md,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unsavedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  unsavedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  accessDeniedDesc: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
});
