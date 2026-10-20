/**
 * Mock Payment Provider
 *
 * Simulates Razorpay behavior for development and testing.
 * Generates deterministic IDs, simulates verification delays,
 * and provides a fake checkout flow.
 *
 * Set PAYMENT_PROVIDER=mock in .env.local to use this.
 */

import crypto from 'crypto';
import type {
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

// In-memory store for mock orders (resets on server restart)
const mockOrders = new Map<
  string,
  {
    amountPaise: number;
    currency: string;
    preorderId: string;
    status: string;
  }
>();

const mockPayments = new Map<
  string,
  {
    orderId: string;
    amountPaise: number;
    status: string;
    method: string;
  }
>();

function generateMockId(prefix: string): string {
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}_mock_${random}`;
}

/**
 * Generate a valid mock signature for testing.
 * Uses the same HMAC-SHA256 approach as Razorpay but with a known test secret.
 */
const MOCK_SECRET = 'mock_webhook_secret_for_testing';
const MOCK_PUBLIC_KEY = 'rzp_mock_key_000000000000';

function generateMockSignature(
  orderId: string,
  paymentId: string
): string {
  const payload = `${orderId}|${paymentId}`;
  return crypto
    .createHmac('sha256', MOCK_SECRET)
    .update(payload)
    .digest('hex');
}

export class MockPaymentProvider implements PaymentProvider {
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const gatewayOrderId = generateMockId('order');

    mockOrders.set(gatewayOrderId, {
      amountPaise: params.amountPaise,
      currency: params.currency,
      preorderId: params.preorderId,
      status: 'created',
    });

    console.log(
      `[MockPayment] Order created: ${gatewayOrderId} for ${params.amountPaise} paise`
    );

    return {
      gatewayOrderId,
      amountPaise: params.amountPaise,
      currency: params.currency,
    };
  }

  async verifyPayment(
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const order = mockOrders.get(params.gatewayOrderId);

    // Check order exists
    if (!order) {
      return {
        verified: false,
        status: 'failed',
        error: 'Order not found',
      };
    }

    // Check amount matches
    if (order.amountPaise !== params.expectedAmountPaise) {
      console.warn(
        `[MockPayment] Amount mismatch: expected ${params.expectedAmountPaise}, got ${order.amountPaise}`
      );
      return {
        verified: false,
        status: 'failed',
        error: 'Amount mismatch: the payment amount does not match our records',
      };
    }

    // Check currency matches
    if (order.currency !== params.expectedCurrency) {
      return {
        verified: false,
        status: 'failed',
        error: 'Currency mismatch',
      };
    }

    // Verify signature (constant-time comparison)
    const expectedSignature = generateMockSignature(
      params.gatewayOrderId,
      params.gatewayPaymentId
    );

    const sigBuf = Buffer.from(params.signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');

    const signatureValid =
      sigBuf.length === expBuf.length &&
      crypto.timingSafeEqual(sigBuf, expBuf);

    if (!signatureValid) {
      return {
        verified: false,
        status: 'failed',
        error: 'Signature verification failed',
      };
    }

    // Mark as captured
    order.status = 'captured';
    mockOrders.set(params.gatewayOrderId, order);

    mockPayments.set(params.gatewayPaymentId, {
      orderId: params.gatewayOrderId,
      amountPaise: order.amountPaise,
      status: 'captured',
      method: 'mock_upi',
    });

    console.log(
      `[MockPayment] Payment verified: ${params.gatewayPaymentId}`
    );

    return {
      verified: true,
      status: 'captured',
      method: 'mock_upi',
      amountPaise: order.amountPaise,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const payment = mockPayments.get(params.gatewayPaymentId);

    if (!payment) {
      return {
        success: false,
        status: 'failed',
        error: 'Payment not found',
      };
    }

    if (params.amountPaise > payment.amountPaise) {
      return {
        success: false,
        status: 'failed',
        error: 'Refund amount exceeds payment amount',
      };
    }

    const refundId = generateMockId('rfnd');

    console.log(
      `[MockPayment] Refund processed: ${refundId} for ${params.amountPaise} paise`
    );

    return {
      success: true,
      refundId,
      status: 'processed',
    };
  }

  getClientCheckoutConfig(
    gatewayOrderId: string,
    amountPaise: number,
    currency: string,
    orderNumber: string,
    prefill: { name: string; email: string; phone?: string }
  ): ClientCheckoutConfig {
    return {
      publicKeyId: MOCK_PUBLIC_KEY,
      gatewayOrderId,
      amountPaise,
      currency,
      orderNumber,
      prefill,
    };
  }

  verifyWebhook(params: WebhookVerifyParams): WebhookEvent | null {
    // Verify the webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', MOCK_SECRET)
      .update(params.rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(params.signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');

    const signatureValid =
      sigBuf.length === expBuf.length &&
      crypto.timingSafeEqual(sigBuf, expBuf);

    if (!signatureValid) {
      console.warn('[MockPayment] Webhook signature verification failed');
      return null;
    }

    try {
      const body = JSON.parse(params.rawBody);
      return {
        eventId: body.event_id ?? generateMockId('evt'),
        type: body.event ?? 'payment.captured',
        payload: body,
        gatewayPaymentId: body.payment_id,
        gatewayOrderId: body.order_id,
        amountPaise: body.amount_paise,
      };
    } catch {
      console.error('[MockPayment] Failed to parse webhook body');
      return null;
    }
  }
}

/**
 * Helper to generate mock checkout data for the client-side mock flow.
 * This simulates what happens when a user completes payment in the mock checkout modal.
 */
export function generateMockCheckoutResult(gatewayOrderId: string): {
  gatewayPaymentId: string;
  signature: string;
} {
  const gatewayPaymentId = generateMockId('pay');
  const signature = generateMockSignature(gatewayOrderId, gatewayPaymentId);

  return {
    gatewayPaymentId,
    signature,
  };
}

export { MOCK_SECRET, MOCK_PUBLIC_KEY };
