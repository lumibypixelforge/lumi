import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: Request) {
  await requireAdmin('viewer', { isApi: true });
  try {
    const supabase = createAdminClient();

    const { data: customers, error } = await supabase
      .from('customer_segments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { customers: customers || [] },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err) {
    console.error('[API Admin Customers GET] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch customer list' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
