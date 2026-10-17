import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    const provider = getPaymentProvider();
    const event = provider.verifyWebhook({ rawBody, signature });

    if (!event) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check idempotency: have we already processed this event?
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('event_id, processed_at')
      .eq('event_id', event.eventId)
      .maybeSingle();

    if (existingEvent?.processed_at) {
      return NextResponse.json({
        received: true,
        alreadyProcessed: true,
        eventId: event.eventId,
      });
    }

    // Insert or update webhook event record
    await supabase.from('webhook_events').upsert({
      event_id: event.eventId,
      type: event.type,
      payload: event.payload as Record<string, string | number | boolean | null>,
      created_at: new Date().toISOString(),
    });

    // Handle supported event types
    if (event.type === 'payment.captured' && event.gatewayOrderId) {
      // Find preorder corresponding to gateway order id
      const { data: payment } = await supabase
        .from('payments')
        .select('id, preorder_id, status, amount_paise')
        .eq('gateway_order_id', event.gatewayOrderId)
        .maybeSingle();

      if (payment && payment.status !== 'paid') {
        const now = new Date().toISOString();
        await supabase
          .from('payments')
          .update({
            status: 'paid',
            gateway_payment_id: event.gatewayPaymentId || null,
            signature_verified: true,
            verified_at: now,
            updated_at: now,
          })
          .eq('id', payment.id);

        await supabase
          .from('preorders')
          .update({
            payment_status: 'paid',
            order_status: 'confirmed',
            updated_at: now,
          })
          .eq('id', payment.preorder_id);

        await supabase.from('order_status_history').insert({
          preorder_id: payment.preorder_id,
          from_status: 'pending',
          to_status: 'confirmed',
          note: `Captured via webhook event ${event.eventId}`,
        });

        await supabase.from('audit_log').insert({
          action: 'webhook_payment_captured',
          entity: 'preorder',
          entity_id: payment.preorder_id,
          after_value: { eventId: event.eventId, gatewayPaymentId: event.gatewayPaymentId },
        });
      }
    }

    // Mark event as processed
    await supabase
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', event.eventId);

    return NextResponse.json({ received: true, eventId: event.eventId });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal webhook error' },
      { status: 500 }
    );
  }
}
