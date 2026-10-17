/**
 * PaymentProvider Interface
 *
 * Abstract interface for payment gateways. Razorpay is the primary implementation.
 * A MockPaymentProvider is available for development and testing.
 *
 * The server ALWAYS controls the amount. The client never decides what to charge.
 */

export interface CreateOrderParams {
  /** Amount in paise (smallest currency unit) */
  amountPaise: number;
  /** Currency code (e.g. 'INR') */
  currency: string;
  /** Internal pre-order ID for reference */
  preorderId: string;
  /** Human-readable order number (e.g. LUMI-000001) */
  orderNumber: string;
  /** Customer email */
  customerEmail: string;
  /** Customer name */
  customerName: string;
  /** Customer phone */
  customerPhone?: string;
}

export interface CreateOrderResult {
  /** Gateway's order ID (e.g. order_xxxxx for Razorpay) */
  gatewayOrderId: string;
  /** Amount in paise that the gateway accepted */
  amountPaise: number;
  /** Currency */
  currency: string;
}

export interface VerifyPaymentParams {
  /** Gateway order ID returned from createOrder */
  gatewayOrderId: string;
  /** Payment ID returned by the client checkout */
  gatewayPaymentId: string;
  /** Signature returned by the client checkout */
  signature: string;
  /** Expected amount in paise (from our database, not from client) */
  expectedAmountPaise: number;
  /** Expected currency */
  expectedCurrency: string;
}

export interface VerifyPaymentResult {
  /** Whether the payment was verified successfully */
  verified: boolean;
  /** Payment status from the gateway */
  status: 'captured' | 'failed' | 'pending' | 'refunded';
  /** Payment method used (e.g. 'upi', 'card', 'netbanking', 'wallet') */
  method?: string;
  /** Amount actually captured in paise */
  amountPaise?: number;
  /** Error message if verification failed */
  error?: string;
}

export interface RefundParams {
  /** Gateway payment ID to refund */
  gatewayPaymentId: string;
  /** Amount to refund in paise (for partial refunds) */
  amountPaise: number;
  /** Reason for the refund */
  reason?: string;
}

export interface RefundResult {
  /** Whether the refund was initiated successfully */
  success: boolean;
  /** Gateway refund ID */
  refundId?: string;
  /** Refund status */
  status: 'processed' | 'pending' | 'failed';
  /** Error message if refund failed */
  error?: string;
}

export interface ClientCheckoutConfig {
  /** Public key ID for the gateway (safe to expose to client) */
  publicKeyId: string;
  /** Gateway order ID */
  gatewayOrderId: string;
  /** Amount in paise */
  amountPaise: number;
  /** Currency */
  currency: string;
  /** Order number to display */
  orderNumber: string;
  /** Prefill customer details */
  prefill: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface WebhookVerifyParams {
  /** Raw request body (not parsed) */
  rawBody: string;
  /** Signature header from the webhook request */
  signature: string;
}

export interface WebhookEvent {
  /** Unique event ID from the gateway */
  eventId: string;
  /** Event type (e.g. 'payment.captured', 'payment.failed') */
  type: string;
  /** Full payload */
  payload: Record<string, unknown>;
  /** Extracted payment ID */
  gatewayPaymentId?: string;
  /** Extracted order ID */
  gatewayOrderId?: string;
  /** Extracted amount in paise */
  amountPaise?: number;
}

export interface PaymentProvider {
  /** Create a payment order on the gateway */
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;

  /** Verify a payment after the client checkout completes */
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;

  /** Initiate a refund */
  refund(params: RefundParams): Promise<RefundResult>;

  /** Get the client checkout configuration (public data only) */
  getClientCheckoutConfig(
    gatewayOrderId: string,
    amountPaise: number,
    currency: string,
    orderNumber: string,
    prefill: { name: string; email: string; phone?: string }
  ): ClientCheckoutConfig;

  /** Verify a webhook signature and parse the event */
  verifyWebhook(params: WebhookVerifyParams): WebhookEvent | null;
}
