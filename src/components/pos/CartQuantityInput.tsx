import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { parseQuantityInput, formatQuantity, isDecimalAllowedForUnit } from '@/utils/quantity';
import { theme, useTheme } from '@/theme';

export interface CartQuantityInputProps {
  quantity: number;
  unit?: string;
  isStockTracked?: boolean;
  availableStock?: number;
  onCommitQuantity: (newQty: number) => void;
  onIncrement: () => void;
  onDecrement: () => void;
  compact?: boolean;
}

export const CartQuantityInput: React.FC<CartQuantityInputProps> = ({
  quantity,
  unit = 'pcs',
  isStockTracked = false,
  availableStock,
  onCommitQuantity,
  onIncrement,
  onDecrement,
  compact = false,
}) => {
  const { colors } = useTheme();
  const allowDecimal = isDecimalAllowedForUnit(unit);
  const [localText, setLocalText] = useState(formatQuantity(quantity));
  const [isFocused, setIsFocused] = useState(false);

  // Sync external quantity changes when not actively editing
  useEffect(() => {
    if (!isFocused) {
      setLocalText(formatQuantity(quantity));
    }
  }, [quantity, isFocused]);

  const handleCommit = () => {
    setIsFocused(false);
    const trimmed = localText.trim();

    // If left empty, restore previous valid quantity without mutating cart
    if (trimmed === '') {
      setLocalText(formatQuantity(quantity));
      return;
    }

    const parsed = parseQuantityInput(trimmed, { allowDecimal });

    if (parsed === null || parsed < 0) {
      Alert.alert(
        'Kuantitas Tidak Valid',
        allowDecimal
          ? 'Masukkan angka kuantitas yang valid (contoh: 1 atau 0.5).'
          : `Satuan "${unit}" hanya menerima bilangan bulat (contoh: 1, 2, 5).`
      );
      setLocalText(formatQuantity(quantity));
      return;
    }

    if (parsed === 0) {
      onCommitQuantity(0);
      return;
    }

    if (isStockTracked && availableStock !== undefined && parsed > availableStock) {
      Alert.alert(
        'Batas Stok',
        `Stok tidak mencukupi. Tersedia: ${formatQuantity(availableStock)} ${unit}`
      );
      setLocalText(formatQuantity(quantity));
      return;
    }

    if (parsed !== quantity) {
      onCommitQuantity(parsed);
    }
    setLocalText(formatQuantity(parsed));
  };

  const isIncrementDisabled =
    isStockTracked && availableStock !== undefined && quantity >= availableStock;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onDecrement}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[
          styles.qtyBtn,
          compact && styles.qtyBtnCompact,
          { backgroundColor: colors.primary },
        ]}
      >
        <Text style={[styles.qtyBtnText, compact && styles.qtyBtnTextCompact]}>-</Text>
      </TouchableOpacity>

      <TextInput
        value={localText}
        onChangeText={setLocalText}
        onFocus={() => setIsFocused(true)}
        onBlur={handleCommit}
        onSubmitEditing={handleCommit}
        keyboardType={allowDecimal ? 'decimal-pad' : 'numeric'}
        selectTextOnFocus
        accessibilityLabel="Kuantitas produk"
        style={[
          styles.input,
          compact && styles.inputCompact,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderColor: isFocused ? colors.primary : colors.border,
          },
          isFocused && styles.inputFocused,
        ]}
      />

      <TouchableOpacity
        onPress={onIncrement}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        disabled={isIncrementDisabled}
        style={[
          styles.qtyBtn,
          compact && styles.qtyBtnCompact,
          { backgroundColor: colors.primary },
          isIncrementDisabled && styles.qtyBtnDisabled,
        ]}
      >
        <Text style={[styles.qtyBtnText, compact && styles.qtyBtnTextCompact]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnCompact: {
    width: 26,
    height: 26,
  },
  qtyBtnText: {
    ...theme.typography.button,
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  qtyBtnTextCompact: {
    fontSize: 14,
    lineHeight: 16,
  },
  qtyBtnDisabled: {
    opacity: 0.35,
  },
  input: {
    minWidth: 44,
    height: 30,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 0,
    fontSize: 13,
    fontWeight: '600',
  },
  inputCompact: {
    minWidth: 38,
    height: 26,
    fontSize: 12,
  },
  inputFocused: {
    borderWidth: 1.5,
  },
});
