'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/config/product';

interface PreorderItem {
  id: string;
  order_number: string;
  deposit_paise: number;
  total_paise: number;
  payment_status: string;
  order_status: string;
  quantity: number;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  shipping_address?: any;
}

interface OverviewProps {
  metrics: {
    totalRegistered: number;
    confirmedBuyers: number;
    totalDepositCollected: number;
    conversionRate: string;
    totalOrders: number;
  };
  segments: {
    confirmed_buyer: number;
    interested: number;
    prospect: number;
  };
  recentPreorders: PreorderItem[];
  attentionItems: {
    failedPayments7d: number;
    pendingPaymentsOver24h: number;
    paidAwaitingUpdate: number;
    signupsWithoutPhone: number;
  };
  profiles: Array<{ id: string; created_at?: string | null }>;
  preorders: PreorderItem[];
}

export function OverviewClientDashboard({
  metrics,
  segments,
  recentPreorders,
  attentionItems,
  profiles,
  preorders,
}: OverviewProps) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);

  // Filter timeline points by selected range
  const chartPoints = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const filteredProfiles = profiles.filter(
      (p) => p.created_at && new Date(p.created_at).getTime() >= cutoff
    );
    const filteredOrders = preorders.filter(
      (o) => o.payment_status === 'paid' && new Date(o.created_at).getTime() >= cutoff
    );

    // Group by day YYYY-MM-DD
    const map = new Map<string, { signups: number; orders: number }>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      map.set(key, { signups: 0, orders: 0 });
    }

    filteredProfiles.forEach((p) => {
      if (!p.created_at) return;
      const key = p.created_at.split('T')[0];
      if (map.has(key)) {
        map.get(key)!.signups++;
      }
    });

    filteredOrders.forEach((o) => {
      const key = o.created_at.split('T')[0];
      if (map.has(key)) {
        map.get(key)!.orders++;
      }
    });

    return Array.from(map.entries()).map(([date, counts]) => ({
      date: date.slice(5), // MM-DD
      ...counts,
    }));
  }, [dateRange, profiles, preorders]);

  const totalSegmentSum =
    segments.confirmed_buyer + segments.interested + segments.prospect;

  const confirmedPct =
    totalSegmentSum > 0 ? (segments.confirmed_buyer / totalSegmentSum) * 100 : 0;
  const interestedPct =
    totalSegmentSum > 0 ? (segments.interested / totalSegmentSum) * 100 : 0;
  const prospectPct =
    totalSegmentSum > 0 ? (segments.prospect / totalSegmentSum) * 100 : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <nav className="text-[12px] text-muted mb-1" aria-label="Breadcrumb">
            <span>Admin</span> / <span className="text-ink">Overview</span>
          </nav>
          <h1 className="text-[22px] sm:text-[28px] leading-[28px] sm:leading-[36px] font-semibold text-ink tracking-tight font-display">
            Overview
          </h1>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-card border border-border rounded-[6px]">
            {(
              [
                { label: '7 days', value: '7d' },
                { label: '30 days', value: '30d' },
                { label: 'All time', value: 'all' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setDateRange(tab.value)}
                className={`px-2.5 sm:px-3 py-1 text-[12px] sm:text-[13px] font-medium rounded-[4px] transition-colors ${
                  dateRange === tab.value
                    ? 'bg-[#6420AA] text-white'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link
            href="/admin/preorders"
            className="px-3 sm:px-3.5 py-1.5 bg-card border border-border text-ink hover:bg-canvas text-[12px] sm:text-[13px] font-medium rounded-[6px] no-underline transition-colors shrink-0"
          >
            Manage orders
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Registered Users */}
        <div className="p-4 sm:p-6 bg-card border border-border rounded-[8px] space-y-1.5 sm:space-y-2">
          <p className="text-[12px] sm:text-[13px] leading-[18px] font-medium text-muted">
            Registered users
          </p>
          <p className="text-[26px] sm:text-[32px] leading-tight sm:leading-[40px] font-semibold text-ink [font-variant-numeric:tabular-nums]">
            {metrics.totalRegistered}
          </p>
          <p className="text-[11px] sm:text-[12px] leading-[16px] text-muted">
            Total registered customer accounts
          </p>
        </div>

        {/* Confirmed Buyers */}
        <div className="p-4 sm:p-6 bg-card border border-border rounded-[8px] space-y-1.5 sm:space-y-2">
          <p className="text-[12px] sm:text-[13px] leading-[18px] font-medium text-muted">
            Confirmed buyers
          </p>
          <p className="text-[26px] sm:text-[32px] leading-tight sm:leading-[40px] font-semibold text-ink [font-variant-numeric:tabular-nums]">
            {metrics.confirmedBuyers}
          </p>
          <p className="text-[11px] sm:text-[12px] leading-[16px] text-muted">
            of {metrics.totalRegistered} registered
          </p>
        </div>

        {/* Deposits Collected */}
        <div className="p-4 sm:p-6 bg-card border border-border rounded-[8px] space-y-1.5 sm:space-y-2">
          <p className="text-[12px] sm:text-[13px] leading-[18px] font-medium text-muted">
            Deposits collected
          </p>
          <p className="text-[26px] sm:text-[32px] leading-tight sm:leading-[40px] font-semibold text-ink [font-variant-numeric:tabular-nums]">
            {formatPrice(metrics.totalDepositCollected)}
          </p>
          <p className="text-[11px] sm:text-[12px] leading-[16px] text-muted">
            Verified payments only
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="p-4 sm:p-6 bg-card border border-border rounded-[8px] space-y-1.5 sm:space-y-2 relative">
          <div className="flex items-center justify-between">
            <p className="text-[12px] sm:text-[13px] leading-[18px] font-medium text-muted">
              Conversion
            </p>
            <button
              type="button"
              onMouseEnter={() => setShowFormulaTooltip(true)}
              onMouseLeave={() => setShowFormulaTooltip(false)}
              onClick={() => setShowFormulaTooltip(!showFormulaTooltip)}
              className="text-muted hover:text-ink text-[12px] rounded-full p-0.5 focus:outline-none"
              aria-label="Conversion formula"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </button>
          </div>

          {showFormulaTooltip && (
            <div className="absolute right-4 sm:right-6 top-12 z-20 p-2.5 bg-ink text-white text-[11px] rounded-[4px] shadow-lg max-w-[200px] leading-relaxed">
              Formula: (Confirmed buyers / Registered users) × 100
            </div>
          )}

          <p className="text-[26px] sm:text-[32px] leading-tight sm:leading-[40px] font-semibold text-ink [font-variant-numeric:tabular-nums]">
            {metrics.conversionRate}%
          </p>
          <p className="text-[11px] sm:text-[12px] leading-[16px] text-muted">
            Confirmed buyers / registered users
          </p>
        </div>
      </div>

      {/* Segment Bar */}
      <div className="p-4 sm:p-6 bg-card border border-border rounded-[8px] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] leading-[28px] font-semibold text-ink">
              Customer segments
            </h2>
            <p className="text-[12px] leading-[16px] text-muted">
              Live distribution of registered users across the preorder funnel
            </p>
          </div>
          <Link
            href="/admin/customers"
            className="text-[13px] font-medium text-[#6420AA] hover:underline"
          >
            View all customers →
          </Link>
        </div>

        {/* Proportional Segment Bar */}
        <div className="h-3 w-full bg-[#F1EFF8] rounded-[4px] overflow-hidden flex">
          <div
            style={{ width: `${confirmedPct}%` }}
            className="bg-[#12805C] h-full transition-all duration-300"
            title={`Confirmed buyers: ${segments.confirmed_buyer}`}
          />
          <div
            style={{ width: `${interestedPct}%` }}
            className="bg-[#8A5A00] h-full transition-all duration-300"
            title={`Interested: ${segments.interested}`}
          />
          <div
            style={{ width: `${prospectPct}%` }}
            className="bg-[#5B5670] h-full transition-all duration-300"
            title={`Prospects: ${segments.prospect}`}
          />
        </div>

        {/* Segment Legend with Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="flex items-center gap-2 p-2 rounded-[6px] bg-[#E6F4EE] border border-[#A6E1CA]">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#12805C] shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-[13px] text-[#12805C] font-medium">Confirmed buyers</span>
              <span className="text-[13px] font-semibold text-[#12805C] [font-variant-numeric:tabular-nums]">
                {segments.confirmed_buyer}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-[6px] bg-[#FFF3D6] border border-[#FEE4A6]">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#8A5A00] shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-[13px] text-[#8A5A00] font-medium">Interested</span>
              <span className="text-[13px] font-semibold text-[#8A5A00] [font-variant-numeric:tabular-nums]">
                {segments.interested}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-[6px] bg-[#F1EFF8] border border-[#E2DFED]">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#5B5670] shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-[13px] text-[#5B5670] font-medium">Prospects</span>
              <span className="text-[13px] font-semibold text-[#5B5670] [font-variant-numeric:tabular-nums]">
                {segments.prospect}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day Activity Chart & Needs Attention Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Activity Timeline */}
        <div className="p-4 sm:p-6 bg-card border border-border rounded-[8px] lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px] font-semibold text-ink">
              Sign-ups and paid orders ({dateRange === '7d' ? 'Last 7 days' : 'Last 30 days'})
            </h2>
            <div className="flex items-center gap-3 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#6420AA] rounded-[2px]" />
                Sign-ups
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#12805C] rounded-[2px]" />
                Paid orders
              </span>
            </div>
          </div>

          {/* Timeline visualization */}
          {chartPoints.length > 0 ? (
            <div className="pt-4">
              <div className="flex items-end gap-1.5 h-44 border-b border-border pb-2 px-1">
                {chartPoints.map((pt, idx) => {
                  const maxH = 140;
                  const maxVal = Math.max(
                    1,
                    ...chartPoints.map((p) => Math.max(p.signups, p.orders))
                  );
                  const signupHeight = Math.max(4, (pt.signups / maxVal) * maxH);
                  const orderHeight = Math.max(4, (pt.orders / maxVal) * maxH);

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute bottom-full mb-1 z-20 bg-ink text-white text-[10px] p-1.5 rounded-[4px] whitespace-nowrap">
                        <p className="font-semibold">{pt.date}</p>
                        <p>Sign-ups: {pt.signups}</p>
                        <p>Paid orders: {pt.orders}</p>
                      </div>

                      <div className="w-full flex items-end justify-center gap-0.5">
                        {pt.signups > 0 && (
                          <div
                            style={{ height: `${signupHeight}px` }}
                            className="w-1.5 sm:w-2 bg-[#6420AA] rounded-t-[1px]"
                          />
                        )}
                        {pt.orders > 0 && (
                          <div
                            style={{ height: `${orderHeight}px` }}
                            className="w-1.5 sm:w-2 bg-[#12805C] rounded-t-[1px]"
                          />
                        )}
                        {pt.signups === 0 && pt.orders === 0 && (
                          <div className="h-1 w-1 rounded-full bg-border" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-muted pt-2 px-1">
                <span>{chartPoints[0]?.date}</span>
                <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.date}</span>
                <span>{chartPoints[chartPoints.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-border rounded-[6px]">
              <p className="text-[13px] font-medium text-ink">No timeline events recorded</p>
              <p className="text-[12px] text-muted mt-1">
                Activity will display as customers sign up and initiate payments.
              </p>
            </div>
          )}
        </div>

        {/* Needs Attention Panel */}
        <div className="p-4 sm:p-6 bg-card border border-border rounded-[8px] space-y-4">
          <h2 className="text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px] font-semibold text-ink">
            Needs attention
          </h2>
          <p className="text-[12px] leading-[16px] text-muted">
            Operational alerts and pending customer records
          </p>

          <div className="space-y-2.5 sm:space-y-3">
            <div className="p-2.5 sm:p-3 rounded-[6px] border border-border bg-canvas flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-ink">Failed payments (7d)</p>
                <p className="text-[11px] text-muted">Gateway rejects requiring outreach</p>
              </div>
              <span
                className={`text-[12px] font-semibold px-2 py-0.5 rounded-[4px] shrink-0 ${
                  attentionItems.failedPayments7d > 0
                    ? 'bg-[#FDECEA] text-[#B42318] border border-[#FECDCA]'
                    : 'bg-[#E6F4EE] text-[#12805C]'
                }`}
              >
                {attentionItems.failedPayments7d}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-[6px] border border-border bg-canvas flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-ink">Pending &gt; 24h</p>
                <p className="text-[11px] text-muted">Created checkouts without completion</p>
              </div>
              <span
                className={`text-[12px] font-semibold px-2 py-0.5 rounded-[4px] shrink-0 ${
                  attentionItems.pendingPaymentsOver24h > 0
                    ? 'bg-[#FFF3D6] text-[#8A5A00] border border-[#FEE4A6]'
                    : 'bg-[#F1EFF8] text-[#5B5670]'
                }`}
              >
                {attentionItems.pendingPaymentsOver24h}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-[6px] border border-border bg-canvas flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-ink">Paid orders to process</p>
                <p className="text-[11px] text-muted">Confirmed orders awaiting status updates</p>
              </div>
              <span className="text-[12px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#E6F4EE] text-[#12805C] shrink-0">
                {attentionItems.paidAwaitingUpdate}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-[6px] border border-border bg-canvas flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-ink">Missing phone numbers</p>
                <p className="text-[11px] text-muted">Registered accounts without phone</p>
              </div>
              <span className="text-[12px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#F1EFF8] text-[#5B5670] shrink-0">
                {attentionItems.signupsWithoutPhone}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Pre-orders Table */}
      <div className="p-4 sm:p-6 bg-card border border-border rounded-[8px] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] sm:text-[18px] leading-[24px] sm:leading-[28px] font-semibold text-ink">
              Recent pre-orders
            </h2>
            <p className="text-[12px] leading-[16px] text-muted">
              Latest 5 customer pre-orders received
            </p>
          </div>
          <Link
            href="/admin/preorders"
            className="text-[13px] font-medium text-[#6420AA] hover:underline shrink-0"
          >
            View all ({metrics.totalOrders}) →
          </Link>
        </div>

        {recentPreorders.length > 0 ? (
          <div className="overflow-x-auto border border-border rounded-[6px]">
            <table className="w-full min-w-[620px] text-left text-[13px] sm:text-[14px] leading-[20px] border-collapse">
              <thead className="bg-[#F1EFF8]/50 border-b border-border sticky top-0">
                <tr className="h-10 text-[12px] text-muted font-medium">
                  <th className="px-4">Order</th>
                  <th className="px-4">Customer</th>
                  <th className="px-4">Date</th>
                  <th className="px-4">Deposit</th>
                  <th className="px-4">Payment</th>
                  <th className="px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPreorders.map((order) => {
                  const paymentPaid = order.payment_status === 'paid';

                  return (
                    <tr
                      key={order.id}
                      className="h-12 hover:bg-canvas transition-colors"
                    >
                      <td className="px-4 font-mono text-[13px] text-ink font-medium">
                        {order.order_number}
                      </td>
                      <td className="px-4 text-ink">
                        <span className="block font-medium">
                          {order.profiles?.full_name || order.shipping_address?.fullName || 'Customer'}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {order.profiles?.email || order.shipping_address?.email || '—'}
                        </span>
                      </td>
                      <td className="px-4 text-[12px] text-muted">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 font-mono text-[13px] text-ink [font-variant-numeric:tabular-nums]">
                        {formatPrice(order.deposit_paise)}
                      </td>
                      <td className="px-4">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium ${
                            paymentPaid
                              ? 'bg-[#E6F4EE] text-[#12805C]'
                              : 'bg-[#FFF3D6] text-[#8A5A00]'
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-4">
                        <span className="text-[11px] px-2 py-0.5 rounded-[4px] bg-[#F1EFF8] text-[#5B5670] font-medium capitalize">
                          {order.order_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-border rounded-[6px] p-6 space-y-1">
            <p className="text-[14px] font-semibold text-ink">No pre-orders yet</p>
            <p className="text-[12px] text-muted">
              Orders appear after a customer pays the deposit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
