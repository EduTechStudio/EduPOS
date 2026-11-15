import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { theme, useTheme } from '@/theme';
import { ReceiptTemplate, ReceiptWidth } from '@/types/receiptTemplate';
import { receiptTemplateService } from '@/services/receipt/ReceiptTemplateService';
import { CreateTemplateModal } from '@/components/receipt-template/CreateTemplateModal';
import { RenameTemplateModal } from '@/components/receipt-template/RenameTemplateModal';

export default function ReceiptTemplatesManagerScreen() {
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('receipt.manage');

  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ReceiptTemplate | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings/receipt-printer');
    }
  }, []);

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

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiptTemplateService.getTemplatesConfig();
      setTemplates(res.config.templates);
      setActiveTemplateId(res.config.activeTemplateId);
      if (res.error) {
        console.warn('Receipt templates fallback notice:', res.error);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memuat Template', e?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates])
  );

  // Set Active Template
  const handleSetActive = async (templateId: string) => {
    setActionLoading(true);
    try {
      const res = await receiptTemplateService.setActiveTemplateId(templateId);
      if (res.success) {
        setActiveTemplateId(templateId);
      } else {
        Alert.alert('Gagal Mengaktifkan Template', res.error || 'Terjadi kesalahan.');
      }
    } catch (e: any) {
      Alert.alert('Kesalahan', e?.message || 'Gagal mengubah template aktif.');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Template
  const handleCreateTemplate = async (name: string, paperWidth: ReceiptWidth) => {
    setActionLoading(true);
    try {
      const res = await receiptTemplateService.createNewTemplate(name, paperWidth);
      if (res.success && res.template) {
        setCreateModalVisible(false);
        await loadTemplates();
        router.push({
          pathname: '/settings/receipt-templates/[id]',
          params: { id: res.template.id },
        });
      } else {
        Alert.alert('Gagal Membuat Template', res.error || 'Terjadi kesalahan.');
      }
    } catch (e: any) {
      Alert.alert('Kesalahan', e?.message || 'Gagal membuat template.');
    } finally {
      setActionLoading(false);
    }
  };

  // Duplicate Template
  const handleDuplicate = (template: ReceiptTemplate) => {
    Alert.alert(
      'Duplikasi Template',
      `Buat salinan dari template "${template.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Duplikasi',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await receiptTemplateService.duplicateTemplate(template.id);
              if (res.success) {
                await loadTemplates();
              } else {
                Alert.alert('Gagal Menduplikasi', res.error || 'Terjadi kesalahan.');
              }
            } catch (e: any) {
              Alert.alert('Kesalahan', e?.message || 'Gagal menduplikasi template.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Rename Template
  const handleRenameSubmit = async (newName: string) => {
    if (!renameTarget) return;
    setActionLoading(true);
    try {
      const res = await receiptTemplateService.renameTemplate(renameTarget.id, newName);
      if (res.success) {
        setRenameTarget(null);
        await loadTemplates();
      } else {
        Alert.alert('Gagal Mengubah Nama', res.error || 'Terjadi kesalahan.');
      }
    } catch (e: any) {
      Alert.alert('Kesalahan', e?.message || 'Gagal mengubah nama template.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Template
  const handleDelete = (template: ReceiptTemplate) => {
    if (templates.length <= 1) {
      Alert.alert(
        'Tidak Dapat Menghapus',
        'Sistem membutuhkan minimal satu template aktif untuk mencetak struk belanja.'
      );
      return;
    }

    Alert.alert(
      'Hapus Template',
      `Apakah Anda yakin ingin menghapus template "${template.name}"? Tindakan ini tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await receiptTemplateService.deleteTemplate(template.id);
              if (res.success) {
                await loadTemplates();
              } else {
                Alert.alert('Gagal Menghapus', res.error || 'Terjadi kesalahan.');
              }
            } catch (e: any) {
              Alert.alert('Kesalahan', e?.message || 'Gagal menghapus template.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Reset all to default
  const handleResetToDefault = () => {
    Alert.alert(
      'Reset Template Bawaan',
      'Kembalikan seluruh konfigurasi template ke standar bawaan EduPOS? Template kustom Anda akan digantikan dengan template standar.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset ke Bawaan',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await receiptTemplateService.resetToDefault();
              if (res.success) {
                await loadTemplates();
                Alert.alert('Berhasil', 'Template berhasil direset ke standar bawaan.');
              } else {
                Alert.alert('Gagal Reset', res.error || 'Terjadi kesalahan.');
              }
            } catch (e: any) {
              Alert.alert('Kesalahan', e?.message || 'Gagal mereset template.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!canManage) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader title="Desain Template Struk" onBack={handleBack} />
          <View style={[styles.centerWrap, { padding: theme.spacing.xl }]}>
            <Icon name="alert" size={48} color={theme.colors.error} />
            <Text style={[styles.accessDeniedTitle, { color: theme.colors.error }]}>Akses Ditolak</Text>
            <Text style={[styles.accessDeniedDesc, { color: colors.textSecondary }]}>
              Anda tidak memiliki izin (receipt.manage) untuk mengelola template struk belanja.
            </Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Desain Template Struk"
            subtitle="Kelola desain tata letak, ukuran kertas, dan blok informasi struk"
            onBack={handleBack}
            rightElement={
              <Button
                title="+ Template Baru"
                variant="primary"
                size="sm"
                onPress={() => setCreateModalVisible(true)}
              />
            }
          />

          {loading ? (
            <View style={[styles.centerWrap, { padding: theme.spacing.xxl }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ ...theme.typography.bodyMedium, color: colors.textSecondary, marginTop: 12 }}>
                Memuat template struk...
              </Text>
            </View>
          ) : (
            <View style={styles.contentWrap}>
              {templates.map((tmpl) => {
                const isActive = tmpl.id === activeTemplateId;
                const visibleBlocksCount = tmpl.blocks.filter((b) => b.visible).length;

                return (
                  <Card
                    key={tmpl.id}
                    variant="standard"
                    style={[
                      styles.templateCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isActive ? colors.primary : colors.border,
                        borderWidth: isActive ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.templateName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {tmpl.name}
                          </Text>
                          {isActive && (
                            <Badge label="Aktif Digunakan" variant="success" style={{ marginLeft: 8 }} />
                          )}
                        </View>

                        <View style={styles.badgeRow}>
                          <Badge
                            label={`Kertas ${tmpl.paperWidth}`}
                            variant={tmpl.paperWidth === '80mm' ? 'primary' : 'default'}
                          />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {visibleBlocksCount} dari {tmpl.blocks.length} blok aktif
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.cardDivider, { backgroundColor: colors.divider }]} />

                    <View style={styles.cardFooter}>
                      <View style={styles.leftActions}>
                        {!isActive && (
                          <Button
                            title="Gunakan"
                            variant="outline"
                            size="sm"
                            loading={actionLoading}
                            onPress={() => handleSetActive(tmpl.id)}
                            style={{ marginRight: theme.spacing.xs }}
                          />
                        )}

                        <Button
                          title="Edit Blok"
                          variant="primary"
                          size="sm"
                          onPress={() =>
                            router.push({
                              pathname: '/settings/receipt-templates/[id]',
                              params: { id: tmpl.id },
                            })
                          }
                        />
                      </View>

                      <View style={styles.iconActions}>
                        <TouchableOpacity
                          style={[styles.actionIconBtn, { backgroundColor: colors.surfaceSubtle }]}
                          onPress={() => handleDuplicate(tmpl)}
                          accessibilityLabel="Duplikasi template"
                        >
                          <Icon name="copy" size={16} color={colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionIconBtn, { backgroundColor: colors.surfaceSubtle }]}
                          onPress={() => setRenameTarget(tmpl)}
                          accessibilityLabel="Ubah nama template"
                        >
                          <Icon name="edit" size={16} color={colors.textPrimary} />
                        </TouchableOpacity>

                        {templates.length > 1 && (
                          <TouchableOpacity
                            style={[styles.actionIconBtn, { backgroundColor: theme.colors.error + '14' }]}
                            onPress={() => handleDelete(tmpl)}
                            accessibilityLabel="Hapus template"
                          >
                            <Icon name="trash" size={16} color={theme.colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}

              {/* Safe Reset Section */}
              <View style={styles.resetWrap}>
                <Button
                  title="Reset Semua ke Template Standar"
                  variant="outline"
                  size="sm"
                  onPress={handleResetToDefault}
                />
              </View>
            </View>
          )}

          <CreateTemplateModal
            visible={createModalVisible}
            onClose={() => setCreateModalVisible(false)}
            onSubmit={handleCreateTemplate}
            loading={actionLoading}
          />

          <RenameTemplateModal
            visible={Boolean(renameTarget)}
            initialName={renameTarget?.name || ''}
            onClose={() => setRenameTarget(null)}
            onSubmit={handleRenameSubmit}
            loading={actionLoading}
          />
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    paddingBottom: theme.spacing.xxl,
  },
  templateCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
  },
  cardDivider: {
    height: 1,
    marginVertical: theme.spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetWrap: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
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
