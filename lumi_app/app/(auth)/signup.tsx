/**
 * S02 Sign Up Screen - Redesigned per Design Spec Oct 19, 2026
 * - Light, minimal off-white #F7F6FB background (no dark header)
 * - Automatic system light/dark theme support (no manual theme toggle button)
 * - LUMI wordmark on left, 'Log in' text button on right
 * - Centered 112px dark face screen shrinking to 56px when keyboard opens
 * - Animated responsive LUMI eyes matching website (never clipped)
 * - 'Continue with Google' first, then 'or' divider, then form fields
 * - 20px spacing between fields, 52px high, 12px radius, #F4F2FA fill
 * - Password live validation checklist (8+ chars, letter, number)
 * - Accessible 44px tap target Terms checkbox with in-app browser links
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
import * as WebBrowser from 'expo-web-browser';
import { Eye, EyeOff, Check, AlertCircle, User, Mail, Lock } from 'lucide-react-native';
import { GoogleLogo } from '../../src/components/GoogleLogo';
import { LumiFaceScreen, type FaceMood } from '../../src/components/LumiFaceScreen';
import { useAuthStore } from '../../src/features/auth/useAuthStore';
import { haptics } from '../../src/utils/haptics';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';

  const { signUp, signInWithGoogle } = useAuthStore();

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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Field focus & keyboard states
  const focusedFieldRef = useRef<any>(null);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [mood, setMood] = useState<FaceMood>('idle');

  // Loading & error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    terms?: string;
    general?: string;
  }>({});

  // Input refs for programmatic focus & auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    focusedFieldRef.current = focusedField;
  }, [focusedField]);

  // Keyboard listeners for smooth collapse and auto-scroll to field
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardOpen(true);
        if (focusedFieldRef.current === 'password') {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 80);
        } else if (focusedFieldRef.current === 'email') {
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 70, animated: true });
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

    if (focusedField === 'name' || focusedField === 'email') {
      setMood('lookDown');
    } else if (focusedField === 'password') {
      setMood(showPassword ? 'openWide' : 'sleep');
    } else {
      setMood('idle');
    }
  }, [focusedField, showPassword, mood]);

  // Live password checklist validation
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const triggerUpsetFace = () => {
    setMood('upset');
    setTimeout(() => {
      setMood('idle');
    }, 1500);
  };

  // Open Terms & Privacy in in-app browser
  const openTerms = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://lumirobot.com/terms');
    } catch {
      // Fallback
    }
  };

  const openPrivacy = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://lumirobot.com/privacy');
    } catch {
      // Fallback
    }
  };

  // Validation function
  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.name = 'Enter your name';
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!isPasswordValid) {
      newErrors.password = 'Use at least 8 characters with a letter and a number';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'Please accept the Terms and Privacy Policy to continue';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      haptics.heavy();
      triggerUpsetFace();

      // Focus and scroll to first invalid field
      if (newErrors.name) {
        nameInputRef.current?.focus();
        scrollViewRef.current?.scrollTo({ y: 140, animated: true });
      } else if (newErrors.email) {
        emailInputRef.current?.focus();
        scrollViewRef.current?.scrollTo({ y: 220, animated: true });
      } else if (newErrors.password) {
        passwordInputRef.current?.focus();
        scrollViewRef.current?.scrollTo({ y: 300, animated: true });
      } else if (newErrors.terms) {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
      return false;
    }

    return true;
  };

  // Submit Handler
  const handleSignUp = async () => {
    if (isSubmitting || isGoogleLoading) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    const cleanEmail = email.trim().toLowerCase();

    try {
      haptics.light();
      await signUp(fullName.trim(), cleanEmail, password);

      // Success reaction: happy -> love eyes
      haptics.success();
      setMood('love');

      setTimeout(() => {
        const state = useAuthStore.getState();
        if (state.isAuthenticated) {
          router.replace('/(tabs)/robots' as any);
        } else {
          router.push({
            pathname: '/(auth)/verify' as any,
            params: { email: cleanEmail },
          });
        }
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      triggerUpsetFace();
      haptics.heavy();

      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setErrors({
          email: 'This email already has an account.',
        });
      } else if (msg.includes('network') || msg.includes('connect')) {
        setErrors({
          general: 'Could not connect. Check your internet and try again.',
        });
      } else {
        setErrors({
          general: err.message || 'Could not create account. Please try again.',
        });
      }
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignUp = async () => {
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
      }, 1000);
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

  const handleNameFocus = () => {
    setFocusedField('name');
    focusedFieldRef.current = 'name';
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 80);
  };

  const handleEmailFocus = () => {
    setFocusedField('email');
    focusedFieldRef.current = 'email';
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 70, animated: true });
    }, 80);
  };

  const handlePasswordFocus = () => {
    setFocusedField('password');
    focusedFieldRef.current = 'password';
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
            onPress={() => router.replace('/(auth)/login' as any)}
            style={styles.topBarLoginPill}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            <Text style={styles.topBarLoginText}>Log in</Text>
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
              Create your account
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Start your journey with your LUMI robot companion.
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
              onPress={handleGoogleSignUp}
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
              {/* 1. Full Name Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Full name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: errors.name
                        ? theme.error
                        : focusedField === 'name'
                        ? theme.accent
                        : theme.border,
                      borderWidth: focusedField === 'name' ? 1.5 : 1,
                    },
                  ]}
                >
                  <User size={18} color={focusedField === 'name' ? theme.accent : theme.muted} style={{ marginRight: 10 }} />
                  <TextInput
                    ref={nameInputRef}
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    onFocus={handleNameFocus}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Your full name"
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="words"
                    autoComplete="name"
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    editable={!isSubmitting}
                    style={[styles.inputField, { color: theme.ink }]}
                  />
                </View>
                {errors.name && (
                  <View style={styles.inlineErrorRow}>
                    <AlertCircle size={14} color={theme.error} style={{ marginRight: 4 }} />
                    <Text style={[styles.inlineErrorText, { color: theme.error }]}>
                      {errors.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* 2. Email Field */}
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
                    onFocus={handleEmailFocus}
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
                      {errors.email.includes('already has an account') && (
                        <Text
                          onPress={() => router.replace('/(auth)/login' as any)}
                          style={{ color: theme.accent, textDecorationLine: 'underline' }}
                        >
                          {' Log in instead.'}
                        </Text>
                      )}
                    </Text>
                  </View>
                )}
              </View>

              {/* 3. Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>Password</Text>
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
                    onFocus={handlePasswordFocus}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPassword}
                    placeholder="Create a password"
                    placeholderTextColor={theme.placeholder}
                    autoComplete="new-password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
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

                {/* Modern Interactive Password Rules Chips */}
                <View style={styles.checklistContainer}>
                  <View style={[styles.checkChip, hasMinLength && styles.checkChipActive]}>
                    <Check
                      size={11}
                      color={hasMinLength ? '#10B981' : theme.muted}
                      strokeWidth={hasMinLength ? 3 : 2}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.checkChipText, hasMinLength && styles.checkChipTextActive]}>
                      8+ chars
                    </Text>
                  </View>

                  <View style={[styles.checkChip, hasLetter && styles.checkChipActive]}>
                    <Check
                      size={11}
                      color={hasLetter ? '#10B981' : theme.muted}
                      strokeWidth={hasLetter ? 3 : 2}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.checkChipText, hasLetter && styles.checkChipTextActive]}>
                      Letter
                    </Text>
                  </View>

                  <View style={[styles.checkChip, hasNumber && styles.checkChipActive]}>
                    <Check
                      size={11}
                      color={hasNumber ? '#10B981' : theme.muted}
                      strokeWidth={hasNumber ? 3 : 2}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.checkChipText, hasNumber && styles.checkChipTextActive]}>
                      Number
                    </Text>
                  </View>
                </View>
              </View>

              {/* Terms & Privacy Policy Checkbox Row */}
              <View style={styles.termsWrapper}>
                <Pressable
                  onPress={() => {
                    const next = !agreedToTerms;
                    setAgreedToTerms(next);
                    if (next && errors.terms) {
                      setErrors((prev) => ({ ...prev, terms: undefined }));
                    }
                  }}
                  style={styles.termsRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreedToTerms }}
                  accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      {
                        borderColor: errors.terms
                          ? theme.error
                          : agreedToTerms
                          ? theme.accent
                          : theme.border,
                        backgroundColor: agreedToTerms ? theme.accent : isDark ? '#141224' : 'transparent',
                      },
                    ]}
                  >
                    {agreedToTerms && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </View>

                  <Text style={[styles.termsText, { color: theme.muted }]}>
                    I agree to the{' '}
                    <Text onPress={openTerms} style={[styles.termsLink, { color: theme.accent }]}>
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text onPress={openPrivacy} style={[styles.termsLink, { color: theme.accent }]}>
                      Privacy Policy
                    </Text>
                  </Text>
                </Pressable>

                {errors.terms && (
                  <View style={styles.inlineErrorRow}>
                    <AlertCircle size={14} color={theme.error} style={{ marginRight: 4 }} />
                    <Text style={[styles.inlineErrorText, { color: theme.error }]}>
                      {errors.terms}
                    </Text>
                  </View>
                )}
              </View>

              {/* Primary Action Button */}
              <Pressable
                onPress={handleSignUp}
                disabled={isSubmitting || isGoogleLoading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.accent },
                  pressed && styles.primaryBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create account"
              >
                {isSubmitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Creating account...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryBtnText}>Create account</Text>
                )}
              </Pressable>
            </View>

            {/* Footer Line: 'Already have an account? Log in' */}
            <View style={styles.footerContainer}>
              <Text style={[styles.footerText, { color: theme.muted }]}>
                Already have an account?{' '}
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
  topBarLoginPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.28)',
  },
  topBarLoginText: {
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
    gap: 12,
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
  checklistContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginLeft: 2,
  },
  checkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  checkChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  checkChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  checkChipTextActive: {
    color: '#10B981',
  },
  termsWrapper: {
    marginTop: 4,
  },
  termsRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  termsText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
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
