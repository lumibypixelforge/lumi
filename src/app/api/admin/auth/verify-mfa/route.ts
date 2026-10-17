import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { recordLoginSuccess } from '@/lib/admin/rate-limit';
import { logAdminAudit } from '@/lib/admin/auth';

const mfaSchema = z.object({
  factorId: z.string().min(1),
  code: z.string().length(6),
  email: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const body = await req.json();
    const validated = mfaSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'A 6-digit TOTP verification code is required.' }, { status: 400 });
    }

    const { factorId, code, email } = validated.data;
    const supabase = await createClient();

    // Verify TOTP code with Supabase Auth MFA
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

    if (challengeError || !challengeData) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please check your authenticator app and try again.' },
        { status: 401 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userEmail = email || user?.email || 'admin';
    const rateLimitKey = `${ip}:${userEmail.toLowerCase()}`;
    recordLoginSuccess(rateLimitKey);

    const now = Date.now();
    const cookieStore = await cookies();

    // Set secure admin session cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 8 * 60 * 60, // 8 hours max lifetime
    };

    cookieStore.set('admin_aal', 'aal2', cookieOptions);
    cookieStore.set('admin_last_active', String(now), cookieOptions);
    cookieStore.set('admin_session_start', String(now), cookieOptions);
    cookieStore.set('admin_recent_auth', String(now), cookieOptions);

    await logAdminAudit({
      action: 'admin_signed_in',
      entity: 'auth',
      actor: userEmail,
      after_value: {
        ip,
        mfa_level: 'aal2',
        factorId,
        session_start: new Date(now).toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      redirect: '/admin',
    });
  } catch (err) {
    console.error('[Admin MFA Verify Error]:', err);
    return NextResponse.json({ error: 'Failed to verify second factor.' }, { status: 500 });
  }
}
