import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { logAdminAudit } from '@/lib/admin/auth';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      await logAdminAudit({
        action: 'admin_signed_out',
        entity: 'auth',
        actor: user.email,
      });
    }

    await supabase.auth.signOut();

    // Clear admin cookies
    const cookieStore = await cookies();
    cookieStore.delete('admin_aal');
    cookieStore.delete('admin_last_active');
    cookieStore.delete('admin_session_start');
    cookieStore.delete('admin_recent_auth');

    return NextResponse.json({ success: true, redirect: '/admin/login' });
  } catch (err) {
    console.error('[Admin Logout Error]:', err);
    return NextResponse.json({ error: 'Failed to sign out.' }, { status: 500 });
  }
}
