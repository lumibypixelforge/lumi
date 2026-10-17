/**
 * Payment Provider Factory
 *
 * Returns the configured payment provider based on PAYMENT_PROVIDER env var.
 * Defaults to 'mock' in development.
 */

import type { PaymentProvider } from './types';
import { MockPaymentProvider } from './mock-provider';
import { RazorpayPaymentProvider } from './razorpay-provider';

let providerInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (providerInstance) return providerInstance;

  const hasRazorpayKeys = Boolean(
    (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) &&
    process.env.RAZORPAY_KEY_SECRET
  );

  const providerType = process.env.PAYMENT_PROVIDER ?? (hasRazorpayKeys ? 'razorpay' : 'mock');

  if (providerType === 'razorpay' && hasRazorpayKeys) {
    providerInstance = new RazorpayPaymentProvider();
    console.log('[Payments] Using RazorpayPaymentProvider');
  } else {
    if (providerType === 'razorpay' && !hasRazorpayKeys) {
      console.warn(
        '[Payments] PAYMENT_PROVIDER=razorpay requested but RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Falling back to MockPaymentProvider.'
      );
    }
    providerInstance = new MockPaymentProvider();
    console.log('[Payments] Using MockPaymentProvider');
  }

  return providerInstance;
}

/** Re-export types for convenience */
export type {
  PaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  RefundParams,
  RefundResult,
  ClientCheckoutConfig,
  WebhookVerifyParams,
  WebhookEvent,
} from './types';
