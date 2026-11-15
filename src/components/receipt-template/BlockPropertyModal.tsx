import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';
import {
  ReceiptBlock,
  TextAlignment,
  FontSize,
  DividerStyle,
  SpacingSize,
  ALLOWED_PLACEHOLDER_TOKENS,
} from '@/types/receiptTemplate';

interface BlockPropertyModalProps {
  visible: boolean;
  block: ReceiptBlock | null;
  onClose: () => void;
  onSave: (updatedBlock: ReceiptBlock) => void;
}

export const BlockPropertyModal: React.FC<BlockPropertyModalProps> = ({
  visible,
  block,
  onClose,
  onSave,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<ReceiptBlock | null>(null);

  useEffect(() => {
    if (block) {
      setDraft(JSON.parse(JSON.stringify(block)));
    } else {
      setDraft(null);
    }
  }, [block, visible]);

  if (!draft) return null;

  const handleSave = () => {
    if (draft) {
      onSave(draft);
      onClose();
    }
  };

  const renderToggle = (
    label: string,
    description: string,
    value: boolean,
    onValueChange: (val: boolean) => void
  ) => (
    <View style={[styles.toggleRow, { borderBottomColor: colors.divider }]}>
      <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
        {description ? (
          <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );

  const renderAlignmentSelect = (
    value: TextAlignment,
    onChange: (val: TextAlignment) => void
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Perataan Teks (Alignment)</Text>
      <View style={styles.segmentGroup}>
        {(['left', 'center', 'right'] as TextAlignment[]).map((align) => {
          const isSelected = value === align;
          const label = align === 'left' ? 'Kiri' : align === 'center' ? 'Tengah' : 'Kanan';
          return (
            <TouchableOpacity
              key={align}
              style={[
                styles.segmentBtn,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary + '18' : colors.surfaceSubtle,
                },
              ]}
              onPress={() => onChange(align)}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '700' : '400' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderContent = () => {
    switch (draft.type) {
      case 'logo':
        return (
          <View>
            <View style={[styles.infoBanner, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Icon name="info" size={18} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                File logo dikonfigurasi pada menu Pengaturan &gt; Profil Toko. Di sini Anda dapat mengatur posisi cetak logo pada struk.
              </Text>
            </View>
            {renderAlignmentSelect(draft.align, (align) => setDraft({ ...draft, align }))}
          </View>
        );

      case 'store_header':
        return (
          <View>
            {renderToggle(
              'Tampilkan Nama Toko',
              'Cetak nama toko dari profil toko',
              draft.showStoreName,
              (v) => setDraft({ ...draft, showStoreName: v })
            )}
            {renderToggle(
              'Tampilkan Alamat Toko',
              'Cetak alamat lengkap toko',
              draft.showStoreAddress,
              (v) => setDraft({ ...draft, showStoreAddress: v })
            )}
            {renderToggle(
              'Tampilkan Nomor Telepon',
              'Cetak nomor kontak WhatsApp / telepon toko',
              draft.showStorePhone,
              (v) => setDraft({ ...draft, showStorePhone: v })
            )}
            <View style={{ marginTop: theme.spacing.md }}>
              {renderAlignmentSelect(draft.align, (align) => setDraft({ ...draft, align }))}
            </View>
          </View>
        );

      case 'custom_text':
        return (
          <View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Isi Pesan / Teks</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={3}
                placeholder="Tulis teks atau pesan kustom..."
                placeholderTextColor={colors.textMuted}
                value={draft.text}
                onChangeText={(text) => setDraft({ ...draft, text })}
              />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Mendukung variabel dinamis seperti:
              </Text>
              <View style={styles.tokensWrap}>
                {ALLOWED_PLACEHOLDER_TOKENS.slice(0, 6).map((tok) => (
                  <TouchableOpacity
                    key={tok}
                    style={[styles.tokenChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    onPress={() => setDraft({ ...draft, text: (draft.text ? draft.text + ' ' : '') + tok })}
                  >
                    <Text style={[styles.tokenText, { color: colors.primary }]}>{tok}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {renderAlignmentSelect(draft.align, (align) => setDraft({ ...draft, align }))}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Ukuran Teks</Text>
              <View style={styles.segmentGroup}>
                {(['small', 'normal', 'large'] as FontSize[]).map((sz) => {
                  const isSelected = draft.fontSize === sz;
                  const label = sz === 'small' ? 'Kecil' : sz === 'normal' ? 'Normal' : 'Besar';
                  return (
                    <TouchableOpacity
                      key={sz}
                      style={[
                        styles.segmentBtn,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + '18' : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => setDraft({ ...draft, fontSize: sz })}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '700' : '400' },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {renderToggle(
              'Cetak Huruf Tebal (Bold)',
              'Gunakan gaya huruf tebal saat dicetak printer',
              draft.bold,
              (v) => setDraft({ ...draft, bold: v })
            )}
          </View>
        );

      case 'divider':
        return (
          <View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Model Garis (Style)</Text>
              <View style={styles.segmentGroup}>
                {([
                  { id: 'single', label: 'Tunggal (—)' },
                  { id: 'double', label: 'Ganda (=)' },
                  { id: 'dashed', label: 'Putus (- -)' },
                  { id: 'dotted', label: 'Titik (..)' },
                ] as { id: DividerStyle; label: string }[]).map((st) => {
                  const isSelected = draft.style === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.segmentBtn,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + '18' : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => setDraft({ ...draft, style: st.id })}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '700' : '400' },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Spasi Vertikal</Text>
              <View style={styles.segmentGroup}>
                {(['none', 'small', 'medium', 'large'] as SpacingSize[]).map((sp) => {
                  const isSelected = draft.spacing === sp;
                  const label = sp === 'none' ? 'Rapat' : sp === 'small' ? 'Kecil' : sp === 'medium' ? 'Sedang' : 'Lebar';
                  return (
                    <TouchableOpacity
                      key={sp}
                      style={[
                        styles.segmentBtn,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + '18' : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => setDraft({ ...draft, spacing: sp })}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '700' : '400' },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        );

      case 'transaction_meta':
        return (
          <View>
            {renderToggle(
              'Nomor Transaksi / Nota',
              'Cetak nomor transaksi (contoh: TRX-20261017-001)',
              draft.showTransactionNumber,
              (v) => setDraft({ ...draft, showTransactionNumber: v })
            )}
            {renderToggle(
              'Tanggal & Waktu Transaksi',
              'Cetak tanggal dan jam saat transaksi dibayarkan',
              draft.showDateTime,
              (v) => setDraft({ ...draft, showDateTime: v })
            )}
            {renderToggle(
              'Nama Kasir',
              'Cetak nama akun staf/kasir yang memproses pesanan',
              draft.showCashier,
              (v) => setDraft({ ...draft, showCashier: v })
            )}
          </View>
        );

      case 'customer_info':
        return (
          <View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Label Info Pelanggan</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary },
                ]}
                placeholder="Contoh: Pelanggan / Customer"
                placeholderTextColor={colors.textMuted}
                value={draft.label}
                onChangeText={(text) => setDraft({ ...draft, label: text })}
              />
            </View>
          </View>
        );

      case 'item_list':
        return (
          <View>
            {renderToggle(
              'Tampilkan Kode SKU',
              'Cetak barcode/SKU di samping nama produk',
              draft.showSku,
              (v) => setDraft({ ...draft, showSku: v })
            )}
            {renderToggle(
              'Tampilkan Harga Satuan (@)',
              'Cetak rincian harga per unit (misal: 2 x Rp 15.000)',
              draft.showUnitPrice,
              (v) => setDraft({ ...draft, showUnitPrice: v })
            )}
            {renderToggle(
              'Format Rapat (Compact)',
              'Menghemat kertas dengan meminimalkan baris kosong',
              draft.compact,
              (v) => setDraft({ ...draft, compact: v })
            )}
          </View>
        );

      case 'subtotal':
      case 'discount':
      case 'tax':
      case 'change':
        return (
          <View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Label Teks</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary },
                ]}
                placeholder="Label pada struk"
                placeholderTextColor={colors.textMuted}
                value={draft.label}
                onChangeText={(text) => setDraft({ ...draft, label: text })}
              />
            </View>
          </View>
        );

      case 'total':
        return (
          <View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Label Total</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary },
                ]}
                placeholder="Contoh: TOTAL / TAGIHAN"
                placeholderTextColor={colors.textMuted}
                value={draft.label}
                onChangeText={(text) => setDraft({ ...draft, label: text })}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Ukuran Huruf Total</Text>
              <View style={styles.segmentGroup}>
                {(['normal', 'large'] as ('normal' | 'large')[]).map((sz) => {
                  const isSelected = draft.fontSize === sz;
                  const label = sz === 'normal' ? 'Normal' : 'Besar (Ganda)';
                  return (
                    <TouchableOpacity
                      key={sz}
                      style={[
                        styles.segmentBtn,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + '18' : colors.surfaceSubtle,
                        },
                      ]}
                      onPress={() => setDraft({ ...draft, fontSize: sz })}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: isSelected ? colors.primary : colors.textSecondary, fontWeight: isSelected ? '700' : '400' },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {renderToggle(
              'Cetak Tebal (Bold)',
              'Cetak teks total belanja dengan gaya tebal mencolok',
              draft.bold,
              (v) => setDraft({ ...draft, bold: v })
            )}
          </View>
        );

      case 'payments':
        return (
          <View>
            {renderToggle(
              'Tampilkan Nomor Referensi',
              'Cetak nomor referensi QRIS, kartu debit, atau transfer bank',
              draft.showReference,
              (v) => setDraft({ ...draft, showReference: v })
            )}
          </View>
        );

      case 'footer_text':
        return (
          <View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Isi Catatan Kaki (Footer)</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={3}
                placeholder="Contoh: Terima kasih telah berbelanja!"
                placeholderTextColor={colors.textMuted}
                value={draft.text}
                onChangeText={(text) => setDraft({ ...draft, text })}
              />
            </View>
            {renderAlignmentSelect(draft.align, (align) => setDraft({ ...draft, align }))}
          </View>
        );

      case 'spacer':
        return (
          <View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Jumlah Baris Kosong</Text>
              <View style={styles.stepperWrap}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                  onPress={() => setDraft({ ...draft, lines: Math.max(1, draft.lines - 1) })}
                  disabled={draft.lines <= 1}
                >
                  <Icon name="minus" size={20} color={draft.lines <= 1 ? colors.textMuted : colors.textPrimary} />
                </TouchableOpacity>

                <View style={[styles.stepperValue, { borderColor: colors.border }]}>
                  <Text style={[styles.stepperText, { color: colors.textPrimary }]}>{draft.lines} Baris</Text>
                </View>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                  onPress={() => setDraft({ ...draft, lines: Math.min(10, draft.lines + 1) })}
                  disabled={draft.lines >= 10}
                >
                  <Icon name="plus" size={20} color={draft.lines >= 10 ? colors.textMuted : colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Dapat diatur antara 1 hingga 10 baris kosong.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Properti Blok</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Tipe: {draft.type.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {renderToggle(
              'Aktifkan Blok Ini',
              'Blok ini akan dicetak jika diaktifkan',
              draft.visible,
              (v) => setDraft({ ...draft, visible: v })
            )}

            <View style={{ height: theme.spacing.md }} />
            {renderContent()}
            <View style={{ height: theme.spacing.lg }} />
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: colors.divider }]}>
            <Button
              title="Batal"
              variant="outline"
              size="md"
              onPress={onClose}
              style={{ flex: 1, marginRight: theme.spacing.sm }}
            />
            <Button
              title="Terapkan"
              variant="primary"
              size="md"
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  body: {
    flexGrow: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  field: {
    marginTop: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? theme.spacing.sm : 8,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
  tokensWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tokenChip: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tokenText: {
    fontSize: 11,
    fontWeight: '600',
  },
  segmentGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    height: 44,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  stepperText: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
  },
});
