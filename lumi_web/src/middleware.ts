import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Kill Switch Check (ADMIN_ENABLED, defaults to true unless explicitly 'false')
  const adminEnabled = process.env.ADMIN_ENABLED !== 'false';
  if (!adminEnabled) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 2. IP Allowlist Check (Optional outer gate: ADMIN_ALLOWED_IPS)
  const allowedIpsStr = process.env.ADMIN_ALLOWED_IPS;
  if (allowedIpsStr) {
    const allowedIps = allowedIpsStr
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '';

    if (allowedIps.length > 0 && (!clientIp || !allowedIps.includes(clientIp))) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  // Check for public admin sign-in and auth routes
  const isLoginPage = pathname === '/admin/login' || pathname.startsWith('/admin/login/');
  const isAuthRoute = isLoginPage || pathname.startsWith('/api/admin/auth/');

  // 3. Edge Session Check
  // Supabase stores auth tokens in cookies matching 'sb-<project-ref>-auth-token' or similar
  const cookies = req.cookies.getAll();
  const hasAuthCookie = cookies.some(
    (c) =>
      c.name.includes('auth-token') ||
      c.name.includes('supabase') ||
      c.name === 'admin_aal'
  );

  if (!isAuthRoute && !hasAuthCookie) {
    if (pathname.startsWith('/api/admin')) {
      return new NextResponse('Not Found', { status: 404 });
    }
    const loginUrl = new URL('/admin/login', req.url);
    const res = NextResponse.redirect(loginUrl);
    applySecurityHeaders(res.headers);
    return res;
  }

  // If already authenticated and visiting /admin/login, redirect to /admin
  const hasAal2 = req.cookies.get('admin_aal')?.value === 'aal2';
  if (isLoginPage && hasAuthCookie && hasAal2) {
    const adminHomeUrl = new URL('/admin', req.url);
    const res = NextResponse.redirect(adminHomeUrl);
    applySecurityHeaders(res.headers);
    return res;
  }

  // Proceed with request
  const response = NextResponse.next();
  applySecurityHeaders(response.headers);
  return response;
}

function applySecurityHeaders(headers: Headers) {
  // Prevent indexing, archiving, and snippet caching
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('Pragma', 'no-cache');

  // Clickjacking & framing protection
  headers.set('X-Frame-Options', 'DENY');

  // Strict CSP with frame-ancestors 'none'
  headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'none'; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.supabase.com;"
  );

  // Strict Transport Security (HSTS)
  headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
}
