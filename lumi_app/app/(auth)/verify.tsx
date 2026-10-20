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

  const theme = {
    bg: isDark ? '#12111A' : '#F7F6FB',
    card: isDark ? '#1C1B27' : '#FFFFFF',
    inputBg: isDark ? '#1C1B27' : '#F4F2FA',
    border: isDark ? '#2E2B3D' : '#E7E4F0',
    ink: isDark ? '#F1EFF8' : '#1E1B2E',
    muted: isDark ? '#A8A4BD' : '#5B5670',
    placeholder: isDark ? '#8E8A9F' : '#6B6785',
    accent: isDark ? '#8B6DF0' : '#6D4AE0',
    accentActive: '#5B3CC4',
    error: '#B42318',
    success: '#12805C',
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

        {/* Top Bar: Back Button on left, LUMI title */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={20} color={theme.ink} />
          </Pressable>

          <Text style={[styles.logoText, { color: theme.ink }]}>LUMI</Text>

          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Centered LUMI Face Screen (112px -> 56px when keyboard open) */}
            <View style={styles.faceScreenWrapper}>
              <LumiFaceScreen mood={mood} isKeyboardOpen={isKeyboardOpen} />
            </View>

            <Text style={[styles.title, { color: theme.ink }]}>
              Verify your email
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Enter the 6-digit code sent to{' '}
              <Text style={{ fontWeight: '600', color: theme.ink }}>{targetEmail || 'your email'}</Text>
            </Text>

            {/* Notice banner if directed from unconfirmed login */}
            {params.notice === 'unconfirmed' && (
              <View style={[styles.noticeBanner, { borderColor: theme.accent + '40', backgroundColor: theme.card }]}>
                <Text style={[styles.noticeText, { color: theme.accent }]}>
                  Your account requires email verification. We sent a 6-digit code to your inbox.
                </Text>
              </View>
            )}

            {/* Success Banner when Resent */}
            {resendSuccess && (
              <View style={[styles.successBanner, { borderColor: theme.success + '40' }]}>
                <CheckCircle2 size={16} color={theme.success} style={{ marginRight: 6 }} />
                <Text style={[styles.successText, { color: theme.success }]}>
                  New 6-digit code sent to your inbox!
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

            {/* Resend Action */}
            <View style={styles.resendWrapper}>
              <Pressable
                onPress={handleResend}
                disabled={resendCountdown > 0 || isSubmitting}
                style={styles.resendBtn}
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
                    { color: resendCountdown > 0 ? theme.muted : theme.accent },
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
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  faceScreenWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#12805C',
  },
  otpWrapper: {
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeEmailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerMuted: {
    fontSize: 13,
  },
  changeEmailLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
