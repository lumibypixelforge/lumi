'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DEFAULT_PRICING, formatPrice } from '@/config/product';
import { MockPaymentModal } from '@/components/ui/mock-payment-modal';
import { createClient } from '@/lib/supabase/client';
import {
  IconArrowRight,
  IconShield,
  IconTruck,
  IconRefresh,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
} from '@/components/ui/icons';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

interface FormData {
  quantity: number;
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  gstNumber: string;
  marketingConsent: boolean;
  termsAccepted: boolean;
}

export default function PreorderPage() {
  const router = useRouter();

  // ─── Stepper & Auth State ───────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Sign up / Sign in mode
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [authConsent, setAuthConsent] = useState(false);
  const [authTerms, setAuthTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // ─── Preorder Delivery Form State ───────────────────────────────────
  const [formData, setFormData] = useState<FormData>({
    quantity: 1,
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    gstNumber: '',
    marketingConsent: false,
    termsAccepted: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile accordion toggle
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // Order confirmation details (Step 3)
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    amountPaise: number;
    paymentId: string;
    email: string;
    quantity: number;
  } | null>(null);

  // Waitlist state if pre-orders closed
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistConsent, setWaitlistConsent] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  // Modal payment state
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    orderId: string;
    orderNumber: string;
    gatewayOrderId: string;
    amountPaise: number;
  }>({
    isOpen: false,
    orderId: '',
    orderNumber: '',
    gatewayOrderId: '',
    amountPaise: 0,
  });

  // Pricing approval state (reads live from database settings)
  const [pricingApproved, setPricingApproved] = useState<boolean>(true);

  // Verify genuine active Supabase session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();

        // Check live pricing approval from Supabase settings
        try {
          const { data: settingsData } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['pricing_approval', 'preorders_open']);

          if (settingsData) {
            for (const s of settingsData) {
              if (s.key === 'pricing_approval' && s.value && typeof s.value === 'object') {
                const val = s.value as { approved?: boolean };
                if (typeof val.approved === 'boolean') {
                  setPricingApproved(val.approved);
                }
              }
            }
          }
        } catch {
          // If query fails, default to true
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          setIsAuthenticated(true);
          setAuthEmail(user.email);
          setAuthUserId(user.id);

          // Auto-advance to Step 2 if user is already logged in
          setCurrentStep(2);

          // Fetch profile details from Supabase database
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .maybeSingle();

          const userName = profile?.full_name || user.user_metadata?.full_name || '';
          const userPhone = profile?.phone || user.user_metadata?.phone || '';

          setFormData((prev) => ({
            ...prev,
            email: user.email!,
            fullName: userName || prev.fullName,
            phone: userPhone || prev.phone,
          }));
          return;
        }
      } catch (err) {
        console.error('[Preorder] Auth check error:', err);
      }

      setIsAuthenticated(false);

      // Support previewing steps via URL parameter (e.g. ?step=2, ?step=3)
      if (typeof window !== 'undefined') {
        const urlStep = new URLSearchParams(window.location.search).get('step');
        if (urlStep === '2') {
          setIsAuthenticated(true);
          setAuthEmail('alex@example.com');
          setFormData((prev) => ({
            ...prev,
            fullName: 'Alex Mercer',
            email: 'alex@example.com',
            phone: '9876543210',
            addressLine1: '42 Indiranagar 100ft Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560038',
          }));
          setCurrentStep(2);
        } else if (urlStep === '3') {
          setIsAuthenticated(true);
          setAuthEmail('alex@example.com');
          setConfirmedOrder({
            orderId: 'demo-order-123',
            orderNumber: 'LUMI-849201',
            amountPaise: 499900,
            paymentId: 'pay_demo_test12345',
            email: 'alex@example.com',
            quantity: 1,
          });
          setCurrentStep(3);
        }
      }
    };

    checkAuth();
  }, []);

  // ─── Authentication Handler ─────────────────────────────────────────
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLoginError('Please enter a valid email address.');
      return;
    }

    if (!loginPassword || loginPassword.length < 8) {
      setLoginError('Password must be at least 8 characters.');
      return;
    }

    if (authMode === 'signup') {
      const cleanName = loginName.trim();
      if (!cleanName || cleanName.length < 2) {
        setLoginError('Please enter your full name.');
        return;
      }

      const cleanPhone = loginPhone.trim().replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length !== 10) {
        setLoginError('Please enter a valid 10-digit mobile number.');
        return;
      }

      if (!authTerms) {
        setLoginError('Please agree to the Terms of Service and Privacy Policy to create an account.');
        return;
      }
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const supabase = createClient();

      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: loginPassword,
          options: {
            data: {
              full_name: loginName.trim(),
              phone: loginPhone.trim(),
              marketing_consent: authConsent,
              marketing_consent_at: authConsent ? new Date().toISOString() : null,
            },
          },
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists')) {
            setAuthMode('signin');
            setLoginError('An account with this email already exists. Please enter your password to sign in.');
            return;
          }
          throw error;
        }

        if (data.user) {
          setIsAuthenticated(true);
          setAuthEmail(data.user.email || cleanEmail);
          setAuthUserId(data.user.id);
          setFormData((prev) => ({
            ...prev,
            email: data.user?.email || cleanEmail,
            fullName: loginName.trim() || prev.fullName,
            phone: loginPhone.trim() || prev.phone,
            marketingConsent: authConsent,
          }));
          setCurrentStep(2);
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: loginPassword,
        });

        if (error) {
          throw new Error('Invalid email or password. Please verify your credentials.');
        }

        if (data.user) {
          setIsAuthenticated(true);
          setAuthEmail(data.user.email || cleanEmail);
          setAuthUserId(data.user.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', data.user.id)
            .maybeSingle();

          setFormData((prev) => ({
            ...prev,
            email: data.user?.email || cleanEmail,
            fullName: profile?.full_name || data.user?.user_metadata?.full_name || prev.fullName,
            phone: profile?.phone || data.user?.user_metadata?.phone || prev.phone,
          }));
          setCurrentStep(2);
        }
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setAuthEmail('');
    setAuthUserId(null);
    setCurrentStep(1);
    setFormData((prev) => ({ ...prev, email: '', fullName: '', phone: '' }));
  };

  // ─── Pricing & Calculations ─────────────────────────────────────────
  const quantityCap = DEFAULT_PRICING.quantityCap || 3;
  const rawDeposit = DEFAULT_PRICING.depositPaise ?? 499900;
  const rawPrice = DEFAULT_PRICING.pricePaise ?? 4999900;
  const depositPaise = rawDeposit * formData.quantity;
  const totalPricePaise = rawPrice * formData.quantity;
  const balancePaise = totalPricePaise - depositPaise;
  const isDemoBuild = process.env.NODE_ENV !== 'production';
  const isPaymentDisabled = !pricingApproved && !DEFAULT_PRICING.pricingConfirmed;

  // ─── Step 2 Validation ──────────────────────────────────────────────
  const validateDeliveryForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      errs.fullName = 'Full name is required.';
    }

    const cleanPhone = formData.phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!formData.addressLine1 || formData.addressLine1.trim().length < 3) {
      errs.addressLine1 = 'Address line 1 is required.';
    }

    if (!formData.city || formData.city.trim().length < 2) {
      errs.city = 'City is required.';
    }

    if (!formData.state || formData.state.trim().length < 2) {
      errs.state = 'Please select a state.';
    }

    const cleanPin = formData.postalCode.trim().replace(/\D/g, '');
    if (!cleanPin || cleanPin.length !== 6) {
      errs.postalCode = 'Please enter a valid 6-digit PIN code.';
    }

    if (!formData.termsAccepted) {
      errs.termsAccepted = 'Please accept the pre-order terms and refund policy to proceed.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStartCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateDeliveryForm()) {
      const firstKey = Object.keys(fieldErrors)[0];
      if (firstKey) {
        const el = document.getElementById(`field-${firstKey}`);
        el?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone.trim().replace(/\D/g, ''),
          postalCode: formData.postalCode.trim().replace(/\D/g, ''),
          userId: authUserId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize pre-order reservation.');
      }

      // Check if real Razorpay gateway is active
      const isRazorpayActive = Boolean(
        data.clientConfig?.publicKeyId &&
        !data.clientConfig.publicKeyId.includes('mock') &&
        !data.gatewayOrderId?.includes('mock')
      );

      if (isRazorpayActive) {
        const loadRazorpayScript = () => {
          return new Promise<boolean>((resolve) => {
            if (typeof window !== 'undefined' && (window as unknown as { Razorpay?: unknown }).Razorpay) {
              resolve(true);
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Razorpay checkout failed to load. Please check your internet connection.');
        }

        const options = {
          key: data.clientConfig.publicKeyId,
          amount: data.amountPaise,
          currency: data.currency || 'INR',
          name: 'LUMI',
          description: `Pre-Order Deposit (${data.orderNumber})`,
          order_id: data.gatewayOrderId,
          prefill: {
            name: formData.fullName,
            email: formData.email,
            contact: formData.phone,
          },
          theme: {
            color: '#6D4AE0',
          },
          handler: function (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
            handlePaymentSuccess(
              res.razorpay_payment_id,
              res.razorpay_signature,
              data.orderId,
              data.gatewayOrderId,
              data.orderNumber,
              data.amountPaise
            );
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
            },
          },
        };

        const rzp = new (window as unknown as { Razorpay: new (opts: typeof options) => { open: () => void } }).Razorpay(options);
        rzp.open();
        return;
      }

      setPaymentModalState({
        isOpen: true,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        gatewayOrderId: data.gatewayOrderId,
        amountPaise: data.amountPaise,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (
    paymentId: string,
    signature: string,
    orderIdOverride?: string,
    gatewayOrderIdOverride?: string,
    orderNumberOverride?: string,
    amountPaiseOverride?: number
  ) => {
    setPaymentModalState((prev) => ({ ...prev, isOpen: false }));
    setIsSubmitting(true);

    const orderId = orderIdOverride || paymentModalState.orderId;
    const gatewayOrderId = gatewayOrderIdOverride || paymentModalState.gatewayOrderId;
    const orderNumber = orderNumberOverride || paymentModalState.orderNumber;
    const amountPaise = amountPaiseOverride || paymentModalState.amountPaise;

    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          gatewayOrderId: gatewayOrderId,
          gatewayPaymentId: paymentId,
          signature: signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Payment verification could not be confirmed.');
      }

      setConfirmedOrder({
        orderId: orderId,
        orderNumber: verifyData.orderNumber || orderNumber,
        amountPaise: amountPaise,
        paymentId: paymentId,
        email: formData.email,
        quantity: formData.quantity,
      });
      setCurrentStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment verification failed.';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentFailure = (errorMsg: string) => {
    setPaymentModalState((prev) => ({ ...prev, isOpen: false }));
    setGeneralError(errorMsg);
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes('@')) return;
    setWaitlistSubmitting(true);
    try {
      await fetch('/api/account/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: waitlistEmail,
          fullName: waitlistName,
          phone: waitlistPhone,
          consent: waitlistConsent,
        }),
      });
      setWaitlistSubmitted(true);
    } catch {
      setWaitlistSubmitted(true);
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  // ─── If Pre-Orders are Closed: Waitlist Mode ────────────────────────
  if (!DEFAULT_PRICING.preordersOpen) {
    return (
      <main className="min-h-screen pt-28 pb-20 bg-[#F7F6FB]">
        <div className="max-w-[1120px] mx-auto px-6">
          <nav className="text-[14px] leading-[20px] text-muted mb-4 flex items-center gap-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink transition-colors no-underline">
              Home
            </Link>
            <span className="text-muted/60">/</span>
            <span className="text-ink font-medium">Pre-order</span>
          </nav>

          <h1 className="text-[36px] sm:text-[40px] md:text-[48px] md:leading-[52px] font-semibold text-ink tracking-tight mb-3">
            Reserve your LUMI
          </h1>
          <p className="text-[18px] leading-[28px] text-muted max-w-xl mb-10">
            Pre-orders are currently closed. Join our waitlist to receive notice when reservations reopen.
          </p>

          <div className="max-w-xl bg-white border border-[#E7E4F0] rounded-lg p-6 sm:p-8">
            {waitlistSubmitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-[#12805C]/10 text-[#12805C] flex items-center justify-center mx-auto mb-4">
                  <IconCheck size={24} />
                </div>
                <h2 className="text-[20px] leading-[28px] font-semibold text-ink mb-2">You are on the waitlist</h2>
                <p className="text-[14px] leading-[20px] text-muted mb-6">
                  We have recorded your details ({waitlistEmail}) and will notify you when pre-orders open.
                </p>
                <Link href="/" className="btn btn-secondary text-sm px-6 py-2.5 no-underline inline-block">
                  Back to home
                </Link>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-5">
                <h2 className="text-[20px] leading-[28px] font-semibold text-ink">Join the waitlist</h2>
                <div>
                  <label className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">Full name *</label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={waitlistName}
                    onChange={(e) => setWaitlistName(e.target.value)}
                    className="w-full h-12 px-3.5 text-base border border-[#E7E4F0] rounded-[6px] outline-none focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">Email address *</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    className="w-full h-12 px-3.5 text-base border border-[#E7E4F0] rounded-[6px] outline-none focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">Phone number (optional)</label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={waitlistPhone}
                    onChange={(e) => setWaitlistPhone(e.target.value)}
                    className="w-full h-12 px-3.5 text-base border border-[#E7E4F0] rounded-[6px] outline-none focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]"
                  />
                </div>
                <label className="flex items-start gap-2.5 text-[14px] leading-[20px] text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waitlistConsent}
                    onChange={(e) => setWaitlistConsent(e.target.checked)}
                    className="mt-0.5 rounded-[4px] border-[#E7E4F0] text-[#6D4AE0] focus:ring-[#6D4AE0]"
                  />
                  <span>Email me LUMI updates and release announcements</span>
                </label>
                <button
                  type="submit"
                  disabled={waitlistSubmitting}
                  className="w-full h-12 rounded-[6px] bg-[#6D4AE0] hover:bg-[#5B3CC4] text-white text-base font-medium transition-colors cursor-pointer"
                >
                  {waitlistSubmitting ? 'Joining...' : 'Join waitlist'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ─── Main Pre-Order Page ────────────────────────────────────────────
  return (
    <main className="min-h-screen pt-24 md:pt-28 pb-32 md:pb-20 bg-[#F7F6FB]">
      <div className="max-w-[1120px] mx-auto px-6">
        {/* Breadcrumb (Home / Pre-order) */}
        <nav className="text-[14px] leading-[20px] text-muted mb-4 flex items-center gap-2" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink transition-colors no-underline">
            Home
          </Link>
          <span className="text-muted/60">/</span>
          <span className="text-ink font-medium">Pre-order</span>
        </nav>

        {/* Page Header (H1: 48/52 on desktop, 36/40 on mobile, sentence case) */}
        <div className="mb-8">
          <h1 className="preorder-h1 text-ink tracking-tight mb-3">
            Reserve your LUMI
          </h1>
          <p className="text-[18px] leading-[28px] text-muted max-w-xl">
            Create an account, add your delivery details and pay the reservation deposit.
          </p>
        </div>

        {/* Stepper (3 Steps: Account, Delivery and payment, Confirmation) */}
        <nav className="mb-10 max-w-3xl" aria-label="Checkout Progress">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4 list-none p-0 m-0">
            {/* Step 1 */}
            <li className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => currentStep !== 3 && setCurrentStep(1)}
                className={`flex items-center gap-2.5 text-left bg-transparent border-none p-0 ${
                  currentStep !== 3 ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                    currentStep === 1
                      ? 'bg-[#6D4AE0] text-white'
                      : currentStep > 1
                      ? 'bg-[#12805C] text-white'
                      : 'bg-[#E7E4F0] text-muted'
                  }`}
                >
                  {currentStep > 1 ? <IconCheck size={14} /> : '1'}
                </span>
                <span
                  className={`text-[14px] leading-[20px] font-medium hidden sm:inline ${
                    currentStep === 1 ? 'text-ink font-semibold' : 'text-muted'
                  }`}
                >
                  Account
                </span>
              </button>
              <div className="flex-1 h-[1px] bg-[#E7E4F0] ml-2" aria-hidden="true" />
            </li>

            {/* Step 2 */}
            <li className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => isAuthenticated && currentStep !== 3 && setCurrentStep(2)}
                className={`flex items-center gap-2.5 text-left bg-transparent border-none p-0 ${
                  isAuthenticated && currentStep !== 3 ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                    currentStep === 2
                      ? 'bg-[#6D4AE0] text-white'
                      : currentStep > 2
                      ? 'bg-[#12805C] text-white'
                      : 'bg-[#E7E4F0] text-muted'
                  }`}
                >
                  {currentStep > 2 ? <IconCheck size={14} /> : '2'}
                </span>
                <span
                  className={`text-[14px] leading-[20px] font-medium hidden sm:inline ${
                    currentStep === 2 ? 'text-ink font-semibold' : 'text-muted'
                  }`}
                >
                  Delivery and payment
                </span>
              </button>
              <div className="flex-1 h-[1px] bg-[#E7E4F0] ml-2" aria-hidden="true" />
            </li>

            {/* Step 3 */}
            <li className="flex items-center gap-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                    currentStep === 3 ? 'bg-[#6D4AE0] text-white' : 'bg-[#E7E4F0] text-muted'
                  }`}
                >
                  3
                </span>
                <span
                  className={`text-[14px] leading-[20px] font-medium hidden sm:inline ${
                    currentStep === 3 ? 'text-ink font-semibold' : 'text-muted'
                  }`}
                >
                  Confirmation
                </span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Global Error Banner if present */}
        {generalError && (
          <div
            role="alert"
            className="mb-8 p-4 bg-[#B42318]/5 border border-[#B42318]/30 rounded-lg text-sm text-[#B42318] flex items-start gap-2.5"
          >
            <IconAlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Please check your details</p>
              <p>{generalError}</p>
            </div>
          </div>
        )}

        {/* Mobile Accordion Summary (< 1024px) */}
        <div className="lg:hidden mb-6 bg-white border border-[#E7E4F0] rounded-lg overflow-hidden">
          <button
            id="order-summary-accordion-toggle"
            type="button"
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="w-full p-4 flex items-center justify-between text-left cursor-pointer bg-transparent border-none"
            aria-expanded={isSummaryExpanded}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink">Order summary</span>
              <span className="text-muted text-sm">•</span>
              <span className="text-sm font-semibold text-ink tabular-nums">{formatPrice(depositPaise)} due today</span>
            </div>
            <span className="text-muted">
              {isSummaryExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
            </span>
          </button>

          {isSummaryExpanded && (
            <div className="p-4 pt-0 border-t border-[#E7E4F0] space-y-4">
              <div className="flex items-center gap-3 pt-4">
                <div className="w-16 h-12 relative rounded-md overflow-hidden bg-[#F7F6FB] shrink-0">
                  <Image
                    src="/lumi_product_tile.png"
                    alt="LUMI telepresence robot"
                    fill
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-[16px] leading-[24px] font-semibold text-ink">LUMI telepresence robot</h3>
                  <p className="text-[14px] leading-[20px] text-muted">Quantity: {formData.quantity}</p>
                </div>
              </div>

              <div className="space-y-2 text-[14px] leading-[20px] pt-2">
                <div className="flex justify-between text-muted">
                  <span>Price ({formData.quantity} unit{formData.quantity > 1 ? 's' : ''})</span>
                  <span className="text-ink tabular-nums">{formatPrice(totalPricePaise)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Deposit due today</span>
                  <span className="text-ink font-medium tabular-nums">{formatPrice(depositPaise)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Balance due before dispatch</span>
                  <span className="text-muted tabular-nums">{formatPrice(balancePaise)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Two-Column Grid: Form (7 cols) + Sticky Summary (5 cols) with 48px gap */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7">
            {/* STEP 1: ACCOUNT */}
            {currentStep === 1 && (
              <div className="bg-white border border-[#E7E4F0] rounded-lg p-6 sm:p-8">
                {/* If already authenticated, show account tile */}
                {isAuthenticated ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="preorder-card-title text-ink tracking-tight">Your account</h2>
                      <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] text-muted font-medium whitespace-nowrap shrink-0">
                        <IconLock size={13} className="text-[#6D4AE0]" />
                        Secure sign-in
                      </span>
                    </div>
                    <p className="text-[16px] leading-[24px] text-muted mb-6">
                      You are signed in. Your reservation and order updates are linked to this account.
                    </p>

                    <div className="p-4 bg-[#F7F6FB] border border-[#E7E4F0] rounded-[6px] mb-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#6D4AE0]/10 text-[#6D4AE0] font-semibold flex items-center justify-center text-sm">
                          {(formData.fullName || authEmail || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{formData.fullName || 'LUMI Customer'}</p>
                          <p className="text-xs text-muted">{authEmail}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="text-xs text-muted hover:text-ink underline cursor-pointer bg-transparent border-none"
                      >
                        Sign out
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="w-full h-12 rounded-[6px] bg-[#6D4AE0] hover:bg-[#5B3CC4] text-white text-base font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Continue to delivery details</span>
                      <IconArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Unauthenticated form */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h2 className="preorder-card-title text-ink tracking-tight">
                        {authMode === 'signup' ? 'Create your account' : 'Sign in to your account'}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] text-muted font-medium whitespace-nowrap shrink-0">
                        <IconLock size={13} className="text-[#6D4AE0]" />
                        Secure sign-in
                      </span>
                    </div>
                    <p className="text-[16px] leading-[24px] text-muted mb-6">
                      Your reservation and order updates are linked to this account.
                    </p>

                    {/* Segmented Control (Create account / Sign in) - 48px tall */}
                    <div className="grid grid-cols-2 p-1 bg-[#F7F6FB] border border-[#E7E4F0] rounded-[6px] mb-6 h-12">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setLoginError('');
                        }}
                        className={`h-10 text-[14px] leading-[20px] font-semibold rounded-[4px] transition-all cursor-pointer border-none flex items-center justify-center ${
                          authMode === 'signup'
                            ? 'bg-white text-ink shadow-xs border border-[#E7E4F0]'
                            : 'text-muted hover:text-ink bg-transparent'
                        }`}
                      >
                        Create account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setLoginError('');
                        }}
                        className={`h-10 text-[14px] leading-[20px] font-semibold rounded-[4px] transition-all cursor-pointer border-none flex items-center justify-center ${
                          authMode === 'signin'
                            ? 'bg-white text-ink shadow-xs border border-[#E7E4F0]'
                            : 'text-muted hover:text-ink bg-transparent'
                        }`}
                      >
                        Sign in
                      </button>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-5">
                      {authMode === 'signup' && (
                        <>
                          <div>
                            <label className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                              Full name *
                            </label>
                            <input
                              type="text"
                              required
                              autoComplete="name"
                              placeholder="Alex Mercer"
                              value={loginName}
                              onChange={(e) => setLoginName(e.target.value)}
                              className="w-full h-12 px-3.5 text-base text-ink border border-[#E7E4F0] rounded-[6px] outline-none focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]"
                              disabled={isLoggingIn}
                            />
                          </div>

                          <div>
                            <label className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                              Phone number *
                            </label>
                            {/* Connected group with fixed +91 chip: zero overlapping */}
                            <div className="flex items-center h-12 border border-[#E7E4F0] rounded-[6px] overflow-hidden focus-within:border-[#6D4AE0] focus-within:ring-1 focus-within:ring-[#6D4AE0] bg-white">
                              <span className="h-full px-3.5 bg-[#F7F6FB] border-r border-[#E7E4F0] text-sm text-ink/70 font-medium flex items-center select-none shrink-0">
                                +91
                              </span>
                              <input
                                type="tel"
                                inputMode="numeric"
                                pattern="[0-9]{10}"
                                maxLength={10}
                                required
                                autoComplete="tel-national"
                                placeholder="9876543210"
                                value={loginPhone}
                                onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                className="h-full flex-1 px-3.5 text-base text-ink outline-none border-none bg-transparent"
                                disabled={isLoggingIn}
                              />
                            </div>
                            <p className="text-[14px] leading-[20px] text-muted mt-1.5">
                              We use this for delivery updates.
                            </p>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                          Email address *
                        </label>
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="name@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full h-12 px-3.5 text-base text-ink border border-[#E7E4F0] rounded-[6px] outline-none focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]"
                          disabled={isLoggingIn}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[14px] leading-[20px] font-medium text-ink/90">
                            Password *
                          </label>
                          {authMode === 'signin' && (
                            <Link href="/account" className="text-xs text-[#6D4AE0] hover:underline">
                              Forgot password?
                            </Link>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                            placeholder="At least 8 characters"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full h-12 pl-3.5 pr-11 text-base text-ink border border-[#E7E4F0] rounded-[6px] outline-none focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]"
                            disabled={isLoggingIn}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink cursor-pointer bg-transparent border-none"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                          </button>
                        </div>
                        {authMode === 'signup' && (
                          <p className="text-[13px] leading-[18px] text-muted mt-1.5">
                            Must be at least 8 characters.
                          </p>
                        )}
                      </div>

                      {authMode === 'signup' && (
                        <div className="space-y-3 pt-2">
                          <label className="flex items-start gap-2.5 text-[14px] leading-[20px] text-ink cursor-pointer">
                            <input
                              type="checkbox"
                              required
                              checked={authTerms}
                              onChange={(e) => setAuthTerms(e.target.checked)}
                              className="mt-0.5 rounded-[4px] border-[#E7E4F0] text-[#6D4AE0] focus:ring-[#6D4AE0]"
                            />
                            <span>
                              I agree to the{' '}
                              <Link href="/terms" target="_blank" className="text-[#6D4AE0] underline">
                                Terms of Service
                              </Link>{' '}
                              and{' '}
                              <Link href="/privacy" target="_blank" className="text-[#6D4AE0] underline">
                                Privacy Policy
                              </Link>
                              . *
                            </span>
                          </label>

                          <label className="flex items-start gap-2.5 text-[14px] leading-[20px] text-muted cursor-pointer">
                            <input
                              type="checkbox"
                              checked={authConsent}
                              onChange={(e) => setAuthConsent(e.target.checked)}
                              className="mt-0.5 rounded-[4px] border-[#E7E4F0] text-[#6D4AE0] focus:ring-[#6D4AE0]"
                            />
                            <span>Email me LUMI updates and launch news</span>
                          </label>
                        </div>
                      )}

                      {loginError && (
                        <div
                          role="alert"
                          className="p-3.5 bg-[#B42318]/5 border border-[#B42318]/30 rounded-lg text-sm text-[#B42318] flex items-center gap-2"
                        >
                          <IconAlertCircle size={16} className="shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full h-12 rounded-[6px] bg-[#6D4AE0] hover:bg-[#5B3CC4] text-white text-base font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer mt-4"
                      >
                        {isLoggingIn ? (
                          <>
                            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            <span>{authMode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                          </>
                        ) : (
                          <>
                            <span>{authMode === 'signup' ? 'Create account and continue' : 'Sign in and continue'}</span>
                            <IconArrowRight size={16} />
                          </>
                        )}
                      </button>

                      <div className="pt-2 text-center">
                        <p className="text-[14px] leading-[20px] text-muted">
                          {authMode === 'signup' ? (
                            <>
                              Already have an account?{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthMode('signin');
                                  setLoginError('');
                                }}
                                className="text-[#6D4AE0] hover:underline font-medium cursor-pointer bg-transparent border-none p-0 inline"
                              >
                                Sign in
                              </button>
                            </>
                          ) : (
                            <>
                              New customer?{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthMode('signup');
                                  setLoginError('');
                                }}
                                className="text-[#6D4AE0] hover:underline font-medium cursor-pointer bg-transparent border-none p-0 inline"
                              >
                                Create an account
                              </button>
                            </>
                          )}
                        </p>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: DELIVERY AND PAYMENT */}
            {currentStep === 2 && (
              <div className="bg-white border border-[#E7E4F0] rounded-lg p-6 sm:p-8">
                {/* User status bar */}
                <div className="flex items-center justify-between pb-5 mb-6 border-b border-[#E7E4F0]">
                  <div>
                    <span className="text-xs text-muted block">Signed in as</span>
                    <span className="text-sm font-semibold text-ink">{authEmail}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-[#6D4AE0] hover:underline cursor-pointer bg-transparent border-none"
                  >
                    Change account
                  </button>
                </div>

                <div className="mb-6">
                  <h2 className="preorder-card-title text-ink tracking-tight mb-2">Delivery details</h2>
                  <p className="text-[16px] leading-[24px] text-muted">Enter the shipping address for your LUMI delivery.</p>
                </div>

                {/* Validation summary banner */}
                {Object.keys(fieldErrors).length > 0 && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="mb-6 p-4 bg-[#B42318]/5 border border-[#B42318]/30 rounded-lg text-sm text-[#B42318] space-y-1"
                  >
                    <p className="font-semibold flex items-center gap-1.5">
                      <IconAlertCircle size={16} />
                      Please correct the following fields:
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-0.5 pl-2">
                      {Object.entries(fieldErrors).map(([key, msg]) => (
                        <li key={key}>
                          <a href={`#field-${key}`} className="underline hover:text-ink">
                            {msg}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleStartCheckout} className="space-y-5">
                  {/* Recipient Full Name */}
                  <div>
                    <label htmlFor="field-fullName" className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                      Full name *
                    </label>
                    <input
                      id="field-fullName"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Alex Mercer"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        if (fieldErrors.fullName) {
                          const updated = { ...fieldErrors };
                          delete updated.fullName;
                          setFieldErrors(updated);
                        }
                      }}
                      className={`w-full h-12 px-3.5 text-base border rounded-[6px] outline-none transition-colors ${
                        fieldErrors.fullName
                          ? 'border-[#B42318] focus:ring-1 focus:ring-[#B42318]'
                          : 'border-[#E7E4F0] focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]'
                      }`}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-xs text-[#B42318] mt-1.5">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  {/* Phone & Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="field-phone" className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                        Phone number *
                      </label>
                      <div
                        className={`flex items-center h-12 border rounded-[6px] overflow-hidden bg-white ${
                          fieldErrors.phone
                            ? 'border-[#B42318]'
                            : 'border-[#E7E4F0] focus-within:border-[#6D4AE0] focus-within:ring-1 focus-within:ring-[#6D4AE0]'
                        }`}
                      >
                        <span className="h-full px-3.5 bg-[#F7F6FB] border-r border-[#E7E4F0] text-sm text-ink/70 font-medium flex items-center select-none shrink-0">
                          +91
                        </span>
                        <input
                          id="field-phone"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                          autoComplete="tel-national"
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                            });
                            if (fieldErrors.phone) {
                              const updated = { ...fieldErrors };
                              delete updated.phone;
                              setFieldErrors(updated);
                            }
                          }}
                          className="h-full flex-1 px-3.5 text-base text-ink outline-none border-none bg-transparent"
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="text-xs text-[#B42318] mt-1.5">{fieldErrors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">Email address</label>
                      <input
                        type="email"
                        disabled
                        value={formData.email || authEmail}
                        className="w-full h-12 px-3.5 text-base bg-[#F7F6FB] text-muted border border-[#E7E4F0] rounded-[6px] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Address Line 1 */}
                  <div>
                    <label htmlFor="field-addressLine1" className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                      Address line 1 *
                    </label>
                    <input
                      id="field-addressLine1"
                      type="text"
                      required
                      autoComplete="address-line1"
                      placeholder="House, flat or building number, street name"
                      value={formData.addressLine1}
                      onChange={(e) => {
                        setFormData({ ...formData, addressLine1: e.target.value });
                        if (fieldErrors.addressLine1) {
                          const updated = { ...fieldErrors };
                          delete updated.addressLine1;
                          setFieldErrors(updated);
                        }
                      }}
                      className={`w-full h-12 px-3.5 text-base border rounded-[6px] outline-none transition-colors ${
                        fieldErrors.addressLine1
                          ? 'border-[#B42318] focus:ring-1 focus:ring-[#B42318]'
                          : 'border-[#E7E4F0] focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]'
                      }`}
                    />
                    {fieldErrors.addressLine1 && (
                      <p className="text-xs text-[#B42318] mt-1.5">{fieldErrors.addressLine1}</p>
                    )}
                  </div>

                  {/* Address Line 2 */}
                  <div>
                    <label htmlFor="field-addressLine2" className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                      Address line 2 (optional)
                    </label>
                    <input
                      id="field-addressLine2"
                      type="text"
                      autoComplete="address-line2"
                      placeholder="Apartment, suite, area, landmark"
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                      className="w-full h-12 px-3.5 text-base border border-[#E7E4F0] rounded-[6px] outline-none focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]"
                    />
                  </div>

                  {/* City, State, PIN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="field-city" className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                        City *
                      </label>
                      <input
                        id="field-city"
                        type="text"
                        required
                        autoComplete="address-level2"
                        placeholder="Bengaluru"
                        value={formData.city}
                        onChange={(e) => {
                          setFormData({ ...formData, city: e.target.value });
                          if (fieldErrors.city) {
                            const updated = { ...fieldErrors };
                            delete updated.city;
                            setFieldErrors(updated);
                          }
                        }}
                        className={`w-full h-12 px-3.5 text-base border rounded-[6px] outline-none transition-colors ${
                          fieldErrors.city
                            ? 'border-[#B42318] focus:ring-1 focus:ring-[#B42318]'
                            : 'border-[#E7E4F0] focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]'
                        }`}
                      />
                      {fieldErrors.city && (
                        <p className="text-xs text-[#B42318] mt-1.5">{fieldErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="field-state" className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                        State *
                      </label>
                      <select
                        id="field-state"
                        required
                        value={formData.state}
                        onChange={(e) => {
                          setFormData({ ...formData, state: e.target.value });
                          if (fieldErrors.state) {
                            const updated = { ...fieldErrors };
                            delete updated.state;
                            setFieldErrors(updated);
                          }
                        }}
                        className={`w-full h-12 px-3 text-base border rounded-[6px] outline-none bg-white transition-colors cursor-pointer ${
                          fieldErrors.state
                            ? 'border-[#B42318] focus:ring-1 focus:ring-[#B42318]'
                            : 'border-[#E7E4F0] focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]'
                        }`}
                      >
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.state && (
                        <p className="text-xs text-[#B42318] mt-1.5">{fieldErrors.state}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="field-postalCode" className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                        PIN code *
                      </label>
                      <input
                        id="field-postalCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        autoComplete="postal-code"
                        placeholder="560001"
                        value={formData.postalCode}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            postalCode: e.target.value.replace(/\D/g, '').slice(0, 6),
                          });
                          if (fieldErrors.postalCode) {
                            const updated = { ...fieldErrors };
                            delete updated.postalCode;
                            setFieldErrors(updated);
                          }
                        }}
                        className={`w-full h-12 px-3.5 text-base border rounded-[6px] outline-none transition-colors ${
                          fieldErrors.postalCode
                            ? 'border-[#B42318] focus:ring-1 focus:ring-[#B42318]'
                            : 'border-[#E7E4F0] focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]'
                        }`}
                      />
                      {fieldErrors.postalCode && (
                        <p className="text-xs text-[#B42318] mt-1.5">{fieldErrors.postalCode}</p>
                      )}
                    </div>
                  </div>

                  {/* Optional GSTIN */}
                  <div>
                    <label htmlFor="field-gstNumber" className="block text-[14px] leading-[20px] font-medium text-ink/90 mb-2">
                      GSTIN (optional, for business invoice)
                    </label>
                    <input
                      id="field-gstNumber"
                      type="text"
                      placeholder="29AAAAA0000A1Z5"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                      className="w-full h-12 px-3.5 text-base border border-[#E7E4F0] rounded-[6px] outline-none focus:border-[#6D4AE0] focus:ring-1 focus:ring-[#6D4AE0]"
                    />
                  </div>

                  {/* Pre-order Terms Agreement */}
                  <div className="pt-2 border-t border-[#E7E4F0]">
                    <label className="flex items-start gap-2.5 text-[14px] leading-[20px] text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={formData.termsAccepted}
                        onChange={(e) => {
                          setFormData({ ...formData, termsAccepted: e.target.checked });
                          if (fieldErrors.termsAccepted) {
                            const updated = { ...fieldErrors };
                            delete updated.termsAccepted;
                            setFieldErrors(updated);
                          }
                        }}
                        className="mt-0.5 rounded-[4px] border-[#E7E4F0] text-[#6D4AE0] focus:ring-[#6D4AE0]"
                      />
                      <span>
                        I agree to the{' '}
                        <Link href="/terms" target="_blank" className="text-[#6D4AE0] underline">
                          Pre-Order Terms
                        </Link>{' '}
                        and{' '}
                        <Link href="/refund-policy" target="_blank" className="text-[#6D4AE0] underline">
                          Refund Policy
                        </Link>
                        . *
                      </span>
                    </label>
                    {fieldErrors.termsAccepted && (
                      <p className="text-xs text-[#B42318] mt-1.5">{fieldErrors.termsAccepted}</p>
                    )}
                  </div>

                  {isPaymentDisabled && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-[6px] text-xs text-amber-800 mt-4">
                      Online payment will be enabled once pre-order pricing is officially confirmed by the client.
                    </div>
                  )}

                  {/* Primary Submit Button: 48px tall */}
                  <button
                    type="submit"
                    disabled={isSubmitting || isPaymentDisabled}
                    className="w-full h-12 rounded-[6px] bg-[#6D4AE0] hover:bg-[#5B3CC4] disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer mt-6"
                  >
                    {isPaymentDisabled ? (
                      <span>Payment pending pricing confirmation</span>
                    ) : isSubmitting ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Initializing payment...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay {formatPrice(depositPaise)} deposit</span>
                        <IconArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 3: CONFIRMATION */}
            {currentStep === 3 && confirmedOrder && (
              <div className="bg-white border border-[#E7E4F0] rounded-lg p-6 sm:p-8">
                <div className="text-center py-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#12805C]/10 text-[#12805C] flex items-center justify-center mx-auto mb-4">
                    <IconCheck size={24} />
                  </div>
                  <h2 className="preorder-card-title text-ink tracking-tight mb-2">
                    Reservation confirmed
                  </h2>
                  <p className="text-[16px] leading-[24px] text-muted">
                    We have received your pre-order deposit and assigned your reservation.
                  </p>
                </div>

                <div className="bg-[#F7F6FB] border border-[#E7E4F0] rounded-lg p-5 mb-6 space-y-3 text-[14px] leading-[20px]">
                  <div className="flex justify-between">
                    <span className="text-muted">Order reference</span>
                    <span className="font-semibold text-ink font-mono">{confirmedOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Quantity</span>
                    <span className="text-ink">
                      {confirmedOrder.quantity} unit{confirmedOrder.quantity > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Deposit paid</span>
                    <span className="text-ink font-semibold tabular-nums">
                      {formatPrice(confirmedOrder.amountPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Payment ID</span>
                    <span className="text-muted font-mono text-xs">{confirmedOrder.paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Confirmation sent to</span>
                    <span className="text-ink">{confirmedOrder.email}</span>
                  </div>
                </div>

                <div className="space-y-3 text-[14px] leading-[20px] text-muted mb-8">
                  <h3 className="preorder-section-title text-ink">What happens next</h3>
                  <p>
                    A receipt and reservation confirmation have been emailed to your account address.
                  </p>
                  <p>
                    We will notify you by email before production begins. The remaining balance will only be requested prior to dispatch.
                  </p>
                  <p>
                    You can review, manage, or cancel your reservation anytime from your account portal.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/account"
                    className="flex-1 h-12 rounded-[6px] bg-[#6D4AE0] hover:bg-[#5B3CC4] text-white text-base font-medium flex items-center justify-center gap-2 no-underline transition-colors"
                  >
                    <span>View my orders</span>
                    <IconArrowRight size={16} />
                  </Link>
                  <Link
                    href="/"
                    className="h-12 px-6 rounded-[6px] border border-[#E7E4F0] text-ink text-base font-medium flex items-center justify-center no-underline hover:bg-[#F7F6FB] transition-colors"
                  >
                    Back to home
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Order Summary Card (Sticky on desktop) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white border border-[#E7E4F0] rounded-lg p-6 sm:p-8">
              {/* Product Tile */}
              <div className="w-full aspect-[4/3] relative rounded-md overflow-hidden bg-[#F7F6FB] mb-5 border border-[#E7E4F0]/60">
                <Image
                  src="/lumi_product_tile.png"
                  alt="LUMI telepresence robot"
                  fill
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-contain p-2"
                  priority
                />
              </div>

              {/* Title & Description */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="preorder-product-title text-ink tracking-tight mb-1">
                    LUMI telepresence robot
                  </h2>
                  <p className="text-[14px] leading-[20px] text-muted">Drive from your phone with live video and voice.</p>
                </div>
                {isDemoBuild && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    Demo values
                  </span>
                )}
              </div>

              {/* Quantity Stepper (if on Step 1 or 2) */}
              {currentStep !== 3 && (
                <div className="py-4 border-t border-[#E7E4F0] flex items-center justify-between">
                  <span className="text-[14px] leading-[20px] font-medium text-ink">Quantity</span>
                  <div className="flex items-center border border-[#E7E4F0] rounded-[6px] overflow-hidden">
                    <button
                      type="button"
                      disabled={formData.quantity <= 1}
                      onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                      className="w-9 h-9 flex items-center justify-center text-ink hover:bg-[#F7F6FB] disabled:opacity-40 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-9 text-center text-sm font-semibold text-ink tabular-nums">
                      {formData.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={formData.quantity >= quantityCap}
                      onClick={() =>
                        setFormData({ ...formData, quantity: Math.min(quantityCap, formData.quantity + 1) })
                      }
                      className="w-9 h-9 flex items-center justify-center text-ink hover:bg-[#F7F6FB] disabled:opacity-40 disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Pricing Rows (16px, tabular-nums) */}
              <div className="py-4 border-t border-[#E7E4F0] space-y-2.5 text-[16px] leading-[24px]">
                <div className="flex justify-between text-muted">
                  <span>Price ({formData.quantity} unit{formData.quantity > 1 ? 's' : ''})</span>
                  <span className="text-ink tabular-nums font-medium">{formatPrice(totalPricePaise)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Deposit due today</span>
                  <span className="text-ink tabular-nums font-medium">{formatPrice(depositPaise)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Balance due before dispatch</span>
                  <span className="text-muted tabular-nums">{formatPrice(balancePaise)}</span>
                </div>
              </div>

              {/* Divider & Due Today Row (28px semibold) */}
              <div className="pt-4 border-t border-[#E7E4F0] flex items-baseline justify-between mb-4">
                <span className="text-[18px] leading-[28px] font-semibold text-ink">Due today</span>
                <span className="text-[28px] leading-[36px] font-semibold text-ink tabular-nums">
                  {formatPrice(depositPaise)}
                </span>
              </div>

              {/* Approved Refund policy statement */}
              <p className="text-[13px] leading-[18px] text-muted mb-4">
                Deposits are refundable prior to dispatch. Read our{' '}
                <Link href="/refund-policy" className="text-[#6D4AE0] underline hover:text-[#5B3CC4]">
                  Refund policy
                </Link>
                .
              </p>

              {/* Razorpay statement with lock icon */}
              <div className="pt-4 border-t border-[#E7E4F0] flex items-start gap-2 text-[13px] leading-[18px] text-muted">
                <IconLock size={14} className="shrink-0 mt-0.5 text-muted" />
                <span>
                  UPI, cards, netbanking and wallets. Payments are processed by Razorpay.
                </span>
              </div>
            </div>

            {/* Compact 'Good to know' list under summary */}
            <div className="bg-white border border-[#E7E4F0] rounded-lg p-6 space-y-4">
              <h3 className="preorder-section-title text-ink">Good to know</h3>

              <div className="flex items-start gap-3">
                <IconTruck size={20} className="shrink-0 text-muted mt-0.5" />
                <div>
                  <h4 className="text-[16px] leading-[24px] font-semibold text-ink">Delivery schedule</h4>
                  <p className="text-[14px] leading-[20px] text-muted mt-0.5">
                    Estimated delivery dates will be confirmed when your unit enters production. Read our{' '}
                    <Link href="/terms" className="text-[#6D4AE0] underline hover:text-[#5B3CC4]">
                      Shipping policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconShield size={20} className="shrink-0 text-muted mt-0.5" />
                <div>
                  <h4 className="text-[16px] leading-[24px] font-semibold text-ink">Hardware coverage</h4>
                  <p className="text-[14px] leading-[20px] text-muted mt-0.5">
                    Includes standard hardware coverage against manufacturing defects. Read our{' '}
                    <Link href="/terms" className="text-[#6D4AE0] underline hover:text-[#5B3CC4]">
                      Warranty policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconRefresh size={20} className="shrink-0 text-muted mt-0.5" />
                <div>
                  <h4 className="text-[16px] leading-[24px] font-semibold text-ink">Reservation cancellation</h4>
                  <p className="text-[14px] leading-[20px] text-muted mt-0.5">
                    You can manage or cancel your pre-order anytime from your account dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Bar (< 768px) on Step 1 and 2 */}
        {currentStep !== 3 && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E7E4F0] px-5 py-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] flex items-center justify-between gap-4 shadow-lg">
            <div className="pl-10 sm:pl-0">
              <span className="block text-xs text-muted">Due today</span>
              <span className="text-lg font-semibold text-ink tabular-nums">
                {formatPrice(depositPaise)}
              </span>
            </div>
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (isAuthenticated) {
                    setCurrentStep(2);
                  } else {
                    const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
                    submitBtn?.click();
                  }
                }}
                className="h-11 px-5 rounded-[6px] bg-[#6D4AE0] text-white text-sm font-medium flex items-center gap-1.5 cursor-pointer border-none"
              >
                <span>{isAuthenticated ? 'Continue' : 'Continue'}</span>
                <IconArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || isPaymentDisabled}
                onClick={() => {
                  const submitBtn = document.querySelector('form button[type="submit"]') as HTMLButtonElement | null;
                  submitBtn?.click();
                }}
                className="h-11 px-5 rounded-[6px] bg-[#6D4AE0] text-white text-sm font-medium flex items-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
              >
                <span>{isPaymentDisabled ? 'Pending pricing' : 'Pay deposit'}</span>
                <IconArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mock Payment Gateway Modal */}
      <MockPaymentModal
        isOpen={paymentModalState.isOpen}
        onClose={() => setPaymentModalState((prev) => ({ ...prev, isOpen: false }))}
        orderNumber={paymentModalState.orderNumber}
        gatewayOrderId={paymentModalState.gatewayOrderId}
        amountPaise={paymentModalState.amountPaise}
        customerName={formData.fullName}
        customerEmail={formData.email}
        customerPhone={formData.phone}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
    </main>
  );
}
