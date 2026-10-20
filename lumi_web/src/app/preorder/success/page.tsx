'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/config/product';
import { IconCheck, IconArrowRight, IconShield, IconTruck } from '@/components/ui/icons';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order_number') || 'LUMI-CONFIRMED';
  const orderId = searchParams.get('order_id');

  const [orderDetails, setOrderDetails] = useState<{
    orderNumber: string;
    depositPaise: number;
    quantity: number;
    shippingCity?: string;
  }>({
    orderNumber: orderNumber,
    depositPaise: 499900,
    quantity: 1,
  });

  return (
    <div className="max-w-2xl mx-auto bg-card border border-border rounded-lg p-8 md:p-10 shadow-sm text-center">
      {/* Success Badge */}
      <div className="w-16 h-16 bg-positive/10 border border-positive/30 rounded-full flex items-center justify-center mx-auto mb-6 text-positive">
        <IconCheck size={32} />
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="font-mono text-xs px-2.5 py-1 bg-accent/10 text-accent font-semibold rounded">
          DEPOSIT CONFIRMED
        </span>
      </div>

      <h1 className="text-3xl font-bold text-ink tracking-tight mb-2">
        You're in Batch 01!
      </h1>
      <p className="text-muted text-sm max-w-md mx-auto mb-8">
        Your reservation has been confirmed and locked into the production queue.
      </p>

      {/* Order Details Card */}
      <div className="bg-canvas border border-border rounded-lg p-5 mb-8 text-left space-y-3 font-mono text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <span className="text-muted uppercase">Reservation Number</span>
          <span className="font-bold text-ink text-sm">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <span className="text-muted uppercase">Deposit Paid</span>
          <span className="text-positive font-semibold">
            {formatPrice(orderDetails.depositPaise)} (PAID)
          </span>
        </div>
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <span className="text-muted uppercase">Estimated Shipping</span>
          <span className="text-ink">Q3 2026</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted uppercase">Cancellation / Refund</span>
          <span className="text-accent">100% Refundable</span>
        </div>
      </div>

      {/* What happens next */}
      <div className="text-left mb-8 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">
          What happens next?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted">
          <div className="p-3 bg-canvas border border-border rounded">
            <strong className="text-ink block mb-1">1. Confirmation Email</strong>
            A receipt and reservation summary have been sent to your registered email address.
          </div>
          <div className="p-3 bg-canvas border border-border rounded">
            <strong className="text-ink block mb-1">2. Production Updates</strong>
            You will receive quarterly firmware and build milestone updates directly from our engineering team.
          </div>
          <div className="p-3 bg-canvas border border-border rounded">
            <strong className="text-ink block mb-1">3. Address Verification</strong>
            Before dispatch, we will verify your shipping address and collect the remaining balance.
          </div>
          <div className="p-3 bg-canvas border border-border rounded">
            <strong className="text-ink block mb-1">4. Priority Dispatch</strong>
            Your unit will be hand-tested, packaged, and dispatched with insured express courier.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href="/" className="btn btn-secondary w-full sm:w-auto px-6 py-2.5 text-xs no-underline">
          Return to LUMI Home
        </Link>
        <Link href="/account" className="btn btn-primary w-full sm:w-auto px-6 py-2.5 text-xs no-underline inline-flex items-center justify-center gap-1.5">
          <span>Manage in My Account</span>
          <IconArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function PreorderSuccessPage() {
  return (
    <main className="min-h-screen pt-32 pb-20 bg-canvas">
      <div className="container-lg">
        <Suspense
          fallback={
            <div className="max-w-md mx-auto text-center p-12">
              <span className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs font-mono text-muted">Loading reservation confirmation...</p>
            </div>
          }
        >
          <SuccessContent />
        </Suspense>
      </div>
    </main>
  );
}
