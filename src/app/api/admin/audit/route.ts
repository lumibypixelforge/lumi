import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  await requireAdmin('viewer', { isApi: true });
  try {
    const supabase = createAdminClient();
    const { data: logs, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err) {
    console.error('[API Admin Audit GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
