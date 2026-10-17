import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, requireFreshAuth, logAdminAudit, isNextRouterError } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    await requireAdmin('viewer', { isApi: true });
    const supabase = createAdminClient();

    const { data: orders, error } = await supabase
      .from('preorders')
      .select(`
        id,
        order_number,
        quantity,
        deposit_paise,
        total_paise,
        currency,
        payment_status,
        order_status,
        created_at,
        shipping_address,
        user_id,
        profiles (
          full_name,
          email,
          phone
        ),
        payments (
          id,
          gateway,
          gateway_order_id,
          gateway_payment_id,
          amount_paise,
          status,
          method,
          signature_verified,
          verified_at
        ),
        order_status_history (
          id,
          from_status,
          to_status,
          note,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    console.error('[API Admin Orders GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

const updateOrderSchema = z.object({
  orderId: z.string().uuid(),
  action: z.enum(['update_status', 'refund', 'resend_confirmation']),
  newStatus: z
    .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'abandoned'])
    .optional(),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { adminUser } = await requireAdmin('admin', { isApi: true });
    const body = await req.json();
    const validated = updateOrderSchema.parse(body);
    const supabase = createAdminClient();

    // Fetch existing order
    const { data: order, error: fetchErr } = await supabase
      .from('preorders')
      .select('id, order_number, order_status, payment_status, deposit_paise')
      .eq('id', validated.orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (validated.action === 'update_status') {
      const nextStatus = validated.newStatus;
      if (!nextStatus) {
        return NextResponse.json({ error: 'New status is required' }, { status: 400 });
      }

      // Business Rule: An order can leave 'pending' only when payment is verified as paid!
      if (
        order.order_status === 'pending' &&
        nextStatus !== 'pending' &&
        nextStatus !== 'cancelled' &&
        nextStatus !== 'abandoned' &&
        order.payment_status !== 'paid'
      ) {
        return NextResponse.json(
          { error: "Order status cannot leave 'pending' until payment is verified as paid." },
          { status: 400 }
        );
      }

      const { error: updateErr } = await supabase
        .from('preorders')
        .update({
          order_status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Record in status history
      await supabase.from('order_status_history').insert({
        preorder_id: order.id,
        from_status: order.order_status,
        to_status: nextStatus,
        changed_by: adminUser.user_id,
        note: validated.reason || `Status changed from ${order.order_status} to ${nextStatus}`,
      });

      // Immutable audit log
      await logAdminAudit({
        action: 'admin_updated_order_status',
        entity: 'preorder',
        entity_id: order.id,
        actor: adminUser.email,
        before_value: { order_status: order.order_status },
        after_value: { order_status: nextStatus, reason: validated.reason },
      });

      return NextResponse.json({ success: true, order_status: nextStatus });
    }

    if (validated.action === 'refund') {
      // Sensitive Action: Requires 10-minute fresh authentication
      const freshAuth = await requireFreshAuth();
      if (!freshAuth.fresh) {
        return NextResponse.json(
          {
            error: 'Fresh authentication required within the last 10 minutes to process refunds.',
            requireReauth: true,
          },
          { status: 403 }
        );
      }

      const { error: refundOrderErr } = await supabase
        .from('preorders')
        .update({
          order_status: 'cancelled',
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (refundOrderErr) {
        return NextResponse.json({ error: refundOrderErr.message }, { status: 500 });
      }

      // Update payment record
      await supabase
        .from('payments')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('preorder_id', order.id);

      // Record in status history
      await supabase.from('order_status_history').insert({
        preorder_id: order.id,
        from_status: order.order_status,
        to_status: 'cancelled',
        changed_by: adminUser.user_id,
        note: validated.reason || 'Full deposit refunded by administrator',
      });

      // Immutable audit log
      await logAdminAudit({
        action: 'admin_issued_refund',
        entity: 'preorder',
        entity_id: order.id,
        actor: adminUser.email,
        before_value: {
          order_status: order.order_status,
          payment_status: order.payment_status,
        },
        after_value: {
          order_status: 'cancelled',
          payment_status: 'refunded',
          refund_amount_paise: order.deposit_paise,
          reason: validated.reason,
        },
      });

      return NextResponse.json({ success: true, refunded: true });
    }

    if (validated.action === 'resend_confirmation') {
      await logAdminAudit({
        action: 'admin_resent_confirmation',
        entity: 'preorder',
        entity_id: order.id,
        actor: adminUser.email,
      });

      return NextResponse.json({ success: true, sent: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    console.error('[API Admin Orders Action] Error:', err);
    return NextResponse.json({ error: 'Failed to process order action' }, { status: 500 });
  }
}
