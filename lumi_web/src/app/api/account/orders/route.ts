import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = createAdminClient();

    // 1. Gather all potential user IDs for this email
    const candidateUserIds = new Set<string>();
    let marketingConsent = false;

    // Check profiles by email (case-insensitive)
    const { data: matchedProfiles } = await supabase
      .from('profiles')
      .select('id, marketing_consent, email')
      .ilike('email', email);

    if (matchedProfiles && matchedProfiles.length > 0) {
      for (const p of matchedProfiles) {
        candidateUserIds.add(p.id);
        if (p.marketing_consent) marketingConsent = true;
      }
    }

    // Also check auth.users directly to be resilient against email desyncs
    try {
      const { data: usersList } = await supabase.auth.admin.listUsers();
      const authUser = usersList?.users?.find(
        (u) => u.email?.toLowerCase().trim() === email
      );

      if (authUser) {
        candidateUserIds.add(authUser.id);

        // Auto-heal profiles table if it had an outdated email
        await supabase.from('profiles').upsert({
          id: authUser.id,
          email: authUser.email,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (authLookupErr) {
      console.warn('[API Account Orders] Auth user lookup warning:', authLookupErr);
    }

    const userIdsArray = Array.from(candidateUserIds);

    if (userIdsArray.length === 0) {
      return NextResponse.json(
        { orders: [], marketingConsent: false },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Fetch orders for these candidate IDs
    const { data: orders, error } = await supabase
      .from('preorders')
      .select('id, order_number, quantity, deposit_paise, total_paise, payment_status, order_status, created_at, shipping_address')
      .in('user_id', userIdsArray)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        orders: orders || [],
        marketingConsent,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest: string }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_')
    ) {
      throw err;
    }
    console.error('[API Account Orders] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch customer orders' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

