import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkLoginRateLimit, recordLoginFailure, recordLoginSuccess } from '@/lib/admin/rate-limit';
import { logAdminAudit } from '@/lib/admin/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const body = await req.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Valid email and password required.' }, { status: 400 });
    }

    const { email, password } = validated.data;
    const rateLimitKey = `${ip}:${email.toLowerCase()}`;

    // 1. Rate Limiting Check (5 failures = 15 min lock)
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      const waitMin = Math.ceil((rateCheck.lockoutRemainingSec || 900) / 60);
      await logAdminAudit({
        action: 'admin_login_rate_limited',
        entity: 'auth',
        actor: email,
        after_value: { ip, lockoutRemainingSec: rateCheck.lockoutRemainingSec },
      });
      return NextResponse.json(
        {
          error: `Too many failed attempts. Account locked for ${waitMin} minutes.`,
          locked: true,
          lockoutRemainingSec: rateCheck.lockoutRemainingSec,
        },
        { status: 429 }
      );
    }

    // 2. Authenticate credentials against Supabase
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const failInfo = recordLoginFailure(rateLimitKey);
      await logAdminAudit({
        action: 'admin_login_failed',
        entity: 'auth',
        actor: email,
        after_value: { ip, remainingAttempts: failInfo.remainingAttempts, locked: failInfo.locked },
      });

      if (failInfo.locked) {
        return NextResponse.json(
          {
            error: 'Too many failed sign-in attempts. Account locked for 15 minutes.',
            locked: true,
            lockoutRemainingSec: failInfo.lockoutRemainingSec,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `Invalid email or password. ${failInfo.remainingAttempts} attempts remaining.`,
          remainingAttempts: failInfo.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 3. Verify user is in admin_users table and active
    const adminClient = createAdminClient();
    const { data: adminRecord, error: adminQueryError } = await adminClient
      .from('admin_users')
      .select('user_id, role, active')
      .eq('user_id', authData.user.id)
      .eq('active', true)
      .single();

    if (adminQueryError || !adminRecord) {
      // Sign out customer from supabase to prevent access
      await supabase.auth.signOut();
      recordLoginFailure(rateLimitKey);
      await logAdminAudit({
        action: 'admin_unauthorized_access_attempt',
        entity: 'auth',
        actor: email,
        after_value: { ip, note: 'User authenticated in Supabase but not listed in admin_users' },
      });
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 4. Check TOTP factors in Supabase MFA
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError) {
      return NextResponse.json({ error: 'Failed to query MFA factors.' }, { status: 500 });
    }

    const verifiedTotp = factorsData.totp.find((f) => f.status === 'verified');

    if (verifiedTotp) {
      // User has existing verified TOTP factor, return factorId for challenge
      return NextResponse.json({
        step: 'totp',
        factorId: verifiedTotp.id,
        email,
      });
    }

    // User does not have a verified TOTP factor yet -> Enroll new TOTP
    // First, unenroll any pending unverified factors to avoid conflicts
    for (const factor of factorsData.all) {
      if (factor.status === 'unverified') {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'LUMI Ops',
      friendlyName: `LUMI Admin (${email})`,
    });

    if (enrollError || !enrollData) {
      return NextResponse.json(
        { error: enrollError?.message || 'Failed to initialize TOTP authenticator setup.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      step: 'enroll_totp',
      factorId: enrollData.id,
      qrCode: enrollData.totp.qr_code,
      secret: enrollData.totp.secret,
      uri: enrollData.totp.uri,
      email,
    });
  } catch (err) {
    console.error('[Admin Login Route Error]:', err);
    return NextResponse.json({ error: 'An unexpected internal error occurred.' }, { status: 500 });
  }
}
