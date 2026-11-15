import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, TouchableOpacity, Image, Switch, BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { businessTypePresets } from '@/config/businessTypePresets';
import { BusinessType } from '@/types/businessType';
import { settingsRepository } from '@/database';
import { theme, useTheme } from '@/theme';
import { defaultPOSConfig } from '@/config/defaultPOSConfig';
import { POSConfig } from '@/types/pos';

interface StoreProfile {
  name: string;
  address: string;
  phone: string;
  logo: string | null;
  businessType: BusinessType;
}

export default function StoreProfileScreen() {
  const { colors, isDark, setColorScheme } = useTheme();
  const [profile, setProfile] = useState<StoreProfile>({
    name: '',
    address: '',
    phone: '',
    logo: null,
    businessType: 'retail'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posConfig, setPosConfig] = useState<POSConfig>(defaultPOSConfig);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const setting = await settingsRepository.get('store_profile');
      const posSetting = await settingsRepository.get('pos_config');
      if (posSetting && posSetting.value) {
        setPosConfig(prev => ({ ...prev, ...JSON.parse(posSetting.value) }));
      }
      if (setting && setting.value) {
        const parsed = JSON.parse(setting.value);
        setProfile({
          name: parsed.name || '',
          address: parsed.address || '',
          phone: parsed.phone || '',
          logo: parsed.logo || null,
          businessType: parsed.businessType || 'retail'
        });
      }
    } catch (e) {
      console.error('Failed to load store profile', e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile.name.trim()) {
      Alert.alert('Validasi Gagal', 'Nama toko wajib diisi.');
      return;
    }
    
    setSaving(true);
    try {
      await settingsRepository.set('store_profile', JSON.stringify(profile), 'json');
      await settingsRepository.set('pos_config', JSON.stringify(posConfig), 'json');
      Alert.alert('Berhasil', 'Profil toko berhasil disimpan.');
    } catch (e: any) {
      Alert.alert('Gagal Menyimpan', e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickLogo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      
      // Save permanently to document directory
      const fileName = asset.uri.split('/').pop() || 'logo.jpg';
      const permanentUri = FileSystem.documentDirectory + 'store_logo_' + Date.now() + '_' + fileName;
      
      await FileSystem.copyAsync({
        from: asset.uri,
        to: permanentUri
      });

      setProfile({ ...profile, logo: permanentUri });
    } catch (err: any) {
      Alert.alert('Gagal', 'Gagal memilih berkas gambar: ' + err.message);
    }
  };

  const businessTypeOptions = Object.keys(businessTypePresets).map(key => ({
    label: businessTypePresets[key].name,
    value: key
  }));

  if (loading) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader title="Profil Toko" onBack={handleBack} />
          <View style={styles.loadingContainer}>
            <Text style={{ ...theme.typography.bodyMedium, color: colors.textSecondary }}>Memuat profil toko...</Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Profil Toko"
            subtitle="Kelola identitas, informasi, dan tampilan operasional toko"
            onBack={handleBack}
          />
          
          <Card variant="standard" style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Informasi Toko</Text>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Nama Toko *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={profile.name}
                onChangeText={(val) => setProfile({ ...profile, name: val })}
                placeholder="Nama toko Anda..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Alamat Toko</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={profile.address}
                onChangeText={(val) => setProfile({ ...profile, address: val })}
                placeholder="Jl. Merdeka No. 123&#10;Kota"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Nomor Telepon</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={profile.phone}
                onChangeText={(val) => setProfile({ ...profile, phone: val })}
                placeholder="08123456789"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={[styles.fieldGroup, { zIndex: 10 }]}>
              <Select
                label="Tipe Bisnis"
                selectedValue={profile.businessType}
                onSelect={(val) => setProfile({ ...profile, businessType: val as BusinessType })}
                options={businessTypeOptions}
              />
            </View>
          </Card>

          <Card variant="standard" style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tampilan Kasir (POS)</Text>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 2 }]}>Tampilkan Stok Produk</Text>
                  <Text style={{ ...theme.typography.caption, color: colors.textSecondary }}>
                    Tampilkan indikator stok pada kartu produk di kasir.
                  </Text>
                </View>
                <Switch
                  value={posConfig.productDisplay?.showStock ?? false}
                  onValueChange={(val) => setPosConfig({
                    ...posConfig,
                    productDisplay: { ...(posConfig.productDisplay || {}), showStock: val }
                  })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>

            <View style={[styles.fieldGroup, { zIndex: 9 }]}>
              <Select
                label="Format Tampilan Produk"
                selectedValue={posConfig.layout}
                onSelect={(val) => setPosConfig({ ...posConfig, layout: val as any })}
                options={[
                  { label: 'Kotak (Grid)', value: 'grid' },
                  { label: 'Daftar (List)', value: 'list' }
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 2 }]}>Tampilan Split Tablet</Text>
                  <Text style={{ ...theme.typography.caption, color: colors.textSecondary }}>
                    Tampilkan keranjang di samping produk pada layar tablet/lebar.
                  </Text>
                </View>
                <Switch
                  value={posConfig.tabletLayout.splitView}
                  onValueChange={(val) => setPosConfig({
                    ...posConfig,
                    tabletLayout: { ...posConfig.tabletLayout, splitView: val }
                  })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>
          </Card>

          <Card variant="standard" style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Identitas Visual (Logo)</Text>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Logo Toko</Text>
              <View style={styles.logoContainer}>
                {profile.logo ? (
                  <Image source={{ uri: profile.logo }} style={[styles.logoPreview, { borderColor: colors.border }]} />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Icon name="store" size={28} color={colors.textMuted} />
                    <Text style={[styles.logoPlaceholderText, { color: colors.textMuted, marginTop: 4 }]}>Tanpa Logo</Text>
                  </View>
                )}
                <View style={{ marginLeft: theme.spacing.md }}>
                  <Button 
                    title={profile.logo ? "Ganti Logo" : "Unggah Logo"} 
                    onPress={handlePickLogo}
                    variant="outline"
                  />
                  {profile.logo && (
                    <TouchableOpacity onPress={() => setProfile({ ...profile, logo: null })} style={{ marginTop: 8 }}>
                      <Text style={{ color: colors.error, fontSize: 14 }}>Hapus Logo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Card>

          <Card variant="standard" style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tema Tampilan Aplikasi</Text>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Mode Warna</Text>
              <Text style={{ ...theme.typography.caption, color: colors.textSecondary, marginBottom: theme.spacing.md }}>
                Pilih mode warna untuk seluruh tampilan antarmuka aplikasi EduPOS. Preferensi ini disimpan secara permanen.
              </Text>

              <View style={styles.themeSelectorContainer}>
                <TouchableOpacity
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: !isDark ? colors.surfaceSubtle : colors.surface,
                      borderColor: !isDark ? colors.primary : colors.border,
                      borderWidth: !isDark ? 2 : 1,
                    },
                  ]}
                  onPress={() => setColorScheme('light')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Pilih Mode Terang"
                >
                  <View style={[styles.themeOptionIcon, { backgroundColor: !isDark ? colors.primary : colors.surfaceSubtle }]}>
                    <Icon name="sun" size={20} color={!isDark ? colors.textInverse : colors.textPrimary} />
                  </View>
                  <Text style={[styles.themeOptionTitle, { color: colors.textPrimary }]}>Mode Terang</Text>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary }]}>Latar bersih, kontras tinggi</Text>
                  {!isDark && (
                    <View style={[styles.themeActiveBadge, { backgroundColor: colors.primary }]}>
                      <Icon name="check" size={12} color={colors.textInverse} style={{ marginRight: 4 }} />
                      <Text style={[styles.themeActiveText, { color: colors.textInverse }]}>Aktif</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: isDark ? colors.surfaceSubtle : colors.surface,
                      borderColor: isDark ? colors.primary : colors.border,
                      borderWidth: isDark ? 2 : 1,
                    },
                  ]}
                  onPress={() => setColorScheme('dark')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Pilih Mode Gelap"
                >
                  <View style={[styles.themeOptionIcon, { backgroundColor: isDark ? colors.primary : colors.surfaceSubtle }]}>
                    <Icon name="moon" size={20} color={isDark ? colors.textInverse : colors.textPrimary} />
                  </View>
                  <Text style={[styles.themeOptionTitle, { color: colors.textPrimary }]}>Mode Gelap</Text>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary }]}>Latar gelap nyaman di mata</Text>
                  {isDark && (
                    <View style={[styles.themeActiveBadge, { backgroundColor: colors.primary }]}>
                      <Icon name="check" size={12} color={colors.textInverse} style={{ marginRight: 4 }} />
                      <Text style={[styles.themeActiveText, { color: colors.textInverse }]}>Aktif</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          <View style={styles.saveContainer}>
            <Button
              title={saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              onPress={saveProfile}
              loading={saving}
              variant="primary"
              size="lg"
            />
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.header3,
    marginBottom: theme.spacing.sm,
  },
  divider: {
    height: 1,
    marginBottom: theme.spacing.lg,
  },
  fieldGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.bodyMedium,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    ...theme.typography.bodyMedium,
  },
  multilineInput: {
    minHeight: 80,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    backgroundColor: '#fff',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    ...theme.typography.caption,
  },
  saveContainer: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  themeSelectorContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  themeOptionCard: {
    flex: 1,
    minWidth: 140,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  themeOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  themeOptionTitle: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  themeOptionDesc: {
    ...theme.typography.caption,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  themeActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    marginTop: 8,
  },
  themeActiveText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
});
