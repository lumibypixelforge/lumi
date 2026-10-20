import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, logAdminAudit, isNextRouterError } from '@/lib/admin/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin('viewer', { isApi: true });
    const { id } = await params;
    const supabase = createAdminClient();

    // 1. Fetch customer from view
    const { data: customer, error: customerErr } = await supabase
      .from('customer_segments')
      .select('*')
      .eq('id', id)
      .single();

    if (customerErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 2. Fetch notes
    const { data: notes } = await supabase
      .from('admin_notes')
      .select('id, note, created_at, admin_id')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    // 3. Fetch follow up status
    const { data: followUp } = await supabase
      .from('follow_ups')
      .select('id, status, next_action_at, updated_at')
      .eq('customer_id', id)
      .maybeSingle();

    // 4. Fetch orders
    const { data: orders } = await supabase
      .from('preorders')
      .select('id, order_number, quantity, deposit_paise, payment_status, order_status, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      customer,
      notes: notes || [],
      followUp: followUp || null,
      orders: orders || [],
    });
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    console.error('[API Admin Customer Detail] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch customer detail' }, { status: 500 });
  }
}

// Add note or update follow-up
const postActionSchema = z.object({
  action: z.enum(['add_note', 'update_follow_up']),
  note: z.string().optional(),
  followUpStatus: z.enum(['new', 'contacted', 'interested', 'not_interested']).optional(),
  nextActionAt: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { adminUser } = await requireAdmin('admin', { isApi: true });
    const { id } = await params;
    const body = await req.json();
    const validated = postActionSchema.parse(body);
    const supabase = createAdminClient();

    if (validated.action === 'add_note' && validated.note) {
      const adminId = adminUser.user_id;

      const { data: newNote, error } = await supabase
        .from('admin_notes')
        .insert({
          customer_id: id,
          admin_id: adminId,
          note: validated.note,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logAdminAudit({
        action: 'added_customer_note',
        entity: 'customer',
        entity_id: id,
        actor: adminUser.email,
        after_value: { note: validated.note },
      });

      return NextResponse.json({ success: true, note: newNote });
    }

    if (validated.action === 'update_follow_up' && validated.followUpStatus) {
      const { data: existing } = await supabase
        .from('follow_ups')
        .select('id, status')
        .eq('customer_id', id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('follow_ups')
          .update({
            status: validated.followUpStatus,
            next_action_at: validated.nextActionAt || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('follow_ups').insert({
          customer_id: id,
          status: validated.followUpStatus,
          next_action_at: validated.nextActionAt || null,
        });
      }

      await logAdminAudit({
        action: 'updated_customer_follow_up',
        entity: 'customer',
        entity_id: id,
        actor: adminUser.email,
        before_value: existing ? { status: existing.status } : null,
        after_value: { status: validated.followUpStatus },
      });

      return NextResponse.json({ success: true, status: validated.followUpStatus });
    }

    return NextResponse.json({ error: 'Invalid action payload' }, { status: 400 });
  } catch (err) {
    if (isNextRouterError(err)) throw err;
    console.error('[API Admin Customer Action] Error:', err);
    return NextResponse.json({ error: 'Failed to perform customer action' }, { status: 500 });
  }
}
