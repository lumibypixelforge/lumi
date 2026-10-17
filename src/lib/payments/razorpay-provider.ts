/**
 * Razorpay Payment Provider
 *
 * Official Razorpay integration for orders, verification, refunds, and webhooks.
 * Uses Razorpay SDK for server-side operations and HMAC-SHA256 for signature verification.
 */

import Razorpay from 'razorpay';
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

export class RazorpayPaymentProvider implements PaymentProvider {
  private instance: Razorpay;
  private keyId: string;
  private keySecret: string;
  private webhookSecret?: string;

  constructor(keyId?: string, keySecret?: string, webhookSecret?: string) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!this.keyId || !this.keySecret) {
      console.warn('[Razorpay] Initialized without full credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    this.instance = new Razorpay({
      key_id: this.keyId || 'dummy_key',
      key_secret: this.keySecret || 'dummy_secret',
    });
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const orderOptions = {
      amount: params.amountPaise,
      currency: params.currency || 'INR',
      receipt: params.orderNumber || params.preorderId,
      notes: {
        preorderId: params.preorderId,
        orderNumber: params.orderNumber,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
      },
    };

    const order = await this.instance.orders.create(orderOptions);

    return {
      gatewayOrderId: order.id,
      amountPaise: Number(order.amount),
      currency: order.currency,
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const { gatewayOrderId, gatewayPaymentId, signature, expectedAmountPaise, expectedCurrency } = params;

    // 1. Verify HMAC SHA256 signature
    const body = `${gatewayOrderId}|${gatewayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return {
        verified: false,
        status: 'failed',
        error: 'Signature verification failed',
      };
    }

    // 2. Fetch payment details from Razorpay to verify amount and status
    try {
      const payment = await this.instance.payments.fetch(gatewayPaymentId);

      if (Number(payment.amount) !== expectedAmountPaise) {
        return {
          verified: false,
          status: 'failed',
          error: `Amount mismatch: expected ${expectedAmountPaise}, received ${payment.amount}`,
        };
      }

      if (payment.currency !== expectedCurrency) {
        return {
          verified: false,
          status: 'failed',
          error: `Currency mismatch: expected ${expectedCurrency}, received ${payment.currency}`,
        };
      }

      const isCaptured = payment.status === 'captured';

      return {
        verified: isCaptured || payment.status === 'authorized',
        status: isCaptured ? 'captured' : payment.status === 'refunded' ? 'refunded' : 'pending',
        method: payment.method as string,
        amountPaise: Number(payment.amount),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch payment details from Razorpay';
      return {
        verified: false,
        status: 'failed',
        error: errorMsg,
      };
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const refundResponse = await this.instance.payments.refund(params.gatewayPaymentId, {
        amount: params.amountPaise,
        notes: {
          reason: params.reason || 'Customer requested refund',
        },
      });

      return {
        success: true,
        refundId: refundResponse.id,
        status: refundResponse.status === 'processed' ? 'processed' : 'pending',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Refund initiation failed';
      return {
        success: false,
        status: 'failed',
        error: errorMsg,
      };
    }
  }

  getClientCheckoutConfig(
    gatewayOrderId: string,
    amountPaise: number,
    currency: string,
    orderNumber: string,
    prefill: { name: string; email: string; phone?: string }
  ): ClientCheckoutConfig {
    return {
      publicKeyId: this.keyId,
      gatewayOrderId,
      amountPaise,
      currency,
      orderNumber,
      prefill,
    };
  }

  verifyWebhook(params: WebhookVerifyParams): WebhookEvent | null {
    if (!this.webhookSecret) {
      console.warn('[Razorpay Webhook] No RAZORPAY_WEBHOOK_SECRET configured');
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(params.rawBody)
      .digest('hex');

    if (expectedSignature !== params.signature) {
      console.error('[Razorpay Webhook] Signature mismatch');
      return null;
    }

    try {
      const payload = JSON.parse(params.rawBody);
      const eventType = payload.event;
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;

      return {
        eventId: payload.id || `evt_${Date.now()}`,
        type: eventType,
        payload,
        gatewayPaymentId: paymentEntity?.id,
        gatewayOrderId: paymentEntity?.order_id || orderEntity?.id,
        amountPaise: paymentEntity?.amount || orderEntity?.amount,
      };
    } catch (err) {
      console.error('[Razorpay Webhook] Failed to parse payload:', err);
      return null;
    }
  }
}
