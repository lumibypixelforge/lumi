import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Find profile by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, marketing_consent')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ orders: [], marketingConsent: false });
    }

    // 2. Fetch orders for this profile
    const { data: orders, error } = await supabase
      .from('preorders')
      .select('id, order_number, quantity, deposit_paise, total_paise, payment_status, order_status, created_at, shipping_address')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      orders: orders || [],
      marketingConsent: profile.marketing_consent,
    });
  } catch (err) {
    console.error('[API Account Orders] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch customer orders' }, { status: 500 });
  }
}
