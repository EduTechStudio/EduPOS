import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { theme, useTheme } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { authService, AuthLockoutError } from '@/services/auth/AuthService';

function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} detik`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m} menit ${s} detik` : `${m} menit`;
}

export function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { login, isLoading } = useAuth();
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const isSubmittingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLocked = lockoutSeconds > 0;

  // Load persisted lockout state on mount
  useEffect(() => {
    let isMounted = true;

    const loadLockoutStatus = async () => {
      try {
        const status = await authService.getLockoutStatus();
        if (!isMounted) return;
        if (status.isLocked) {
          setLockoutSeconds(status.remainingSeconds);
          setShowWarning(false);
        } else {
          setLockoutSeconds(0);
          setShowWarning(status.isWarning);
        }
      } catch {
        // Non-blocking query failure
      }
    };

    loadLockoutStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  // 1-second countdown timer for active lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Cooldown finished: re-query status to update warning state
          authService.getLockoutStatus().then(status => {
            setShowWarning(status.isWarning);
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [lockoutSeconds > 0]);

  const handleKeyPress = (num: string) => {
    if (isLoggingIn || isSubmittingRef.current || isLocked) return;
    if (pin.length < 6) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (isLoggingIn || isSubmittingRef.current || isLocked) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (pin.length === 0 || isSubmittingRef.current || isLoggingIn || isLoading || isLocked) return;
    isSubmittingRef.current = true;
    setIsLoggingIn(true);
    try {
      const success = await login(pin);
      if (!success) {
        const status = await authService.getLockoutStatus();
        if (status.isWarning) {
          setShowWarning(true);
          Alert.alert(
            'Peringatan Keamanan',
            'PIN salah sebanyak 4 kali. 1 percobaan gagal lagi akan mengunci aplikasi selama 30 detik.'
          );
        } else {
          Alert.alert('Gagal Masuk', 'PIN tidak valid atau akun tidak aktif.');
        }
        setPin('');
      } else {
        setShowWarning(false);
        setLockoutSeconds(0);
      }
    } catch (err: any) {
      if (err instanceof AuthLockoutError || err.code === 'AUTH_LOCKOUT') {
        const remaining = err.remainingSeconds || 30;
        setLockoutSeconds(remaining);
        setShowWarning(false);
        Alert.alert(
          'Aplikasi Terkunci',
          `Terlalu banyak percobaan PIN salah. Silakan coba lagi dalam ${formatRemainingTime(remaining)}.`
        );
      } else if (err.code === 'AMBIGUOUS_PIN') {
        Alert.alert('Gagal Masuk', err.message);
      } else {
        Alert.alert('Gagal Masuk', err.message || 'Terjadi kesalahan saat masuk');
      }
      setPin('');
    } finally {
      setIsLoggingIn(false);
      isSubmittingRef.current = false;
    }
  };

  const displayPinLength = Math.max(4, pin.length);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#064789', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Image
              source={require('@/assets/images/android-icon-foreground.png')}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.title, { color: colors.primary }]}>EduPOS</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Silakan Masukkan PIN Anda</Text>
        </View>

        {lockoutSeconds > 0 && (
          <View style={[styles.lockoutBanner, { backgroundColor: colors.errorSoft, borderColor: colors.error }]}>
            <Icon name="security" size={20} color={colors.error} />
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.lockoutTitle, { color: colors.error }]}>Aplikasi Terkunci</Text>
              <Text style={[styles.lockoutSubtitle, { color: colors.error }]}>
                Coba lagi dalam {formatRemainingTime(lockoutSeconds)}
              </Text>
            </View>
          </View>
        )}

        {lockoutSeconds === 0 && showWarning && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
            <Icon name="security" size={20} color={colors.warning} />
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.warningTitle, { color: colors.warning }]}>Peringatan Keamanan</Text>
              <Text style={[styles.warningSubtitle, { color: colors.warning }]}>
                1 percobaan lagi sebelum akun terkunci selama 30 detik.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.pinDisplay}>
          {Array.from({ length: displayPinLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pinDot,
                { backgroundColor: i < pin.length ? colors.primary : colors.border },
                isLocked && { backgroundColor: colors.border, opacity: 0.5 },
              ]}
            />
          ))}
        </View>

        <View style={styles.keypad}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map(num => (
                <TouchableOpacity
                  key={num}
                  style={[styles.keyBtn, { backgroundColor: colors.surfaceSubtle }, isLocked && styles.keyBtnDisabled]}
                  onPress={() => handleKeyPress(num)}
                  disabled={isLocked}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.keyText, { color: colors.textPrimary }, isLocked && styles.keyTextDisabled]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.keyBtn, { backgroundColor: colors.surfaceSubtle }, isLocked && styles.keyBtnDisabled]}
              onPress={handleDelete}
              disabled={isLocked}
              activeOpacity={0.7}
            >
              <Icon name="backspace" size={24} color={isLocked ? colors.border : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.keyBtn, { backgroundColor: colors.surfaceSubtle }, isLocked && styles.keyBtnDisabled]}
              onPress={() => handleKeyPress('0')}
              disabled={isLocked}
              activeOpacity={0.7}
            >
              <Text style={[styles.keyText, { color: colors.textPrimary }, isLocked && styles.keyTextDisabled]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.keyBtn,
                pin.length >= 4
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceSubtle },
                (pin.length === 0 || isLoggingIn || isLoading || isLocked) && { opacity: 0.4 },
              ]} 
              onPress={handleLogin}
              disabled={pin.length === 0 || isLoggingIn || isLoading || isLocked}
              activeOpacity={0.7}
            >
              {isLoggingIn || isLoading ? (
                <ActivityIndicator color={pin.length >= 4 ? '#FFFFFF' : colors.primary} />
              ) : (
                <Icon name="login" size={24} color={isLocked ? colors.border : (pin.length >= 4 ? '#FFFFFF' : colors.primary)} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: 340,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.header2,
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorLight,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    width: '100%',
    gap: theme.spacing.sm,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    width: '100%',
    gap: theme.spacing.sm,
  },
  bannerTextContainer: {
    flex: 1,
  },
  lockoutTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.error,
  },
  lockoutSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: 2,
  },
  warningTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  warningSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginTop: 2,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
  },
  pinDotFilled: {
    backgroundColor: theme.colors.primary,
  },
  pinDotLocked: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  keypad: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  keyBtn: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyBtnAction: {
    backgroundColor: theme.colors.surface,
  },
  keyBtnDisabled: {
    opacity: 0.4,
  },
  keyText: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  keyTextDisabled: {
    color: theme.colors.textMuted,
  },
});
