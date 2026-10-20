/**
 * S05 Forgot Password Screen - Redesigned per Design Spec Oct 19, 2026
 * - Light, minimal off-white #F7F6FB background (no dark header)
 * - Automatic system light/dark theme support (no manual theme toggle button)
 * - LUMI wordmark with back button
 * - Centered 112px dark face screen shrinking to 56px when keyboard opens
 * - Email field: 52px high, 12px radius, #F4F2FA fill
 * - Solid brand purple #6D4AE0 primary button (never disabled)
 * - Confirmation state with 30s resend countdown
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { LumiFaceScreen, type FaceMood } from '../../src/components/LumiFaceScreen';
import { useAuthStore } from '../../src/features/auth/useAuthStore';
import { haptics } from '../../src/utils/haptics';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const { forgotPassword, isLoading } = useAuthStore();

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

  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [mood, setMood] = useState<FaceMood>('idle');
  const [sent, setSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInputRef = useRef<TextInput>(null);

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

  useEffect(() => {
    if (mood === 'upset' || mood === 'love') return;
    setMood(isFocused ? 'lookDown' : 'idle');
  }, [isFocused, mood]);

  const handleSend = async () => {
    if (isLoading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      haptics.heavy();
      setError('Enter a valid email address');
      setMood('upset');
      setTimeout(() => setMood('idle'), 1500);
      emailInputRef.current?.focus();
      return;
    }

    setError(null);
    try {
      haptics.light();
      await forgotPassword(cleanEmail);
      haptics.success();
      setMood('love');
      setSent(true);
      setResendCountdown(30);
    } catch (err: any) {
      haptics.heavy();
      setMood('upset');
      setTimeout(() => setMood('idle'), 1500);
      setError(err?.message || 'Could not send reset link. Please try again.');
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isLoading) return;
    try {
      haptics.light();
      await forgotPassword(email.trim().toLowerCase());
      haptics.success();
      setResendSuccess(true);
      setResendCountdown(45);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch {
      haptics.heavy();
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

            {!sent ? (
              <>
                <Text style={[styles.title, { color: theme.ink }]}>
                  Reset your password
                </Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>
                  Enter your email and we'll send you a recovery link.
                </Text>

                <View style={styles.formContainer}>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.ink }]}>Email</Text>
                    <TextInput
                      ref={emailInputRef}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) setError(null);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="you@example.com"
                      placeholderTextColor={theme.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      returnKeyType="done"
                      onSubmitEditing={handleSend}
                      editable={!isLoading}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: error
                            ? theme.error
                            : isFocused
                            ? theme.accent
                            : theme.border,
                          borderWidth: isFocused ? 2 : 1,
                          color: theme.ink,
                        },
                      ]}
                    />
                    {error && (
                      <View style={styles.inlineErrorRow}>
                        <AlertCircle size={14} color={theme.error} style={{ marginRight: 4 }} />
                        <Text style={[styles.inlineErrorText, { color: theme.error }]}>
                          {error}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={handleSend}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: theme.accent },
                      pressed && styles.primaryBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Send reset link"
                  >
                    {isLoading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>Sending link...</Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryBtnText}>Send reset link</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.sentContainer}>
                <Text style={[styles.title, { color: theme.ink }]}>
                  Check your email
                </Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>
                  We sent a recovery link to{' '}
                  <Text style={{ fontWeight: '600', color: theme.ink }}>{email}</Text>.
                </Text>

                {resendSuccess && (
                  <View style={[styles.successBanner, { borderColor: theme.success + '40' }]}>
                    <CheckCircle2 size={16} color={theme.success} style={{ marginRight: 6 }} />
                    <Text style={[styles.successText, { color: theme.success }]}>
                      New reset link sent!
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={handleResend}
                  disabled={resendCountdown > 0 || isLoading}
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
                      ? `Resend link in ${resendCountdown}s`
                      : 'Resend link'}
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.footerContainer}>
              <Text style={[styles.footerText, { color: theme.muted }]}>
                Remember your password?{' '}
                <Text
                  onPress={() => router.replace('/(auth)/login' as any)}
                  style={[styles.footerLink, { color: theme.accent }]}
                >
                  Log in
                </Text>
              </Text>
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
    marginBottom: 24,
  },
  formContainer: {
    gap: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  inlineErrorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  sentContainer: {
    alignItems: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerContainer: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: {
    fontWeight: '600',
  },
});
