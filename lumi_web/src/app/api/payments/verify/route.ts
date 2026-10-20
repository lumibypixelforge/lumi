import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPaymentProvider } from '@/lib/payments';
import { createAdminClient } from '@/lib/supabase/admin';

const verifyPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  gatewayOrderId: z.string().min(1, 'Gateway order ID is required'),
  gatewayPaymentId: z.string().min(1, 'Gateway payment ID is required'),
  signature: z.string().min(1, 'Signature is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = verifyPaymentSchema.parse(body);
    const supabase = createAdminClient();

    // 1. Fetch preorder from DB to guarantee amount & currency are strictly server-controlled
    const { data: preorder, error: fetchError } = await supabase
      .from('preorders')
      .select('id, order_number, deposit_paise, currency, user_id, payment_status, order_status')
      .eq('id', validated.orderId)
      .single();

    if (fetchError || !preorder) {
      return NextResponse.json(
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }

    if (preorder.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        orderNumber: preorder.order_number,
        message: 'Order already verified as paid',
      });
    }

    // 2. Run verification through payment provider with DB-expected amount
    const provider = getPaymentProvider();
    const verificationResult = await provider.verifyPayment({
      gatewayOrderId: validated.gatewayOrderId,
      gatewayPaymentId: validated.gatewayPaymentId,
      signature: validated.signature,
      expectedAmountPaise: preorder.deposit_paise,
      expectedCurrency: preorder.currency,
    });

    if (!verificationResult.verified) {
      // Record failed payment attempt
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          gateway_payment_id: validated.gatewayPaymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('preorder_id', preorder.id)
        .eq('gateway_order_id', validated.gatewayOrderId);

      await supabase.from('events').insert({
        user_id: preorder.user_id,
        type: 'payment_failed',
        metadata: {
          preorder_id: preorder.id,
          order_number: preorder.order_number,
          error: verificationResult.error,
        },
      });

      return NextResponse.json(
        { error: verificationResult.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    // 3. Mark payment as paid and signature verified
    const now = new Date().toISOString();

    await supabase
      .from('payments')
      .update({
        status: 'paid',
        gateway_payment_id: validated.gatewayPaymentId,
        method: verificationResult.method || 'mock_gateway',
        signature_verified: true,
        verified_at: now,
        updated_at: now,
      })
      .eq('preorder_id', preorder.id)
      .eq('gateway_order_id', validated.gatewayOrderId);

    // 4. Transition order from pending to confirmed
    await supabase
      .from('preorders')
      .update({
        payment_status: 'paid',
        order_status: 'confirmed',
        updated_at: now,
      })
      .eq('id', preorder.id);

    // 5. Append order status history
    await supabase.from('order_status_history').insert({
      preorder_id: preorder.id,
      from_status: preorder.order_status,
      to_status: 'confirmed',
      note: `Payment verified via ${provider.constructor.name}. Payment ID: ${validated.gatewayPaymentId}`,
    });

    // 6. Append audit log
    await supabase.from('audit_log').insert({
      action: 'payment_verified',
      entity: 'preorder',
      entity_id: preorder.id,
      before_value: { payment_status: preorder.payment_status, order_status: preorder.order_status },
      after_value: { payment_status: 'paid', order_status: 'confirmed', payment_id: validated.gatewayPaymentId },
    });

    // 7. Track successful payment event
    await supabase.from('events').insert({
      user_id: preorder.user_id,
      type: 'payment_success',
      metadata: {
        preorder_id: preorder.id,
        order_number: preorder.order_number,
        amount_paise: preorder.deposit_paise,
        payment_id: validated.gatewayPaymentId,
      },
    });

    return NextResponse.json({
      success: true,
      orderNumber: preorder.order_number,
      orderId: preorder.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid verification payload' },
        { status: 400 }
      );
    }
    console.error('[API Verify-Payment] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while verifying payment' },
      { status: 500 }
    );
  }
}
