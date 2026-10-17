import 'server-only';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminRole = 'owner' | 'admin' | 'viewer';

export interface AdminUser {
  user_id: string;
  role: AdminRole;
  active: boolean;
  email: string;
}

export function isAdminEnabled(): boolean {
  return process.env.ADMIN_ENABLED === 'true';
}

export function isNextRouterError(err: unknown): boolean {
  return Boolean(
    err &&
    typeof err === 'object' &&
    'digest' in err &&
    typeof (err as { digest: string }).digest === 'string' &&
    ((err as { digest: string }).digest.startsWith('NEXT_') || (err as { digest: string }).digest.includes('HANGING_PROMISE'))
  );
}

/**
 * Checks role hierarchy:
 * owner > admin > viewer
 */
export function hasRequiredRole(userRole: AdminRole, requiredRole: AdminRole): boolean {
  if (requiredRole === 'viewer') {
    return ['owner', 'admin', 'viewer'].includes(userRole);
  }
  if (requiredRole === 'admin') {
    return ['owner', 'admin'].includes(userRole);
  }
  if (requiredRole === 'owner') {
    return userRole === 'owner';
  }
  return false;
}

/**
 * Server-side authorization gate for every Admin page, API route and Server Action.
 * 
 * Rules:
 * 1. If ADMIN_ENABLED is false -> returns plain 404 for everyone.
 * 2. If unauthenticated -> redirects to /admin/login (for pages) or returns 404 (for APIs).
 * 3. If signed-in non-admin -> returns plain 404 (does NOT disclose panel existence).
 * 4. If admin without AAL2 (TOTP) -> redirects to /admin/login or returns 404.
 * 5. If session idle timeout (>30 min) or max duration (>8 hr) -> redirects to /admin/login.
 * 6. Checks role hierarchy on every call.
 */
export async function requireAdmin(
  requiredRole: AdminRole = 'viewer',
  options: { isApi?: boolean } = {}
): Promise<{ user: { id: string; email: string }; adminUser: AdminUser }> {
  // 1. Kill switch
  if (!isAdminEnabled()) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = await createClient();

  // 2. Fetch authenticated user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    if (options.isApi) {
      notFound();
    }
    redirect('/admin/login');
  }

  // 3. Query admin_users table (Service role check ensures client cannot spoof)
  const adminClient = createAdminClient();
  const { data: adminRecord, error: adminError } = await adminClient
    .from('admin_users')
    .select('user_id, role, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .single();

  if (adminError || !adminRecord) {
    // Non-admin signed in: return plain 404 to hide panel existence
    notFound();
  }

  const adminUser: AdminUser = {
    user_id: adminRecord.user_id,
    role: adminRecord.role as AdminRole,
    active: adminRecord.active,
    email: user.email,
  };

  // 4. Role Hierarchy Check
  if (!hasRequiredRole(adminUser.role, requiredRole)) {
    notFound();
  }

  // 5. MFA (AAL2) Verification Check
  // Check Supabase MFA status and admin AAL verification cookie
  const aalCookie = cookieStore.get('admin_aal')?.value;
  let hasAal2 = aalCookie === 'aal2';

  if (!hasAal2) {
    try {
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaData && mfaData.currentLevel === 'aal2') {
        hasAal2 = true;
      }
    } catch {
      // In SSR or test scenarios, rely on verified admin session cookie
    }
  }

  if (!hasAal2) {
    if (options.isApi) {
      notFound();
    }
    redirect('/admin/login?step=mfa');
  }

  // 6. Session Idle Timeout (30 min) & Max Duration (8 hours)
  const now = Date.now();
  const lastActiveStr = cookieStore.get('admin_last_active')?.value;
  const sessionStartStr = cookieStore.get('admin_session_start')?.value;

  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10);
    if (!isNaN(lastActive) && now - lastActive > 30 * 60 * 1000) {
      // Session timed out due to 30 min idle
      if (options.isApi) {
        notFound();
      }
      redirect('/admin/login?reason=idle_timeout');
    }
  }

  if (sessionStartStr) {
    const sessionStart = parseInt(sessionStartStr, 10);
    if (!isNaN(sessionStart) && now - sessionStart > 8 * 60 * 60 * 1000) {
      // Session exceeded 8 hours max lifetime
      if (options.isApi) {
        notFound();
      }
      redirect('/admin/login?reason=session_expired');
    }
  }

  return {
    user: { id: user.id, email: user.email },
    adminUser,
  };
}

/**
 * Checks whether the user has re-authenticated within the last 10 minutes.
 * Required before:
 * - Exporting CSV
 * - Changing store settings
 * - Enabling/disabling preorders
 * - Issuing refunds
 * - Managing admin roles
 */
export async function requireFreshAuth(): Promise<{ fresh: boolean; remainingSec: number }> {
  const cookieStore = await cookies();
  const recentAuthStr = cookieStore.get('admin_recent_auth')?.value;

  if (!recentAuthStr) {
    return { fresh: false, remainingSec: 0 };
  }

  const authTime = parseInt(recentAuthStr, 10);
  if (isNaN(authTime)) {
    return { fresh: false, remainingSec: 0 };
  }

  const elapsed = Date.now() - authTime;
  const tenMinutesMs = 10 * 60 * 1000;

  if (elapsed > tenMinutesMs) {
    return { fresh: false, remainingSec: 0 };
  }

  return {
    fresh: true,
    remainingSec: Math.floor((tenMinutesMs - elapsed) / 1000),
  };
}

/**
 * Audit log insertion helper with actor, IP, and user-agent metadata
 */
export async function logAdminAudit(params: {
  action: string;
  entity: string;
  entity_id?: string | null;
  actor?: string | null;
  before_value?: Record<string, unknown> | null;
  after_value?: Record<string, unknown> | null;
}) {
  try {
    const reqHeaders = await headers();
    const ip =
      reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() ||
      reqHeaders.get('x-real-ip') ||
      'unknown';
    const userAgent = reqHeaders.get('user-agent') || 'unknown';

    const enrichedAfter = {
      ...(params.after_value || {}),
      _metadata: {
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      },
    };

    const adminClient = createAdminClient();
    await (adminClient.from('audit_log') as any).insert({
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id || null,
      actor: params.actor || null,
      before_value: params.before_value || null,
      after_value: enrichedAfter,
    });
  } catch (err) {
    console.error('[Admin Audit Log Error]:', err);
  }
}
