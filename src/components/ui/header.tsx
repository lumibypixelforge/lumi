'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LumiLogo } from './lumi-logo';
import { IconMenu, IconClose } from './icons';
import { DEFAULT_PRICING } from '@/config/product';

import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const isPreorderOpen = DEFAULT_PRICING.preordersOpen;
  const isPreorderPage = pathname === '/preorder';

  const navLinks = [
    { label: 'Meet LUMI', href: '/#meet' },
    { label: 'Features', href: '/#see' },
    { label: 'Specs', href: '/#specs' },
    { label: 'Pre-Order', href: '/preorder' },
    { label: 'Account', href: '/account' },
  ];

  // Thin scroll progress line under header
  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const ctaText = 'Pre-Order Now';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="bg-ground/85 border-b border-border/60 relative">
        <div className="container-lg flex items-center justify-between h-16">
          {/* Logo - Uppercase LUMI */}
          <Link
            href="/"
            className="flex items-center gap-2 no-underline hover:opacity-85 transition-opacity"
            aria-label="LUMI Home"
          >
            <LumiLogo size="md" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted text-sm font-medium no-underline hover:text-ink transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {isPreorderPage ? (
              <Link
                href="/"
                className="text-sm font-medium text-muted hover:text-ink transition-colors no-underline"
              >
                Back to LUMI
              </Link>
            ) : (
              <Link
                href="/preorder"
                className="btn btn-primary btn-sm no-underline"
              >
                {ctaText}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:!hidden flex items-center justify-center p-2 rounded-md text-muted hover:text-ink hover:bg-surface-raised cursor-pointer transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>
        </div>

        {/* Thin scroll progress indicator line */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-accent transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:!hidden bg-surface border-b border-border shadow-lg">
          <nav className="container-lg py-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-ink text-base font-medium py-3 px-4 rounded-md no-underline hover:bg-surface-raised transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 mt-2 border-t border-border">
              {isPreorderPage ? (
                <Link
                  href="/"
                  className="block text-center py-2.5 text-sm font-medium text-muted hover:text-ink transition-colors no-underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Back to LUMI
                </Link>
              ) : (
                <Link
                  href="/preorder"
                  className="btn btn-primary w-full no-underline justify-center text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {ctaText}
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
