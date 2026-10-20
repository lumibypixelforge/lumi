import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentProvider } from '@/lib/payments';
import { requireAdmin, requireFreshAuth, isNextRouterError } from '@/lib/admin/auth';

const updateOrderSchema = z.object({
  action: z.enum(['update_status', 'refund']),
  newStatus: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'abandoned']).optional(),
  refundReason: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin('admin', { isApi: true });
    const { id } = await params;
    const body = await req.json();
    const validated = updateOrderSchema.parse(body);

    if (validated.action === 'refund') {
      await requireFreshAuth();
    }

    const supabase = createAdminClient();

    // 1. Fetch current order
    const { data: order, error: orderError } = await supabase
      .from('preorders')
      .select('id, order_number, order_status, payment_status, deposit_paise, user_id')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 2. Action: Update Order Status
    if (validated.action === 'update_status' && validated.newStatus) {
      await supabase
        .from('preorders')
        .update({
          order_status: validated.newStatus,
          updated_at: now,
        })
        .eq('id', id);

      await supabase.from('order_status_history').insert({
        preorder_id: id,
        from_status: order.order_status,
        to_status: validated.newStatus,
        note: `Status manually updated by admin to ${validated.newStatus}`,
      });

      await supabase.from('audit_log').insert({
        action: 'admin_order_status_update',
        entity: 'preorder',
        entity_id: id,
        before_value: { order_status: order.order_status },
        after_value: { order_status: validated.newStatus },
      });

      return NextResponse.json({ success: true, newStatus: validated.newStatus });
    }

    // 3. Action: Process Refund
    if (validated.action === 'refund') {
      if (order.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Cannot refund an unpaid order' },
          { status: 400 }
        );
      }

      // Fetch payment record
      const { data: payment } = await supabase
        .from('payments')
        .select('id, gateway_payment_id, amount_paise')
        .eq('preorder_id', id)
        .eq('status', 'paid')
        .maybeSingle();

      const provider = getPaymentProvider();
      const refundResult = await provider.refund({
        gatewayPaymentId: payment?.gateway_payment_id || 'mock_pay_id',
        amountPaise: order.deposit_paise,
        reason: validated.refundReason || 'Customer requested refund prior to dispatch',
      });

      if (!refundResult.success) {
        return NextResponse.json(
          { error: refundResult.error || 'Gateway refund initiation failed' },
          { status: 500 }
        );
      }

      // Update payment & order
      if (payment) {
        await supabase
          .from('payments')
          .update({
            status: 'refunded',
            updated_at: now,
          })
          .eq('id', payment.id);
      }

      await supabase
        .from('preorders')
        .update({
          payment_status: 'refunded',
          order_status: 'cancelled',
          updated_at: now,
        })
        .eq('id', id);

      await supabase.from('order_status_history').insert({
        preorder_id: id,
        from_status: order.order_status,
        to_status: 'cancelled',
        note: `Order cancelled and 100% deposit refunded. Reason: ${validated.refundReason || 'Admin refund'}`,
      });

      await supabase.from('audit_log').insert({
        action: 'admin_order_refunded',
        entity: 'preorder',
        entity_id: id,
        before_value: { payment_status: order.payment_status, order_status: order.order_status },
        after_value: { payment_status: 'refunded', order_status: 'cancelled', refundId: refundResult.refundId },
      });

      return NextResponse.json({ success: true, refundId: refundResult.refundId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    if (isNextRouterError(err)) throw err;
    console.error('[API Admin Orders PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
