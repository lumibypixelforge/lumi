'use client';

import { useState } from 'react';

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
}

export function ReauthModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Sensitive action verification',
}: ReauthModalProps) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/auth/reauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Re-authentication failed.');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setErrorMsg('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reauth-title"
    >
      <div className="bg-card border border-border rounded-[8px] max-w-md w-full p-4 sm:p-6 shadow-xl space-y-4 mx-2 sm:mx-auto">
        <div>
          <h3 id="reauth-title" className="text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px] font-semibold text-ink">
            {actionTitle}
          </h3>
          <p className="text-[12px] leading-[16px] text-muted mt-1">
            This action requires fresh authentication within the last 10 minutes. Please enter your administrator password and 6-digit TOTP code.
          </p>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-[6px] bg-[#FDECEA] border border-[#FECDCA] text-xs text-[#B42318]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-base sm:text-sm bg-canvas border border-border rounded-[6px] text-ink focus:outline-none focus:border-[#6420AA]"
              placeholder="••••••••••••"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1">
              6-digit authenticator code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 text-center text-lg sm:text-base tracking-[0.25em] font-mono bg-canvas border border-border rounded-[6px] text-ink focus:outline-none focus:border-[#6420AA]"
              placeholder="123456"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-medium text-muted hover:text-ink transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6 || !password}
              className="px-4 py-2 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50 flex-1 sm:flex-initial"
            >
              {loading ? 'Verifying...' : 'Authorize action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
