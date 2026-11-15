import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TextInput, StyleSheet, Keyboard, Platform } from 'react-native';
import { BarcodeScanResult, physicalScannerService } from '@/services/barcode';

export interface PhysicalBarcodeScannerReceiverProps {
  /** Callback fired when a complete barcode is scanned */
  onScan: (result: BarcodeScanResult) => void | Promise<void>;
  /** Whether the scanner receiver is active (default true) */
  enabled?: boolean;
  /** Whether an on-screen manual input (e.g. search bar, customer modal, form input) is currently focused */
  isManualInputFocused?: boolean;
}

export const PhysicalBarcodeScannerReceiver: React.FC<PhysicalBarcodeScannerReceiverProps> = ({
  onScan,
  enabled = true,
  isManualInputFocused = false,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [value, setValue] = useState('');
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Focus request helper
  const requestScannerFocus = useCallback(() => {
    if (!isMountedRef.current) return;
    if (enabled && !isManualInputFocused) {
      // Small timeout to allow screen/modal layout to settle
      setTimeout(() => {
        if (isMountedRef.current && enabled && !isManualInputFocused) {
          inputRef.current?.focus();
        }
      }, 50);
    }
  }, [enabled, isManualInputFocused]);

  // Initial mount and prop updates
  useEffect(() => {
    isMountedRef.current = true;
    requestScannerFocus();

    // Listen to soft keyboard dismissal: restore scanner focus when user finishes manual typing
    const keyboardListener = Keyboard.addListener('keyboardDidHide', () => {
      requestScannerFocus();
    });

    return () => {
      isMountedRef.current = false;
      keyboardListener.remove();
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [requestScannerFocus]);

  // Handle Enter key submission from scanner
  const handleSubmitEditing = useCallback(() => {
    if (!value || !enabled) return;

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    const textToProcess = value;
    setValue('');
    inputRef.current?.clear();

    physicalScannerService.processRawInput(textToProcess, onScan);
  }, [value, enabled, onScan]);

  // Handle incoming text from USB HID scanner
  const handleChangeText = useCallback(
    (text: string) => {
      if (!enabled) return;

      // Check if text already contains Enter or Tab suffix
      if (/[\r\n\t]/.test(text)) {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        setValue('');
        inputRef.current?.clear();
        physicalScannerService.processRawInput(text, onScan);
        return;
      }

      setValue(text);

      // Fallback timer for scanners configured without a suffix (50ms of silence)
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }

      fallbackTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        const candidate = text.trim();
        if (candidate.length >= 3) {
          setValue('');
          inputRef.current?.clear();
          physicalScannerService.processRawInput(candidate, onScan);
        }
      }, 60);
    },
    [enabled, onScan]
  );

  return (
    <TextInput
      ref={inputRef}
      style={styles.hiddenInput}
      showSoftInputOnFocus={false}
      autoFocus={enabled && !isManualInputFocused}
      value={value}
      onChangeText={handleChangeText}
      onSubmitEditing={handleSubmitEditing}
      blurOnSubmit={false}
      caretHidden={true}
      autoCorrect={false}
      autoCapitalize="none"
      spellCheck={false}
      disableFullscreenUI={true}
      keyboardType="default"
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    />
  );
};

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.001,
    left: -9999,
    top: -9999,
    zIndex: -999,
  },
});
