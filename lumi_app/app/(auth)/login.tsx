/**
 * S03 Log In Screen - Redesigned per Design Spec Oct 19, 2026
 * - Light, minimal off-white #F7F6FB background (no dark header)
 * - Automatic system light/dark theme support (no manual theme toggle button)
 * - LUMI wordmark on left, 'Sign up' text button on right
 * - Centered 112px dark face screen shrinking to 56px when keyboard opens
 * - Animated responsive LUMI eyes matching website (never clipped)
 * - 'Continue with Google' first, then 'or' divider, then form fields
 * - 20px spacing between fields, 52px high, 12px radius, #F4F2FA fill
 * - Password show/hide toggle (sleep eyes -> open wide)
 * - Solid brand purple #6D4AE0 primary button (never disabled)
 * - Inline validation errors with scroll-to-field
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
import { Eye, EyeOff, AlertCircle, Mail, Lock } from 'lucide-react-native';
import { GoogleLogo } from '../../src/components/GoogleLogo';
import { LumiFaceScreen, type FaceMood } from '../../src/components/LumiFaceScreen';
import { useAuthStore } from '../../src/features/auth/useAuthStore';
import { haptics } from '../../src/utils/haptics';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const { logIn, signInWithGoogle, resendVerification } = useAuthStore();

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

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field focus & keyboard states
  const focusedFieldRef = useRef<any>(null);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [mood, setMood] = useState<FaceMood>('idle');

  // Loading & error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  // Input refs
  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    focusedFieldRef.current = focusedField;
  }, [focusedField]);

  // Keyboard listeners for smooth collapse and auto-scroll
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardOpen(true);
        if (focusedFieldRef.current === 'password') {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 80);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Update face mood based on field focus and show-password toggle
  useEffect(() => {
    if (mood === 'upset' || mood === 'love') return;

    if (focusedField === 'email') {
      setMood('lookDown');
    } else if (focusedField === 'password') {
      setMood(showPassword ? 'openWide' : 'sleep');
    } else {
      setMood('idle');
    }
  }, [focusedField, showPassword, mood]);

  const triggerUpsetFace = () => {
    setMood('upset');
    setTimeout(() => {
      setMood('idle');
    }, 1500);
  };

  // Validation function
  const validateForm = () => {
    const newErrors: typeof errors = {};

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Enter your password';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      haptics.heavy();
      triggerUpsetFace();

      if (newErrors.email) {
        emailInputRef.current?.focus();
        scrollViewRef.current?.scrollTo({ y: 140, animated: true });
      } else if (newErrors.password) {
        passwordInputRef.current?.focus();
        scrollViewRef.current?.scrollTo({ y: 220, animated: true });
      }
      return false;
    }

    return true;
  };

  // Submit Handler
  const handleLogin = async () => {
    if (isSubmitting || isGoogleLoading) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    const cleanEmail = email.trim().toLowerCase();

    try {
      haptics.light();
      await logIn(cleanEmail, password);

      // Success reaction: happy -> love eyes
      haptics.success();
      setMood('love');

      setTimeout(() => {
        router.replace('/(tabs)/robots' as any);
      }, 800);
    } catch (err: any) {
      setIsSubmitting(false);
      triggerUpsetFace();
      haptics.heavy();

      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('not verified')) {
        await resendVerification(cleanEmail).catch(() => {});
        router.push({
          pathname: '/(auth)/verify' as any,
          params: { email: cleanEmail, notice: 'unconfirmed' },
        });
        return;
      }

      if (msg.includes('invalid') || msg.includes('credentials')) {
        setErrors({
          general: 'Invalid email or password. Please verify your credentials.',
        });
      } else if (msg.includes('network') || msg.includes('connect')) {
        setErrors({
          general: 'Could not connect. Check your internet and try again.',
        });
      } else {
        setErrors({
          general: err.message || 'Log in failed. Please try again.',
        });
      }
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    if (isSubmitting || isGoogleLoading) return;
    setIsGoogleLoading(true);
    setErrors({});

    try {
      haptics.light();
      await signInWithGoogle();
      haptics.success();
      setMood('love');
      setTimeout(() => {
        router.replace('/(tabs)/robots' as any);
      }, 800);
    } catch (err: any) {
      setIsGoogleLoading(false);
      const msg = (err?.message || '').toLowerCase();
      if (!msg.includes('cancel') && !msg.includes('dismissed')) {
        triggerUpsetFace();
        haptics.heavy();
        setErrors({
          general: 'Google sign-in did not work. Try again or use email.',
        });
      }
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.screenContainer, { backgroundColor: theme.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Top Navigation Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.logoRow}>
            <Text style={[styles.logoText, { color: theme.ink }]}>LUMI</Text>
            <View style={styles.logoDot} />
          </View>

          <Pressable
            onPress={() => router.replace('/(auth)/signup' as any)}
            style={styles.topBarBtnPill}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Sign up"
          >
            <Text style={styles.topBarBtnText}>Sign up</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: isKeyboardOpen ? 160 : Math.max(insets.bottom + 20, 28) },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={isKeyboardOpen}
            bounces={false}
            overScrollMode="never"
          >
            {/* Centered Hero OLED Face Screen */}
            <View style={[styles.faceScreenWrapper, { marginBottom: isKeyboardOpen ? 6 : 14 }]}>
              <LumiFaceScreen mood={mood} isKeyboardOpen={isKeyboardOpen} maxHeight={68} width={124} />
            </View>

            {/* Header Titles */}
            <Text style={[styles.title, { color: theme.ink }]}>
              Welcome back
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Sign in to connect to your LUMI companion.
            </Text>

            {/* General Banner Error if any */}
            {errors.general && (
              <View style={[styles.generalErrorBanner, { borderColor: theme.error + '40' }]}>
                <AlertCircle size={16} color={theme.error} style={{ marginRight: 8 }} />
                <Text style={[styles.generalErrorText, { color: theme.error }]}>
                  {errors.general}
                </Text>
              </View>
            )}

            {/* 'Continue with Google' Button */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={isSubmitting || isGoogleLoading}
              style={({ pressed }) => [
                styles.googleBtn,
                {
                  backgroundColor: isDark ? '#141224' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
                },
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color={theme.ink} />
              ) : (
                <View style={styles.googleBtnRow}>
                  <GoogleLogo size={20} />
                  <Text style={[styles.googleBtnText, { color: theme.ink }]}>
                    Continue with Google
                  </Text>
                </View>
              )}
            </Pressable>

            {/* 'or continue with email' divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E7E4F0' }]} />
              <Text style={[styles.dividerText, { color: theme.muted }]}>or with email</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E7E4F0' }]} />
            </View>

            {/* FORM FIELDS */}
            <View style={styles.formContainer}>
              {/* 1. Email Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Email address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: errors.email
                        ? theme.error
                        : focusedField === 'email'
                        ? theme.accent
                        : theme.border,
                      borderWidth: focusedField === 'email' ? 1.5 : 1,
                    },
                  ]}
                >
                  <Mail size={18} color={focusedField === 'email' ? theme.accent : theme.muted} style={{ marginRight: 10 }} />
                  <TextInput
                    ref={emailInputRef}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    editable={!isSubmitting}
                    style={[styles.inputField, { color: theme.ink }]}
                  />
                </View>
                {errors.email && (
                  <View style={styles.inlineErrorRow}>
                    <AlertCircle size={14} color={theme.error} style={{ marginRight: 4 }} />
                    <Text style={[styles.inlineErrorText, { color: theme.error }]}>
                      {errors.email}
                    </Text>
                  </View>
                )}
              </View>

              {/* 2. Password Field */}
              <View style={styles.fieldGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Password</Text>
                  <Pressable
                    onPress={() => router.push('/(auth)/forgot' as any)}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.forgotText, { color: theme.accent }]}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: errors.password
                        ? theme.error
                        : focusedField === 'password'
                        ? theme.accent
                        : theme.border,
                      borderWidth: focusedField === 'password' ? 1.5 : 1,
                    },
                  ]}
                >
                  <Lock size={18} color={focusedField === 'password' ? theme.accent : theme.muted} style={{ marginRight: 10 }} />
                  <TextInput
                    ref={passwordInputRef}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    onFocus={() => {
                      setFocusedField('password');
                      focusedFieldRef.current = 'password';
                      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                    }}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.placeholder}
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    editable={!isSubmitting}
                    style={[styles.inputField, { color: theme.ink }]}
                  />

                  {/* Show/Hide Password button */}
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeToggleBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    hitSlop={8}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={theme.muted} />
                    ) : (
                      <Eye size={18} color={theme.muted} />
                    )}
                  </Pressable>
                </View>

                {errors.password && (
                  <View style={styles.inlineErrorRow}>
                    <AlertCircle size={14} color={theme.error} style={{ marginRight: 4 }} />
                    <Text style={[styles.inlineErrorText, { color: theme.error }]}>
                      {errors.password}
                    </Text>
                  </View>
                )}
              </View>

              {/* Primary Action Button */}
              <Pressable
                onPress={handleLogin}
                disabled={isSubmitting || isGoogleLoading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.accent },
                  pressed && styles.primaryBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                {isSubmitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Signing in...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Sign in</Text>
                )}
              </Pressable>
            </View>

            {/* Footer Line: "Don't have an account? Sign up" */}
            <View style={styles.footerContainer}>
              <Text style={[styles.footerText, { color: theme.muted }]}>
                Don't have an account?{' '}
                <Text
                  onPress={() => router.replace('/(auth)/signup' as any)}
                  style={[styles.footerLink, { color: theme.accent }]}
                >
                  Sign up
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
    paddingHorizontal: 22,
    paddingBottom: 6,
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
  topBarBtnPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.28)',
  },
  topBarBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A78BFA',
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
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  generalErrorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
  },
  googleBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  googleBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  formContainer: {
    gap: 14,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginLeft: 2,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '400',
  },
  eyeToggleBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 2,
  },
  inlineErrorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  footerContainer: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: {
    fontWeight: '700',
  },
});
