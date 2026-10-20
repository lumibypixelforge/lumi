/**
 * S06 Verify Email Screen - Redesigned per Design Spec Oct 19, 2026
 * - Light, minimal off-white #F7F6FB background (no dark header)
 * - Automatic system light/dark theme support (no manual theme toggle button)
 * - LUMI wordmark with back button
 * - Centered 112px dark face screen with LumiFaceScreen
 * - 6-digit OtpInput with 12px radius boxes
 * - Live 30s resend countdown
 * - Solid brand purple #6D4AE0 primary button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { OtpInput } from '../../src/components/OtpInput';
import { LumiFaceScreen, type FaceMood } from '../../src/components/LumiFaceScreen';
import { useAuthStore } from '../../src/features/auth/useAuthStore';
import { haptics } from '../../src/utils/haptics';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const params = useLocalSearchParams<{ email?: string; notice?: string }>();
  const { user, verifyEmail, resendVerification, clearError } = useAuthStore();

  const targetEmail = (params.email || user?.email || '').trim().toLowerCase();

  // Luxury dark mode color tokens
  const theme = {
    bg: isDark ? '#090810' : '#F7F6FB',
    card: isDark ? '#141224' : '#FFFFFF',
    inputBg: isDark ? '#121020' : '#F4F2FA',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E7E4F0',
    ink: isDark ? '#F8FAFC' : '#1E1B2E',
    muted: isDark ? '#94A3B8' : '#5B5670',
    placeholder: isDark ? '#64748B' : '#6B6785',
    accent: '#7C3AED',
    accentActive: '#6D28D9',
    error: '#EF4444',
    success: '#10B981',
  };

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [mood, setMood] = useState<FaceMood>('idle');

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerify = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify || code).trim();
    if (finalCode.length !== 6) {
      setLocalError('Please enter all 6 digits of the code.');
      haptics.heavy();
      setMood('upset');
      setTimeout(() => setMood('idle'), 1500);
      return;
    }

    clearError();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      haptics.light();
      await verifyEmail(finalCode, targetEmail);
      haptics.success();
      setMood('love');
      setTimeout(() => {
        router.replace('/(tabs)/robots' as any);
      }, 800);
    } catch (err: any) {
      haptics.heavy();
      setMood('upset');
      setTimeout(() => setMood('idle'), 1500);
      setLocalError(err.message || 'Invalid or expired code. Please try again.');
      setCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (text: string) => {
    setCode(text);
    if (localError) setLocalError(null);
    if (text.length === 6) {
      handleVerify(text);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isSubmitting) return;
    clearError();
    setLocalError(null);
    try {
      haptics.light();
      await resendVerification(targetEmail);
      haptics.success();
      setResendSuccess(true);
      setResendCountdown(45);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      haptics.heavy();
      setLocalError(err.message || 'Could not resend code. Please try again.');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.screenContainer, { backgroundColor: theme.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Top Navigation Bar: Back button on left, LUMI wordmark + dot centered */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
              },
            ]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={18} color={theme.ink} />
          </Pressable>

          <View style={styles.logoRow}>
            <Text style={[styles.logoText, { color: theme.ink }]}>LUMI</Text>
            <View style={styles.logoDot} />
          </View>

          <View style={{ width: 38 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: isKeyboardOpen ? 140 : Math.max(insets.bottom + 20, 28) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            {/* Centered Hero OLED Face Screen */}
            <View style={[styles.faceScreenWrapper, { marginBottom: isKeyboardOpen ? 6 : 14 }]}>
              <LumiFaceScreen mood={mood} isKeyboardOpen={isKeyboardOpen} maxHeight={68} width={124} />
            </View>

            <Text style={[styles.title, { color: theme.ink }]}>
              Verify your email
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={{ fontWeight: '700', color: theme.ink }}>{targetEmail || 'your email'}</Text>
            </Text>

            {/* Notice banner if directed from unconfirmed login */}
            {params.notice === 'unconfirmed' && (
              <View style={[styles.noticeBanner, { borderColor: theme.accent + '40', backgroundColor: isDark ? '#141224' : '#F5F3FF' }]}>
                <AlertCircle size={16} color={theme.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.noticeText, { color: theme.accent }]}>
                  Your account requires email verification. We sent a 6-digit code to your inbox.
                </Text>
              </View>
            )}

            {/* Success Banner when Resent */}
            {resendSuccess && (
              <View style={[styles.successBanner, { borderColor: theme.success + '40', backgroundColor: isDark ? '#062016' : '#ECFDF5' }]}>
                <CheckCircle2 size={16} color={theme.success} style={{ marginRight: 8 }} />
                <Text style={[styles.successText, { color: theme.success }]}>
                  New 6-digit code sent to your inbox!
                </Text>
              </View>
            )}

            {/* Error Banner if any */}
            {localError && (
              <View style={[styles.generalErrorBanner, { borderColor: theme.error + '40' }]}>
                <AlertCircle size={16} color={theme.error} style={{ marginRight: 8 }} />
                <Text style={[styles.generalErrorText, { color: theme.error }]}>
                  {localError}
                </Text>
              </View>
            )}

            {/* 6-Digit Animated OTP Input */}
            <View style={styles.otpWrapper}>
              <OtpInput
                value={code}
                onChangeText={handleCodeChange}
                length={6}
                autoFocus={true}
                disabled={isSubmitting}
                error={localError || undefined}
              />
            </View>

            {/* Verify & Continue Button */}
            <Pressable
              onPress={() => handleVerify()}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.accent },
                pressed && styles.primaryBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Verify and continue"
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryBtnText}>Verifying code...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Continue</Text>
              )}
            </Pressable>

            {/* Resend Action Pill */}
            <View style={styles.resendWrapper}>
              <Pressable
                onPress={handleResend}
                disabled={resendCountdown > 0 || isSubmitting}
                style={[
                  styles.resendBtn,
                  {
                    backgroundColor: isDark
                      ? (resendCountdown > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(124, 58, 237, 0.12)')
                      : (resendCountdown > 0 ? '#F1F5F9' : '#EDE9FE'),
                    borderColor: isDark
                      ? (resendCountdown > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(124, 58, 237, 0.28)')
                      : (resendCountdown > 0 ? '#E2E8F0' : '#DDD6FE'),
                  },
                ]}
                accessibilityRole="button"
              >
                <RefreshCw
                  size={14}
                  color={resendCountdown > 0 ? theme.muted : theme.accent}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.resendText,
                    { color: resendCountdown > 0 ? theme.muted : (isDark ? '#C4B5FD' : theme.accent) },
                  ]}
                >
                  {resendCountdown > 0
                    ? `Resend code in ${resendCountdown}s`
                    : 'Resend code'}
                </Text>
              </Pressable>
            </View>

            {/* Change Email */}
            <View style={styles.changeEmailRow}>
              <Text style={[styles.footerMuted, { color: theme.muted }]}>
                Wrong email address?{' '}
              </Text>
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={[styles.changeEmailLink, { color: theme.accent }]}>Change email</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
    marginTop: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  faceScreenWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
  },
  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  generalErrorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
  },
  otpWrapper: {
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resendWrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  changeEmailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerMuted: {
    fontSize: 13,
    fontWeight: '500',
  },
  changeEmailLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
