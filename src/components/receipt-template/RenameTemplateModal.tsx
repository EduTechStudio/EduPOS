import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';

interface RenameTemplateModalProps {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onSubmit: (newName: string) => Promise<void>;
  loading?: boolean;
}

export const RenameTemplateModal: React.FC<RenameTemplateModalProps> = ({
  visible,
  initialName,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const { colors } = useTheme();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
    }
  }, [visible, initialName]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nama template tidak boleh kosong');
      return;
    }
    setError(null);
    await onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Ubah Nama Template</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Nama Template</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: error ? theme.colors.error : colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Masukkan nama template"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null);
              }}
              autoFocus
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.actions}>
            <Button
              title="Batal"
              variant="outline"
              size="md"
              onPress={onClose}
              disabled={loading}
              style={{ flex: 1, marginRight: theme.spacing.sm }}
            />
            <Button
              title="Simpan Nama"
              variant="primary"
              size="md"
              loading={loading}
              onPress={handleSubmit}
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
    padding: theme.spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
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
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  field: {
    marginBottom: theme.spacing.md,
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
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.sm,
  },
});
