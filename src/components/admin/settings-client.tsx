'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatPrice } from '@/config/product';
import { ReauthModal } from '@/components/admin/reauth-modal';

interface SettingsState {
  productPriceINR: number;
  depositINR: number;
  quantityCap: number;
  preordersOpen: boolean;

  // Requirements checklist
  pricingApproved: boolean;
  pricingApprovedBy?: string | null;
  pricingApprovedAt?: string | null;

  shippingEstimate: string;
  shippingApproved: boolean;

  refundPolicySummary: string;
  refundPolicyLink: string;
  refundPolicyApproved: boolean;

  warrantyText: string;
  warrantyApproved: boolean;

  termsPrivacyPublished: boolean;
}

const DEFAULT_STATE: SettingsState = {
  productPriceINR: 49999,
  depositINR: 4999,
  quantityCap: 3,
  preordersOpen: false,

  pricingApproved: false,
  pricingApprovedBy: null,
  pricingApprovedAt: null,

  shippingEstimate: 'Q3 2026',
  shippingApproved: false,

  refundPolicySummary: '100% refundable prior to dispatch confirmation',
  refundPolicyLink: '/refund-policy',
  refundPolicyApproved: false,

  warrantyText: '1-year limited hardware manufacturer warranty',
  warrantyApproved: false,

  termsPrivacyPublished: true,
};

