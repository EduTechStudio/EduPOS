import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { CustomerEntity } from '@/database/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';

interface CustomerSelectorModalProps {
  visible: boolean;
  customers: CustomerEntity[];
  selectedCustomer: CustomerEntity | null;
  onSelect: (c: CustomerEntity | null) => void;
  onClose: () => void;
}

export function CustomerSelectorModal({
  visible,
  customers,
  selectedCustomer,
  onSelect,
  onClose,
}: CustomerSelectorModalProps) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Pilih Pelanggan</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.searchContainer, { borderBottomColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Cari pelanggan..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <ScrollView style={styles.list}>
            <TouchableOpacity 
              style={[
                styles.item,
                { borderBottomColor: colors.border },
                !selectedCustomer && { backgroundColor: colors.primarySoft },
              ]}
              onPress={() => { onSelect(null); onClose(); }}
            >
              <Text style={[styles.itemText, { color: colors.textPrimary }, !selectedCustomer && { color: colors.primary, fontWeight: '700' }]}>
                Pelanggan Umum (Tanpa Data)
              </Text>
            </TouchableOpacity>

            {filtered.length === 0 && search !== '' ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Pelanggan "{search}" tidak ditemukan.</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Tidak wajib membuat pelanggan baru.</Text>
                <Button 
                  title="Lanjut sebagai Pelanggan Umum" 
                  onPress={() => { onSelect(null); onClose(); }} 
                  style={{ marginTop: 10 }}
                />
              </View>
            ) : null}

            {filtered.map(c => {
              const isSelected = selectedCustomer?.id === c.id;
              return (
                <TouchableOpacity 
                  key={c.id} 
                  style={[
                    styles.item,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primarySoft },
                  ]}
                  onPress={() => { onSelect(c); onClose(); }}
                >
                  <Text style={[styles.itemText, { color: colors.textPrimary }, isSelected && { color: colors.primary, fontWeight: '700' }]}>{c.name}</Text>
                  {c.phone ? <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{c.phone}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  closeBtn: { padding: theme.spacing.xs },
  closeText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.textSecondary },
  searchContainer: {
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    ...theme.typography.bodyMedium,
  },
  list: { flexShrink: 1 },
  item: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSubtle,
  },
  itemSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  itemText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textPrimary,
  },
  itemTextSelected: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  itemSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  emptyBox: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySub: {
    ...theme.typography.caption,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 4,
  }
});
