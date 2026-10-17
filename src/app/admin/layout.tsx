'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface AdminMeData {
  user: {
    id: string;
    email: string;
    role: 'owner' | 'admin' | 'viewer';
  };
  env: 'Development' | 'Staging' | 'Production';
  testPayments: boolean;
}

const NAV_ITEMS = [
  {
    label: 'Overview',
    href: '/admin',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: 'Customers',
    href: '/admin/customers',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Pre-orders',
    href: '/admin/preorders',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    label: 'Audit log',
    href: '/admin/audit',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminData, setAdminData] = useState<AdminMeData | null>(null);

  const isLoginPage = pathname === '/admin/login' || pathname?.startsWith('/admin/login/');

  useEffect(() => {
    if (isLoginPage) return;

    fetch('/api/admin/auth/me')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 401) {
            router.push('/admin/login');
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setAdminData(data);
      })
      .catch(() => {
        // Fallback
      });
  }, [pathname, isLoginPage, router]);

  // Close drawer on path change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/admin/login';
    }
  };

  // If on login page, render clean full-page container
  if (isLoginPage) {
    return <>{children}</>;
  }

  const env = adminData?.env || 'Development';
  const testPayments = adminData?.testPayments ?? true;
  const userEmail = adminData?.user.email || 'administrator';
  const userRole = adminData?.user.role || 'owner';

  return (
    <div className="min-h-screen bg-[#F7F6FB] flex flex-col lg:flex-row font-sans text-ink antialiased">
      {/* Mobile Top Header (below 1024px) */}
      <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight text-ink font-display">LUMI Admin</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] font-medium ${
              env === 'Production'
                ? 'border border-[#B42318] text-[#B42318] bg-[#FDECEA]'
                : env === 'Staging'
                ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                : 'bg-[#FFF3D6] text-[#8A5A00] border border-[#FEE4A6]'
            }`}
          >
            {env}
          </span>
        </div>
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label={drawerOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          className="p-1.5 text-ink hover:bg-canvas rounded-[6px] border border-border"
        >
          {drawerOpen ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Backdrop for Mobile Drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* 240px Left Sidebar / Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-card border-r border-border flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          {/* Brand Wordmark & Environment Badges */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-base tracking-tight text-ink font-display">
                LUMI Admin
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="lg:hidden p-1 text-muted hover:text-ink"
                aria-label="Close navigation"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Badges: Environment + Test Payments */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] border ${
                  env === 'Production'
                    ? 'border-[#B42318] text-[#B42318] bg-[#FDECEA]'
                    : env === 'Staging'
                    ? 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]'
                    : 'bg-[#FFF3D6] text-[#8A5A00] border-[#FEE4A6]'
                }`}
              >
                {env}
              </span>

              {testPayments && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-[#F1EFF8] text-[#5B5670] border border-[#E2DFED]">
                  Test payments
                </span>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1" aria-label="Admin navigation">
            {NAV_ITEMS.map((item) => {
              const active = item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors no-underline ${
                    active
                      ? 'bg-[#6420AA] text-white font-medium shadow-none'
                      : 'text-muted hover:text-ink hover:bg-canvas'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Signed-in User, View Site, Sign Out */}
        <div className="p-4 border-t border-border bg-card space-y-3">
          {/* User profile card */}
          <div className="p-2.5 bg-canvas border border-border rounded-[6px] space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-medium text-ink truncate max-w-[130px]" title={userEmail}>
                {userEmail}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[4px] bg-[#6420AA]/10 text-[#6420AA] font-semibold shrink-0">
                {userRole}
              </span>
            </div>
            <p className="text-[11px] text-muted">AAL2 Verified</p>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full px-2.5 py-1.5 text-[12px] text-muted hover:text-ink hover:bg-canvas rounded-[4px] no-underline transition-colors"
            >
              <span>View site</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center justify-between w-full px-2.5 py-1.5 text-[12px] text-[#B42318] hover:bg-[#FDECEA] rounded-[4px] transition-colors text-left"
            >
              <span>Sign out</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto p-6 lg:p-8">
          <Suspense fallback={<div className="p-8 text-xs text-muted">Verifying session...</div>}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
