import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAdminAudit } from '@/lib/admin/auth';

const reauthSchema = z.object({
  password: z.string().min(1),
  code: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const validated = reauthSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Password and 6-digit TOTP code are required.' },
        { status: 400 }
      );
    }

    const { password, code } = validated.data;

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (signInError) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    // Verify TOTP factor
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = factorsData?.totp.find((f) => f.status === 'verified');

    if (verifiedTotp) {
      const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: verifiedTotp.id,
        code,
      });

      if (mfaError) {
        return NextResponse.json({ error: 'Invalid 6-digit TOTP code.' }, { status: 401 });
      }
    }

    // Refresh admin_recent_auth cookie (10 minutes validity)
    const now = Date.now();
    const cookieStore = await cookies();
    cookieStore.set('admin_recent_auth', String(now), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
    });

    await logAdminAudit({
      action: 'admin_reauthenticated',
      entity: 'auth',
      actor: user.email,
      after_value: { timestamp: new Date(now).toISOString() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Reauth Error]:', err);
    return NextResponse.json({ error: 'Failed to re-authenticate.' }, { status: 500 });
  }
}