export function SettingsClientPage() {
  const [initialState, setInitialState] = useState<SettingsState>(DEFAULT_STATE);
  const [formState, setFormState] = useState<SettingsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Confirm Diff Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};

          const loaded: SettingsState = {
            productPriceINR: s.product_price_paise
              ? Number(s.product_price_paise) / 100
              : DEFAULT_STATE.productPriceINR,
            depositINR: s.deposit_paise
              ? Number(s.deposit_paise) / 100
              : DEFAULT_STATE.depositINR,
            quantityCap: s.quantity_cap ? Number(s.quantity_cap) : DEFAULT_STATE.quantityCap,
            preordersOpen: typeof s.preorders_open === 'boolean' ? s.preorders_open : false,

            pricingApproved: Boolean(s.pricing_approval?.approved),
            pricingApprovedBy: s.pricing_approval?.by || null,
            pricingApprovedAt: s.pricing_approval?.at || null,

            shippingEstimate: s.shipping_estimate || DEFAULT_STATE.shippingEstimate,
            shippingApproved: Boolean(s.shipping_approval?.approved),

            refundPolicySummary:
              s.refund_policy_approval?.summary || DEFAULT_STATE.refundPolicySummary,
            refundPolicyLink:
              s.refund_policy_approval?.link || DEFAULT_STATE.refundPolicyLink,
            refundPolicyApproved: Boolean(s.refund_policy_approval?.approved),

            warrantyText: s.warranty_approval?.text || DEFAULT_STATE.warrantyText,
            warrantyApproved: Boolean(s.warranty_approval?.approved),

            termsPrivacyPublished:
              typeof s.terms_privacy_published?.published === 'boolean'
                ? s.terms_privacy_published.published
                : true,
          };

          setInitialState(loaded);
          setFormState(loaded);
        }
      } catch {
        // Fallback to defaults
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const checklist = useMemo(() => {
    return [
      {
        id: 'pricing',
        label: 'Pricing approved by client',
        approved: formState.pricingApproved,
      },
      {
        id: 'shipping',
        label: 'Shipping estimate approved',
        approved: formState.shippingApproved,
      },
      {
        id: 'refund',
        label: 'Refund policy approved',
        approved: formState.refundPolicyApproved,
      },
      {
        id: 'warranty',
        label: 'Warranty terms approved',
        approved: formState.warrantyApproved,
      },
      {
        id: 'terms_privacy',
        label: 'Terms and privacy pages published',
        approved: formState.termsPrivacyPublished,
      },
    ];
  }, [formState]);

  const allRequirementsMet = checklist.every((item) => item.approved);

  const changedFields = useMemo(() => {
    const changes: Array<{ label: string; from: string; to: string }> = [];

    if (formState.productPriceINR !== initialState.productPriceINR) {
      changes.push({
        label: 'Full Price',
        from: `₹${initialState.productPriceINR.toLocaleString('en-IN')}`,
        to: `₹${formState.productPriceINR.toLocaleString('en-IN')}`,
      });
    }

    if (formState.depositINR !== initialState.depositINR) {
      changes.push({
        label: 'Deposit',
        from: `₹${initialState.depositINR.toLocaleString('en-IN')}`,
        to: `₹${formState.depositINR.toLocaleString('en-IN')}`,
      });
    }

    if (formState.quantityCap !== initialState.quantityCap) {
      changes.push({
        label: 'Quantity Cap',
        from: String(initialState.quantityCap),
        to: String(formState.quantityCap),
      });
    }

    if (formState.preordersOpen !== initialState.preordersOpen) {
      changes.push({
        label: 'Accept Pre-orders',
        from: initialState.preordersOpen ? 'Enabled (Open)' : 'Disabled (Off)',
        to: formState.preordersOpen ? 'Enabled (Open)' : 'Disabled (Off)',
      });
    }

    if (formState.pricingApproved !== initialState.pricingApproved) {
      changes.push({
        label: 'Pricing Approval',
        from: initialState.pricingApproved ? 'Approved' : 'Unapproved',
        to: formState.pricingApproved ? 'Approved' : 'Unapproved',
      });
    }

    if (formState.shippingEstimate !== initialState.shippingEstimate) {
      changes.push({
        label: 'Shipping Estimate',
        from: initialState.shippingEstimate,
        to: formState.shippingEstimate,
      });
    }

    if (formState.shippingApproved !== initialState.shippingApproved) {
      changes.push({
        label: 'Shipping Approval',
        from: initialState.shippingApproved ? 'Approved' : 'Unapproved',
        to: formState.shippingApproved ? 'Approved' : 'Unapproved',
      });
    }

    if (formState.refundPolicyApproved !== initialState.refundPolicyApproved) {
      changes.push({
        label: 'Refund Policy Approval',
        from: initialState.refundPolicyApproved ? 'Approved' : 'Unapproved',
        to: formState.refundPolicyApproved ? 'Approved' : 'Unapproved',
      });
    }

    if (formState.warrantyApproved !== initialState.warrantyApproved) {
      changes.push({
        label: 'Warranty Terms Approval',
        from: initialState.warrantyApproved ? 'Approved' : 'Unapproved',
        to: formState.warrantyApproved ? 'Approved' : 'Unapproved',
      });
    }

    return changes;
  }, [formState, initialState]);

  const hasUnsavedChanges = changedFields.length > 0;
  const balanceINR = Math.max(0, formState.productPriceINR - formState.depositINR);
  const invalidPreorderState = formState.preordersOpen && !allRequirementsMet;

  const handleSaveConfirmed = async () => {
    setSaving(true);
    setModalError(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productPricePaise: Math.round(formState.productPriceINR * 100),
          depositPaise: Math.round(formState.depositINR * 100),
          quantityCap: Number(formState.quantityCap),
          preordersOpen: formState.preordersOpen,

          pricingApproved: formState.pricingApproved,
          shippingApproved: formState.shippingApproved,
          shippingEstimate: formState.shippingEstimate.trim(),

          refundPolicyApproved: formState.refundPolicyApproved,
          refundPolicySummary: formState.refundPolicySummary.trim(),
          refundPolicyLink: formState.refundPolicyLink.trim(),

          warrantyApproved: formState.warrantyApproved,
          warrantyText: formState.warrantyText.trim(),

          termsPrivacyPublished: formState.termsPrivacyPublished,
        }),
      });

      const data = await res.json();

      if (res.status === 403 && data.requireReauth) {
        setShowConfirmModal(false);
        setShowReauthModal(true);
        setSaving(false);
        return;
      }

      if (!res.ok) {
        setModalError(data.error || 'Failed to apply configuration settings.');
        setSaving(false);
        return;
      }

      setInitialState(formState);
      setShowConfirmModal(false);
      setSaveSuccessMsg('Store settings successfully updated and applied.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch {
      setModalError('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-muted space-y-2">
        <div className="w-5 h-5 border-2 border-[#6420AA] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading store configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <nav className="text-[12px] text-muted mb-1" aria-label="Breadcrumb">
          <span>Admin</span> / <span className="text-ink">Store settings</span>
        </nav>
        <h1 className="text-[28px] leading-[36px] font-semibold text-ink tracking-tight font-display">
          Store settings
        </h1>
        <p className="text-[12px] text-muted mt-0.5">
          Commercial terms, availability switches, customer pricing, and legal approval checklists.
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-[#E6F4EE] border border-[#A6E1CA] rounded-[6px] text-xs text-[#12805C] font-medium flex items-center justify-between">
          <span>{saveSuccessMsg}</span>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-[11px] underline">
            Dismiss
          </button>
        </div>
      )}

      {invalidPreorderState && (
        <div className="p-4 bg-[#FDECEA] border border-[#FECDCA] rounded-[8px] space-y-1 text-xs text-[#B42318]">
          <p className="font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#B42318] inline-block" />
            Requirement Violation Detected
          </p>
          <p className="leading-relaxed">
            Pre-orders cannot remain active while one or more checklist items are unapproved. The public pre-order flow will be automatically blocked until all 5 items are confirmed.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Form Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Pre-orders Acceptance */}
          <div className="p-6 bg-card border border-border rounded-[8px] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h2 className="text-[18px] leading-[28px] font-semibold text-ink">
                  Accept pre-orders
                </h2>
                <p className="text-[12px] text-muted">
                  Controls whether customers can place pre-orders on the public checkout.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formState.preordersOpen}
                  disabled={!allRequirementsMet && !formState.preordersOpen}
                  onClick={() => {
                    if (!allRequirementsMet && !formState.preordersOpen) return;
                    setFormState((prev) => ({
                      ...prev,
                      preordersOpen: !prev.preordersOpen,
                    }));
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                    formState.preordersOpen ? 'bg-[#12805C]' : 'bg-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formState.preordersOpen ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-[13px] font-medium text-ink w-14">
                  {formState.preordersOpen ? 'Open' : 'Off'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[13px] font-medium text-ink">
                Pre-order launch requirements checklist
              </h3>
              <p className="text-[12px] text-muted">
                Every item below must be approved by the client before pre-orders can be accepted.
              </p>

              <div className="space-y-2 pt-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-canvas border border-border rounded-[6px] text-xs"
                  >
                    <span className="text-ink">{item.label}</span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-[4px] font-medium ${
                        item.approved
                          ? 'bg-[#E6F4EE] text-[#12805C]'
                          : 'bg-[#FFF3D6] text-[#8A5A00]'
                      }`}
                    >
                      {item.approved ? 'Approved' : 'Pending approval'}
                    </span>
                  </div>
                ))}
              </div>

              {!allRequirementsMet && (
                <p className="text-[11px] text-[#8A5A00] pt-1">
                  The pre-orders switch is disabled until all 5 requirements are confirmed.
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Pricing */}
          <div className="p-6 bg-card border border-border rounded-[8px] space-y-5">
            <div>
              <h2 className="text-[18px] leading-[28px] font-semibold text-ink">
                Pricing configuration
              </h2>
              <p className="text-[12px] text-muted">
                Governs the full device price, deposit due today, and per-customer quantity limit.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-ink mb-1">
                  Full product price (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={formState.productPriceINR}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      productPriceINR: Math.max(1, Math.round(Number(e.target.value))),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm bg-canvas border border-border rounded-[6px] text-ink font-mono focus:outline-none focus:border-[#6420AA]"
                />
                <p className="text-[11px] text-muted mt-1">Whole rupees only</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-ink mb-1">
                  Deposit amount (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={formState.productPriceINR}
                  value={formState.depositINR}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      depositINR: Math.max(1, Math.round(Number(e.target.value))),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm bg-canvas border border-border rounded-[6px] text-ink font-mono focus:outline-none focus:border-[#6420AA]"
                />
                <p className="text-[11px] text-muted mt-1">Deposit cannot exceed price</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-ink mb-1">
                  Balance due at dispatch (calculated)
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`₹${balanceINR.toLocaleString('en-IN')}`}
                  className="w-full px-3 py-2 text-sm bg-[#F1EFF8]/50 border border-border rounded-[6px] text-muted font-mono"
                />
                <p className="text-[11px] text-muted mt-1">Price minus deposit</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-ink mb-1">
                  Quantity cap per order
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formState.quantityCap}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      quantityCap: Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm bg-canvas border border-border rounded-[6px] text-ink font-mono focus:outline-none focus:border-[#6420AA]"
                />
                <p className="text-[11px] text-muted mt-1">Limits bulk preorders (1–10 units)</p>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formState.pricingApproved}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      pricingApproved: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded-[4px] border-border text-[#6420AA] focus:ring-[#6420AA]"
                />
                <div>
                  <span className="text-[13px] font-medium text-ink">
                    Approved by client (commercial launch terms confirmed)
                  </span>
                  <p className="text-[11px] text-muted mt-0.5">
                    Records administrator&apos;s confirmation of official retail price and deposit terms.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Card 3: Delivery and Policies */}
          <div className="p-6 bg-card border border-border rounded-[8px] space-y-5">
            <div>
              <h2 className="text-[18px] leading-[28px] font-semibold text-ink">
                Delivery and policies
              </h2>
              <p className="text-[12px] text-muted">
                Shipping windows, cancellation summaries, and hardware warranty statements.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-ink">
                Estimated shipping window text
              </label>
              <input
                type="text"
                value={formState.shippingEstimate}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    shippingEstimate: e.target.value,
                  }))
                }
                placeholder="e.g. Q3 2026"
                className="w-full px-3 py-2 text-sm bg-canvas border border-border rounded-[6px] text-ink focus:outline-none focus:border-[#6420AA]"
              />
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={formState.shippingApproved}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      shippingApproved: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded-[4px] border-border text-[#6420AA]"
                />
                <span className="text-[12px] text-ink">
                  Shipping estimate confirmed with manufacturing partners
                </span>
              </label>
            </div>

            <div className="space-y-2 pt-3 border-t border-border">
              <label className="block text-[13px] font-medium text-ink">
                Refund policy summary text
              </label>
              <input
                type="text"
                value={formState.refundPolicySummary}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    refundPolicySummary: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm bg-canvas border border-border rounded-[6px] text-ink focus:outline-none focus:border-[#6420AA]"
              />
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formState.refundPolicyApproved}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        refundPolicyApproved: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded-[4px] border-border text-[#6420AA]"
                  />
                  <span className="text-[12px] text-ink">
                    Refund terms approved by legal counsel
                  </span>
                </label>
                <a
                  href="/refund-policy"
                  target="_blank"
                  className="text-[11px] text-[#6420AA] hover:underline"
                >
                  View live policy →
                </a>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-border">
              <label className="block text-[13px] font-medium text-ink">
                Warranty statement
              </label>
              <input
                type="text"
                value={formState.warrantyText}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    warrantyText: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm bg-canvas border border-border rounded-[6px] text-ink focus:outline-none focus:border-[#6420AA]"
              />
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={formState.warrantyApproved}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      warrantyApproved: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded-[4px] border-border text-[#6420AA]"
                />
                <span className="text-[12px] text-ink">
                  Hardware warranty statement approved
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Order Summary Preview */}
        <div className="space-y-4 lg:sticky lg:top-8">
          <div>
            <h3 className="text-[14px] font-semibold text-ink">
              Live Checkout Preview
            </h3>
            <p className="text-[11px] text-muted">
              Real-time rendering of customer order summary card at current settings
            </p>
          </div>

          <div className="p-5 bg-card border border-border rounded-[8px] space-y-4 shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-[13px] font-semibold text-ink">LUMI Robot</span>
              <span className="text-[11px] font-mono text-muted">Qty: 1</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Total retail price</span>
                <span className="font-mono font-medium text-ink [font-variant-numeric:tabular-nums]">
                  {formatPrice(Math.round(formState.productPriceINR * 100))}
                </span>
              </div>

              <div className="flex items-center justify-between text-ink font-semibold">
                <span>Due today (Deposit)</span>
                <span className="font-mono text-[#6420AA] [font-variant-numeric:tabular-nums]">
                  {formatPrice(Math.round(formState.depositINR * 100))}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted text-[11px]">
                <span>Balance at dispatch</span>
                <span className="font-mono [font-variant-numeric:tabular-nums]">
                  {formatPrice(Math.round(balanceINR * 100))}
                </span>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted">
                <span>Estimated dispatch</span>
                <span>{formState.shippingEstimate}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Max allowed units</span>
                <span className="font-mono">{formState.quantityCap} per customer</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <div
                className={`p-2.5 rounded-[6px] text-[11px] text-center font-medium ${
                  formState.preordersOpen
                    ? 'bg-[#E6F4EE] text-[#12805C]'
                    : 'bg-[#FFF3D6] text-[#8A5A00]'
                }`}
              >
                {formState.preordersOpen
                  ? 'Pre-orders are LIVE on public website'
                  : 'Pre-orders currently DISABLED on public website'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Unsaved Changes Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg p-4">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8A5A00] animate-pulse" />
              <span className="text-xs font-medium text-ink">
                You have {changedFields.length} unsaved parameter change{changedFields.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormState(initialState)}
                disabled={saving}
                className="px-3 py-1.5 text-xs text-muted hover:text-ink font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={saving}
                className="px-4 py-1.5 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[6px] transition-colors"
              >
                Review & Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Diff Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card border border-border rounded-[8px] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-[18px] leading-[28px] font-semibold text-ink">
                Confirm Settings Modification
              </h3>
              <p className="text-[12px] text-muted mt-1">
                The following changes will be applied and written to the immutable audit trail with your admin credentials.
              </p>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-[6px] bg-[#FDECEA] border border-[#FECDCA] text-xs text-[#B42318]">
                {modalError}
              </div>
            )}

            <div className="border border-border rounded-[6px] overflow-hidden bg-canvas">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F1EFF8]/50 border-b border-border">
                  <tr className="h-8 text-[11px] text-muted font-medium">
                    <th className="px-3">Field</th>
                    <th className="px-3">Current</th>
                    <th className="px-3">New value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {changedFields.map((field) => (
                    <tr key={field.label} className="h-8">
                      <td className="px-3 font-medium text-ink">{field.label}</td>
                      <td className="px-3 text-muted">{field.from}</td>
                      <td className="px-3 text-[#12805C] font-semibold">{field.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-medium text-muted hover:text-ink transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveConfirmed}
                disabled={saving}
                className="px-4 py-2 bg-[#6420AA] hover:bg-[#52198D] text-white text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50"
              >
                {saving ? 'Applying...' : 'Confirm and apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reauth Modal when saving */}
      <ReauthModal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        onSuccess={handleSaveConfirmed}
        actionTitle="Authorize store settings change"
      />
    </div>
  );
}
