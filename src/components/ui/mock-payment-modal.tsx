'use client';

import { useState } from 'react';
import { formatPrice } from '@/config/product';
import { IconClose } from './icons';

interface MockPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  gatewayOrderId: string;
  amountPaise: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  onSuccess: (paymentId: string, signature: string) => void;
  onFailure: (errorMsg: string) => void;
}

export function MockPaymentModal({
  isOpen,
  onClose,
  orderNumber,
  gatewayOrderId,
  amountPaise,
  customerName,
  customerEmail,
  onSuccess,
  onFailure,
}: MockPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState(customerEmail ? `${customerEmail.split('@')[0]}@okaxis` : 'customer@okhdfcbank');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSimulatePayment = async (status: 'success' | 'failure') => {
    setIsProcessing(true);

    // Simulate realistic gateway processing latency
    await new Promise((r) => setTimeout(r, 800));

    if (status === 'failure') {
      setIsProcessing(false);
      onFailure('Payment failed: User cancelled transaction or bank server timeout.');
      return;
    }

    // Generate simulated payment ID and signature
    // In mock mode, signature is HMAC-SHA256 of orderId|paymentId with MOCK_SECRET
    const randomHex = Math.random().toString(36).substring(2, 10);
    const mockPaymentId = `pay_mock_${Date.now()}_${randomHex}`;

    // Compute mock signature on client using Web Crypto API to match backend MOCK_SECRET
    const secret = 'mock_webhook_secret_for_testing';
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const payload = `${gatewayOrderId}|${mockPaymentId}`;
    const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const signature = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    setIsProcessing(false);
    onSuccess(mockPaymentId, signature);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div className="bg-[#121217] text-white p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs px-2 py-0.5 bg-accent/20 text-accent-light rounded font-medium">
                MOCK GATEWAY
              </span>
              <span className="text-xs text-white/60 font-mono">TEST MODE</span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-white">LUMI Pre-Order</h2>
            <p className="text-xs text-white/70 font-mono mt-0.5">
              Order {orderNumber} • {gatewayOrderId}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/60 hover:text-white transition-colors p-1"
            aria-label="Close modal"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Amount display */}
        <div className="bg-canvas border-b border-border px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-muted tracking-wide">
            Payable Deposit
          </span>
          <span className="text-xl font-bold font-mono text-ink">
            {formatPrice(amountPaise)}
          </span>
        </div>

        {/* Body content */}
        <div className="p-5">
          <p className="text-xs text-muted mb-4">
            Paying as <strong className="text-ink">{customerName}</strong> ({customerEmail})
          </p>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSelectedMethod('upi')}
              className={`p-2.5 text-xs font-medium rounded border text-center transition-colors ${
                selectedMethod === 'upi'
                  ? 'border-accent bg-accent/5 text-accent font-semibold'
                  : 'border-border bg-card text-muted hover:border-ink/20'
              }`}
            >
              UPI / QR
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('card')}
              className={`p-2.5 text-xs font-medium rounded border text-center transition-colors ${
                selectedMethod === 'card'
                  ? 'border-accent bg-accent/5 text-accent font-semibold'
                  : 'border-border bg-card text-muted hover:border-ink/20'
              }`}
            >
              Card
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('netbanking')}
              className={`p-2.5 text-xs font-medium rounded border text-center transition-colors ${
                selectedMethod === 'netbanking'
                  ? 'border-accent bg-accent/5 text-accent font-semibold'
                  : 'border-border bg-card text-muted hover:border-ink/20'
              }`}
            >
              Netbanking
            </button>
          </div>

          {/* Method Details */}
          {selectedMethod === 'upi' && (
            <div className="space-y-3 p-3 bg-canvas border border-border rounded mb-4">
              <label className="block text-xs font-medium text-ink">UPI ID (VPA)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@upi"
                className="input text-xs font-mono w-full"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUpiId('gpay@okaxis')}
                  className="px-2 py-1 text-[11px] bg-card border border-border rounded text-muted hover:text-ink"
                >
                  GPay
                </button>
                <button
                  type="button"
                  onClick={() => setUpiId('phonepe@ybl')}
                  className="px-2 py-1 text-[11px] bg-card border border-border rounded text-muted hover:text-ink"
                >
                  PhonePe
                </button>
                <button
                  type="button"
                  onClick={() => setUpiId('paytm@paytm')}
                  className="px-2 py-1 text-[11px] bg-card border border-border rounded text-muted hover:text-ink"
                >
                  Paytm
                </button>
              </div>
            </div>
          )}

          {selectedMethod === 'card' && (
            <div className="space-y-2 p-3 bg-canvas border border-border rounded mb-4 text-xs">
              <div className="flex items-center justify-between text-muted">
                <span>Card Number</span>
                <span className="font-mono">4000 1234 5678 9010</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Expiry / CVV</span>
                <span className="font-mono">12/28 • 888</span>
              </div>
              <p className="text-[11px] text-muted pt-1">Simulated test card pre-configured.</p>
            </div>
          )}

          {selectedMethod === 'netbanking' && (
            <div className="p-3 bg-canvas border border-border rounded mb-4 text-xs space-y-2">
              <span className="text-muted block">Select Bank:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 border border-accent bg-accent/5 rounded font-medium text-ink">
                  HDFC Bank (Instant)
                </div>
                <div className="p-2 border border-border rounded text-muted">
                  ICICI Bank
                </div>
                <div className="p-2 border border-border rounded text-muted">
                  State Bank of India
                </div>
                <div className="p-2 border border-border rounded text-muted">
                  Axis Bank
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSimulatePayment('success')}
              className="btn btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <span>Pay {formatPrice(amountPaise)} (Simulate Success)</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSimulatePayment('failure')}
              className="btn btn-secondary w-full py-2 text-xs text-negative hover:bg-negative/5 hover:border-negative/30"
            >
              Simulate Failed Payment (Test Error Handling)
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-canvas border-t border-border flex items-center justify-between text-[11px] text-muted">
          <span>100% Refundable Deposit</span>
          <span className="font-mono">256-bit SSL Encrypted</span>
        </div>
      </div>
    </div>
  );
}
