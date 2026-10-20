/**
 * Payment Provider Factory
 *
 * Returns the configured payment provider based on PAYMENT_PROVIDER env var.
 * Defaults to 'mock' in development.
 */

import type { PaymentProvider } from './types';
import { MockPaymentProvider } from './mock-provider';
import { RazorpayPaymentProvider } from './razorpay-provider';

const DEFAULT_KEY_ID = 'rzp_test_TpEoYpdbbRRa1o';
const DEFAULT_KEY_SECRET = 'WMaznXituA1t2QgW4BPYnCg2';

let providerInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (providerInstance) return providerInstance;

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || DEFAULT_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || DEFAULT_KEY_SECRET;

  const hasRazorpayKeys = Boolean(keyId && keySecret);
  const providerType = process.env.PAYMENT_PROVIDER ?? (hasRazorpayKeys ? 'razorpay' : 'mock');

  if (providerType === 'razorpay' && hasRazorpayKeys) {
    providerInstance = new RazorpayPaymentProvider(keyId, keySecret);
    console.log('[Payments] Using RazorpayPaymentProvider with Key:', keyId);
  } else {
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
