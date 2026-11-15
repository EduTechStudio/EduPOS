import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { customerRepository } from '@/database';
import { CustomerEntity } from '@/database/types';
import { theme, useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';

export default function CustomersScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState<CustomerEntity[]>([]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/more');
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

  if (!hasPermission('customer.view')) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader
            title="Direktori Pelanggan"
            subtitle="Kelola data dan kontak pelanggan toko"
            onBack={handleBack}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
            <Text style={{ ...theme.typography.header3, color: colors.error }}>Akses Ditolak</Text>
            <Text style={{ ...theme.typography.bodySmall, color: colors.textSecondary, marginTop: 4 }}>
              Anda tidak memiliki izin untuk melihat direktori pelanggan.
            </Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerEntity | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const loadCustomers = useCallback(async () => {
    try {
      const allCustomers = await customerRepository.getAll();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleOpenModal = (customer?: CustomerEntity) => {
    if (customer) {
      setEditingCustomer(customer);
      setName(customer.name);
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
    } else {
      setEditingCustomer(null);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Peringatan', 'Nama pelanggan wajib diisi.');
      return;
    }
    
    try {
      if (editingCustomer) {
        await customerRepository.update(editingCustomer.id, {
          name,
          phone: phone || null,
          email: email || null,
          address: address || null,
        });
      } else {
        await customerRepository.create({
          id: 'cust_' + Date.now(),
          name,
          phone: phone || null,
          email: email || null,
          address: address || null,
          notes: null,
          is_active: 1
        });
      }
      setModalVisible(false);
      loadCustomers();
    } catch (error) {
      console.error('Save failed', error);
      Alert.alert('Gagal', 'Gagal menyimpan data pelanggan.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Hapus Pelanggan', 'Apakah Anda yakin ingin menghapus data pelanggan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await customerRepository.softDelete(id);
            loadCustomers();
          } catch (error) {
            Alert.alert('Gagal', 'Gagal menghapus data pelanggan.');
          }
        }
      }
    ]);
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <ScreenContainer scrollable={false}>
      <ResponsiveContainer style={{ flex: 1 }}>
        <SectionHeader
          title="Direktori Pelanggan"
          subtitle="Kelola data dan kontak pelanggan toko"
          onBack={handleBack}
          rightElement={hasPermission('customer.create') ? (
            <Button
              title="+ Tambah Pelanggan"
              variant="primary"
              size="sm"
              onPress={() => handleOpenModal()}
            />
          ) : undefined}
        />

        <Input 
          placeholder="Cari nama atau nomor telepon pelanggan..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Icon name="search" size={18} color={colors.textMuted} />}
        />

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {filteredCustomers.length === 0 ? (
            <Card
              variant="subtle"
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  alignItems: 'center',
                  paddingVertical: 36,
                  paddingHorizontal: 20,
                },
              ]}
            >
              <Icon name="customers" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 12 }]}>
                {searchQuery ? 'Pelanggan Tidak Ditemukan' : 'Belum Ada Pelanggan'}
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 4 }]}>
                {searchQuery
                  ? `Tidak ada data yang cocok dengan "${searchQuery}".`
                  : 'Daftarkan pelanggan toko untuk memudahkan pencatatan dan riwayat transaksi.'}
              </Text>
              {!searchQuery && hasPermission('customer.create') && (
                <Button
                  title="+ Tambah Pelanggan"
                  variant="primary"
                  size="sm"
                  onPress={() => handleOpenModal()}
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>
          ) : (
            filteredCustomers.map((cust) => (
              <Card
                key={cust.id}
                variant="standard"
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>{cust.name}</Text>
                    <Text style={[styles.phone, { color: colors.textSecondary }]}>
                      {cust.phone || 'Tanpa no. telepon'}
                    </Text>
                    {cust.address ? (
                      <Text style={[styles.address, { color: colors.textMuted }]} numberOfLines={1}>
                        {cust.address}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {hasPermission('customer.edit') && (
                      <Button title="Ubah" variant="outline" size="sm" onPress={() => handleOpenModal(cust)} />
                    )}
                    {hasPermission('customer.delete') && (
                      <Button title="Hapus" variant="danger" size="sm" onPress={() => handleDelete(cust.id)} />
                    )}
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </ResponsiveContainer>

      {/* Customer Form Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingCustomer ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.closeButton, { backgroundColor: colors.surfaceSubtle }]}
              >
                <Icon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Input label="Nama Lengkap *" value={name} onChangeText={setName} placeholder="contoh: Budi Santoso" />
            <Input label="No. Telepon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="contoh: 08123456789" />
            <Input label="Alamat Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="contoh: budi@email.com" />
            <Input label="Alamat" value={address} onChangeText={setAddress} placeholder="contoh: Jl. Merdeka No. 10" />
            
            <View style={styles.modalActions}>
              <Button title="Batal" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Simpan" variant="primary" onPress={handleSave} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...theme.typography.header3,
  },
  phone: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  address: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  infoCard: {
    marginTop: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.header3,
    textAlign: 'center',
  },
  infoText: {
    ...theme.typography.bodySmall,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...theme.typography.header3,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  }
});
