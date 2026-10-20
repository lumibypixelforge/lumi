'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/config/product';
import { createClient } from '@/lib/supabase/client';
import { IconCheck, IconRefresh, IconArrowRight, IconShield } from '@/components/ui/icons';
import type { User } from '@supabase/supabase-js';

interface PreorderItem {
  id: string;
  order_number: string;
  quantity: number;
  deposit_paise: number;
  total_paise: number;
  payment_status: string;
  order_status: string;
  created_at: string;
  shipping_address: {
    fullName?: string;
    city?: string;
    state?: string;
  };
}

export default function AccountPage() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [activeEmail, setActiveEmail] = useState('');
  const [orders, setOrders] = useState<PreorderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [consent, setConsent] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Quick lookup of reservations for the customer
  const handleLookup = async (emailToLookup: string) => {
    if (!emailToLookup || !emailToLookup.includes('@')) return;
    setLoading(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/account/orders?email=${encodeURIComponent(emailToLookup)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
        setActiveEmail(emailToLookup);
        setSearched(true);
        if (data.marketingConsent !== undefined) {
          setConsent(data.marketingConsent);
        }
      }
    } catch {
      setNotice('Could not load reservations at this time.');
    } finally {
      setLoading(false);
    }
  };

  // Check genuine active Supabase session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setAuthUser(user);
          await handleLookup(user.email);
        }
      } catch (err) {
        console.error('[Account] Auth session check error:', err);
      } finally {
        setAuthChecking(false);
      }
    };

    initAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    setAuthUser(null);
    setActiveEmail('');
    setOrders([]);
    setSearched(false);
    setNotice('You have been signed out.');
  };

  const handleUpdateConsent = async (newVal: boolean) => {
    setConsent(newVal);
    try {
      await fetch('/api/account/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: activeEmail, consent: newVal }),
      });
      setNotice('Communication preferences updated.');
    } catch {
      setNotice('Could not update preferences.');
    }
  };

  return (
    <main className="min-h-screen pt-32 pb-24 bg-canvas">
      <div className="container-md max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-accent font-semibold uppercase tracking-wider">
              Customer Portal
            </span>
          </div>
          <h1 className="text-3xl font-bold text-ink">My LUMI Account</h1>
          <p className="text-muted text-sm mt-1">
            Track your Batch 01 reservations, manage delivery addresses, and configure communication preferences.
          </p>
        </div>

        {notice && (
          <div className="mb-6 p-3 bg-accent/10 border border-accent/30 rounded text-xs text-accent font-medium">
            {notice}
          </div>
        )}

        {/* User Profile Bar (if logged in via Supabase) */}
        {authUser && (
          <div className="bg-card border border-border rounded-xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold flex items-center justify-center text-sm">
                {(authUser.user_metadata?.full_name || authUser.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-ink">
                    {authUser.user_metadata?.full_name || 'LUMI Account Member'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-muted font-mono mt-0.5">{authUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/preorder"
                className="btn btn-secondary text-xs px-3.5 py-1.5 no-underline inline-flex items-center gap-1"
              >
                <span>New Reservation</span>
                <IconArrowRight size={13} />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn btn-secondary text-xs px-3.5 py-1.5 cursor-pointer hover:text-red-400"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Loading State while checking auth */}
        {authChecking ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center max-w-lg mx-auto">
            <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono text-muted">Checking authentication status...</p>
          </div>
        ) : !searched && !authUser ? (
          /* Unauthenticated State: Sign in or quick lookup */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            {/* Option 1: Sign in with Supabase */}
            <div className="bg-card border border-border rounded-xl p-6 md:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-accent">AUTHENTICATION</span>
                </div>
                <h2 className="text-base font-bold text-ink mb-1.5">Sign In to Your Account</h2>
                <p className="text-xs text-muted mb-6 leading-relaxed">
                  Log in to your verified LUMI account to track production milestones, manage hardware allocations, and see estimated dispatch dates.
                </p>
              </div>
              <Link
                href="/preorder"
                className="btn btn-primary w-full py-3 text-center justify-center text-xs font-semibold no-underline inline-flex items-center gap-1.5"
              >
                <span>Sign In or Pre-Order</span>
                <IconArrowRight size={14} />
              </Link>
            </div>

            {/* Option 2: Quick email lookup */}
            <div className="bg-card border border-border rounded-xl p-6 md:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-mono text-muted uppercase tracking-wider">GUEST LOOKUP</span>
                </div>
                <h2 className="text-base font-bold text-ink mb-1.5">Quick Order Lookup</h2>
                <p className="text-xs text-muted mb-4 leading-relaxed">
                  Enter the email address provided during checkout to retrieve your priority reservation details.
                </p>
                <div className="space-y-3 mb-4">
                  <input
                    type="email"
                    placeholder="you@domain.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="input text-xs w-full"
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup(emailInput)}
                  />
                  <button
                    type="button"
                    disabled={loading || !emailInput}
                    onClick={() => handleLookup(emailInput)}
                    className="btn btn-secondary w-full py-2.5 text-xs font-medium cursor-pointer"
                  >
                    {loading ? 'Finding Orders...' : 'Find Reservations'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted text-center font-mono">
                Only shows reservations matching this email.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active User Bar when not logged in but searched */}
            {!authUser && (
              <div className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-muted block text-[11px] uppercase font-mono">Viewing Orders For</span>
                  <span className="font-semibold text-ink">{activeEmail}</span>
                </div>
                <button
                  onClick={() => {
                    setSearched(false);
                    setActiveEmail('');
                    setOrders([]);
                  }}
                  className="text-xs text-accent hover:underline self-start sm:self-auto font-medium cursor-pointer"
                >
                  Check another email
                </button>
              </div>
            )}

            {/* Orders List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-mono uppercase tracking-wider text-muted font-semibold">
                  Active Reservations ({orders.length})
                </h2>
                <button
                  type="button"
                  onClick={() => handleLookup(activeEmail || authUser?.email || '')}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-mono cursor-pointer disabled:opacity-50"
                  title="Refresh reservations"
                >
                  <IconRefresh size={13} className={loading ? 'animate-spin' : ''} />
                  <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <p className="text-sm text-ink font-medium mb-1">No reservations found</p>
                  <p className="text-xs text-muted mb-6">
                    No active pre-orders were found under {activeEmail}.
                  </p>
                  <Link href="/preorder" className="btn btn-primary text-xs px-5 py-2.5 no-underline inline-flex items-center gap-1.5">
                    <span>Reserve LUMI Now</span>
                    <IconArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-card border border-border rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-ink">
                            {order.order_number}
                          </span>
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-medium ${
                            order.payment_status === 'paid'
                              ? 'bg-positive/10 text-positive border border-positive/20'
                              : 'bg-muted/10 text-muted'
                          }`}>
                            {order.payment_status === 'paid' ? 'Deposit Paid' : 'Payment Pending'}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded font-medium bg-accent/10 text-accent">
                            Status: {order.order_status}
                          </span>
                        </div>

                        <div className="text-xs text-muted space-y-1">
                          <p>
                            Quantity: <strong className="text-ink">{order.quantity} unit{order.quantity > 1 ? 's' : ''}</strong> • Batch 01 (Estimated Q3 2026)
                          </p>
                          <p>
                            Deposit: <strong className="text-ink">{formatPrice(order.deposit_paise)}</strong> • Balance due on dispatch: <strong className="text-ink">{formatPrice(order.total_paise - order.deposit_paise)}</strong>
                          </p>
                          {order.shipping_address?.city && (
                            <p>Destination: {order.shipping_address.city}, {order.shipping_address.state}</p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex sm:flex-col gap-2">
                        <a
                          href={`mailto:support@lumi.robot?subject=Cancellation%20Request%20${order.order_number}`}
                          className="btn btn-secondary text-xs px-3 py-1.5 text-muted hover:text-negative"
                        >
                          Request Refund
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Communication Preferences */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-sm font-semibold text-ink mb-2">Communication & Privacy</h2>
              <p className="text-xs text-muted mb-4">
                We only send verified production milestone updates and firmware releases.
              </p>
              <label className="flex items-center gap-3 cursor-pointer text-xs text-ink select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => handleUpdateConsent(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span>Receive LUMI engineering and production progress reports</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
