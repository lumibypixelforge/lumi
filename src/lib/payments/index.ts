/**
 * Payment Provider Factory
 *
 * Returns the configured payment provider based on PAYMENT_PROVIDER env var.
 * Defaults to 'mock' in development.
 */

import type { PaymentProvider } from './types';
import { MockPaymentProvider } from './mock-provider';

let providerInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (providerInstance) return providerInstance;

  const providerType = process.env.PAYMENT_PROVIDER ?? 'mock';

  switch (providerType) {
    case 'mock':
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: Mock payment provider is prohibited and cannot be enabled in production.');
      }
      providerInstance = new MockPaymentProvider();
      console.log('[Payments] Using MockPaymentProvider');
      break;

    case 'razorpay':
      // TODO: Import and instantiate RazorpayPaymentProvider when account is ready
      // const { RazorpayPaymentProvider } = require('./razorpay-provider');
      // providerInstance = new RazorpayPaymentProvider();
      throw new Error(
        'Razorpay provider not yet implemented. Set PAYMENT_PROVIDER=mock for development.'
      );

    default:
      throw new Error(`Unknown payment provider: ${providerType}`);
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
