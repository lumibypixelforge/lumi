'use client';

/**
 * LUMI Public Footer — Revision 3
 *
 * Implements:
 * - 80px top padding to ensure logo & column headers have generous breathing space from border
 * - Balanced tagline wrapping
 * - Fixed double period after "Ltd."
 * - Removed internal version string (v0.2.0)
 * - Identifiable id="site-footer" to coordinate hiding the floating chapter indicator
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { LumiLogo } from './lumi-logo';
import { IconMail } from './icons';

const FOOTER_LINKS = {
  product: [
    { label: 'Meet LUMI', href: '/#meet' },
    { label: 'Features', href: '/#see' },
    { label: 'Specs', href: '/#specs' },
    { label: 'Pre-Order', href: '/preorder' },
    { label: 'Account', href: '/account' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy', href: '/refund-policy' },
  ],
  support: [
    { label: 'Contact Support', href: `mailto:${siteConfig.contact.email}` },
  ],
};

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  // Normalize company name to eliminate double periods (e.g. "Ltd.." -> "Ltd.")
  const cleanCompanyName = siteConfig.legal.companyName.replace(/\.+$/, '');

  return (
    <footer
      id="site-footer"
      className="border-t border-border bg-surface relative z-20 pt-20 pb-16"
      role="contentinfo"
    >
      <div className="container-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand & Balanced Tagline */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="inline-block no-underline">
              <LumiLogo size="lg" />
            </Link>
            <div className="space-y-1">
              <p className="text-base font-semibold text-ink">Stay close, from anywhere.</p>
              <p className="text-muted text-sm leading-relaxed max-w-xs" style={{ textWrap: 'balance' }}>
                A compact telepresence robot with live video, two&#8209;way voice and an expressive animated face.
              </p>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-ink text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted text-sm no-underline hover:text-ink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-ink text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted text-sm no-underline hover:text-ink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-ink text-sm font-semibold mb-3">Contact</h4>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-muted text-sm no-underline hover:text-ink transition-colors inline-flex items-center gap-2">
                    <IconMail size={14} />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright at 14px muted */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-sm">
            © 2026 {cleanCompanyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
