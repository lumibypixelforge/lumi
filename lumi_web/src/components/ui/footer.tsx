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
      className="border-t border-border bg-surface relative z-20 py-4 md:pt-20 md:pb-16"
      role="contentinfo"
    >
      <div className="container-lg">
        {/* Mobile: Compact single column (Section 5) */}
        <div className="flex flex-col md:hidden items-center text-center space-y-2">
          <Link href="/" className="inline-block no-underline" aria-label="LUMI Home">
            <LumiLogo size="sm" />
          </Link>
          <p className="text-xs font-semibold text-ink">Stay close, from anywhere.</p>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-1.5 border-t border-border/60 w-full text-xs">
            <Link href="/#meet" className="text-muted hover:text-ink no-underline py-1 inline-flex items-center">Meet LUMI</Link>
            <Link href="/#see" className="text-muted hover:text-ink no-underline py-1 inline-flex items-center">Vision</Link>
            <Link href="/#specs" className="text-muted hover:text-ink no-underline py-1 inline-flex items-center">Specs</Link>
            <Link href="/preorder" className="text-accent font-semibold hover:text-accent-hover no-underline py-1 inline-flex items-center">Pre-Order</Link>
            <Link href="/privacy" className="text-muted hover:text-ink no-underline py-1 inline-flex items-center">Privacy</Link>
            <Link href="/terms" className="text-muted hover:text-ink no-underline py-1 inline-flex items-center">Terms</Link>
            <a href={`mailto:${siteConfig.contact.email}`} className="text-muted hover:text-ink no-underline py-1 inline-flex items-center">Support</a>
          </div>
          <p className="text-[11px] font-mono text-muted pt-1">
            © 2026 {cleanCompanyName}. All rights reserved.
          </p>
        </div>

        {/* Desktop: 4-Column Layout (Preserved >= 768px) */}
        <div className="hidden md:grid md:grid-cols-4 gap-12">
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
        <div className="hidden md:flex mt-16 pt-8 border-t border-border flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-sm">
            © 2026 {cleanCompanyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
