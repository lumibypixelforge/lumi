'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LumiLogo } from '@/components/ui/lumi-logo';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const [step, setStep] = useState<'credentials' | 'totp' | 'enroll_totp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [totpSecret, setTotpSecret] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    if (reason === 'idle_timeout') return 'Your session timed out after 30 minutes of inactivity. Please sign in again.';
    if (reason === 'session_expired') return 'Your session reached the maximum duration of 8 hours. Please sign in again.';
    return null;
  });

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed.');
        setLoading(false);
        return;
      }

      setFactorId(data.factorId);

      if (data.step === 'enroll_totp') {
        setQrCodeSvg(data.qrCode);
        setTotpSecret(data.secret);
        setStep('enroll_totp');
      } else {
        setStep('totp');
      }
    } catch {
      setErrorMsg('A network error occurred while connecting to the authorization server.');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId,
          code: totpCode.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to verify authentication code.');
        setLoading(false);
        return;
      }

      // Hard redirect to admin root to trigger clean server session load
      window.location.href = data.redirect || '/admin';
    } catch {
      setErrorMsg('A network error occurred during verification.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6FB] flex flex-col justify-center px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Admin Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <LumiLogo size="sm" className="text-ink" />
            <span className="bg-[#6420AA] text-white text-[11px] font-mono px-2 py-0.5 rounded-[4px] font-medium tracking-wide">
              ADMIN
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight font-display">
            Operational sign-in
          </h1>
          <p className="mt-1 text-xs text-muted">
            Internal administration portal. Approved personnel and multi-factor verification required.
          </p>
        </div>

        {/* Card Box */}
        <div className="mt-6 sm:mt-8 bg-card py-6 px-4 sm:py-8 sm:px-10 border border-border rounded-[8px] shadow-none">
          {errorMsg && (
            <div
              className="mb-5 p-3 rounded-[6px] bg-[#FDECEA] border border-[#FECDCA] text-xs text-[#B42318] leading-relaxed"
              role="alert"
            >
              {errorMsg}
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-[13px] font-medium text-ink mb-1.5"
                >
                  Admin email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lumi.com"
                  className="w-full px-3 py-2 text-base sm:text-sm bg-canvas border border-border rounded-[6px] text-ink placeholder:text-muted/60 focus:outline-none focus:border-[#6420AA]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-[13px] font-medium text-ink mb-1.5"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-base sm:text-sm bg-canvas border border-border rounded-[6px] text-ink placeholder:text-muted/60 focus:outline-none focus:border-[#6420AA]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying credentials...' : 'Continue to second factor'}
                </button>
              </div>
            </form>
          )}

          {step === 'totp' && (
            <form onSubmit={handleTotpVerify} className="space-y-4">
              <div className="p-3 bg-[#F1EFF8] border border-border rounded-[6px]">
                <p className="text-xs text-ink font-medium">Authenticator check</p>
                <p className="text-[12px] text-muted mt-0.5">
                  Enter the 6-digit verification code from your TOTP authenticator application for <strong className="text-ink">{email}</strong>.
                </p>
              </div>

              <div>
                <label
                  htmlFor="totp-code"
                  className="block text-[13px] font-medium text-ink mb-1.5"
                >
                  Verification code
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-3 py-2 text-center text-lg tracking-[0.25em] font-mono bg-canvas border border-border rounded-[6px] text-ink focus:outline-none focus:border-[#6420AA]"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="w-full py-2.5 px-4 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Confirm and sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setTotpCode('');
                  }}
                  className="w-full py-2 px-4 bg-transparent text-xs text-muted hover:text-ink font-medium transition-colors"
                >
                  Cancel and use different account
                </button>
              </div>
            </form>
          )}

          {step === 'enroll_totp' && (
            <form onSubmit={handleTotpVerify} className="space-y-4">
              <div className="p-3 bg-[#FFF3D6] border border-[#FEE4A6] rounded-[6px] text-xs text-[#8A5A00]">
                <p className="font-semibold">First-time authenticator setup</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Scan the QR code with Google Authenticator, 1Password, or any standard TOTP app. Then enter the generated 6-digit code below.
                </p>
              </div>

              {qrCodeSvg && (
                <div className="flex justify-center p-3 bg-white border border-border rounded-[6px]">
                  {qrCodeSvg.includes('<svg') ? (
                    <div
                      className="w-44 h-44 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{
                        __html: qrCodeSvg.slice(qrCodeSvg.indexOf('<svg')),
                      }}
                    />
                  ) : (
                    <img
                      src={
                        qrCodeSvg.startsWith('data:image/svg+xml;utf-8,')
                          ? `data:image/svg+xml;utf-8,${encodeURIComponent(
                              qrCodeSvg.replace('data:image/svg+xml;utf-8,', '')
                            )}`
                          : qrCodeSvg
                      }
                      alt="TOTP Setup QR Code"
                      className="w-44 h-44"
                    />
                  )}
                </div>
              )}

              {totpSecret && (
                <div>
                  <label className="block text-[11px] text-muted mb-1">
                    Manual entry secret key
                  </label>
                  <code className="block p-2 bg-canvas border border-border rounded-[4px] text-[11px] sm:text-[12px] font-mono select-all text-center text-ink break-all">
                    {totpSecret}
                  </code>
                </div>
              )}

              <div>
                <label
                  htmlFor="enroll-code"
                  className="block text-[13px] font-medium text-ink mb-1.5"
                >
                  Enter code from app
                </label>
                <input
                  id="enroll-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-3 py-2 text-center text-lg tracking-[0.25em] font-mono bg-canvas border border-border rounded-[6px] text-ink focus:outline-none focus:border-[#6420AA]"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="w-full py-2.5 px-4 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Activating authenticator...' : 'Complete enrollment and enter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setTotpCode('');
                  }}
                  className="w-full py-2 px-4 bg-transparent text-xs text-muted hover:text-ink font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] text-muted">
          All administrative sessions are logged and cryptographically audited.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4 text-xs text-muted">Loading authentication console...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
