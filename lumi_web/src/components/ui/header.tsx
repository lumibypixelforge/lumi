'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LumiLogo } from './lumi-logo';
import { IconMenu, IconClose } from './icons';

export function Header() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricingApproved, setPricingApproved] = useState(false);
  const [preordersOpen, setPreordersOpen] = useState(false);
  const isPreorderPage = pathname === '/preorder';

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { label: 'Meet LUMI', href: '/#meet' },
    { label: 'Features', href: '/#see' },
    { label: 'Specs', href: '/#specs' },
    { label: 'Pre-Order', href: '/preorder' },
    { label: 'Account', href: '/account' },
  ];

  // Fetch store settings for CTA label
  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setPricingApproved(Boolean(data.pricingApproved));
          setPreordersOpen(Boolean(data.preordersOpen));
        }
      })
      .catch(() => {});
  }, []);

  const [headerVisible, setHeaderVisible] = useState(true);
  const headerVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Scroll detection: 2px progress bar at very top, hide header on scroll down > 80px, return on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0 && progressBarRef.current) {
        const pct = Math.min(100, Math.max(0, (currentScrollY / maxScroll) * 100));
        progressBarRef.current.style.width = `${pct}%`;
      }

      if (currentScrollY <= 80) {
        if (!headerVisibleRef.current) {
          headerVisibleRef.current = true;
          setHeaderVisible(true);
        }
      } else {
        if (currentScrollY > lastScrollYRef.current) {
          // Scrolling down after 80px: hide
          if (headerVisibleRef.current) {
            headerVisibleRef.current = false;
            setHeaderVisible(false);
          }
        } else if (currentScrollY < lastScrollYRef.current) {
          // Scrolling up: show
          if (!headerVisibleRef.current) {
            headerVisibleRef.current = true;
            setHeaderVisible(true);
          }
        }
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Focus the close button when opened
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // Focus trap inside drawer & Escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!mobileMenuOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileMenuOpen(false);
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    },
    [mobileMenuOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const ctaText = preordersOpen ? 'Pre-Order Now' : 'Join the waitlist';
  const ctaHref = preordersOpen ? '/preorder' : '/#preorder';

  return (
    <>
      {/* 2px progress line stays at the very top of the screen */}
      <div
        ref={progressBarRef}
        className="fixed top-0 left-0 right-0 h-[2px] bg-accent z-[101] pointer-events-none transition-all duration-75"
        style={{ width: '0%' }}
        aria-hidden="true"
      />

      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-250 ease-out ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="bg-ground/90 border-b border-border/70 relative pt-[env(safe-area-inset-top,0px)]">
          <div className="container-lg flex items-center justify-between h-[56px] md:h-16 px-4 md:px-6">
            {/* Logo - Uppercase LUMI */}
            <Link
              href="/"
              className="flex items-center gap-2 no-underline hover:opacity-85 transition-opacity"
              aria-label="LUMI Home"
              onClick={() => setMobileMenuOpen(false)}
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
                  href={ctaHref}
                  className="btn btn-primary btn-sm no-underline"
                >
                  {ctaText}
                </Link>
              )}
            </div>

            {/* Mobile Menu Hamburger Button (56px header, min 44px tap target) */}
            <button
              className="md:!hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-raised cursor-pointer transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <IconMenu size={24} />
            </button>
          </div>
        </div>

      {/* Full-Height Mobile Drawer rendered via Portal with solid background */}
      {mounted && mobileMenuOpen && createPortal(
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="md:!hidden fixed inset-0 z-[9999] w-screen h-[100dvh] bg-[#FFFFFF] flex flex-col justify-between p-6 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          {/* Top Bar inside Drawer */}
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-border">
              <Link
                href="/"
                className="no-underline"
                aria-label="LUMI Home"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LumiLogo size="md" />
              </Link>
              <button
                ref={closeButtonRef}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-raised cursor-pointer transition-colors"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <IconClose size={24} />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-col gap-2 pt-6" aria-label="Mobile menu links">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-ink text-lg font-semibold py-3 px-3 rounded-lg no-underline hover:bg-surface-raised transition-colors flex items-center justify-between"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>{link.label}</span>
                  <span className="text-muted text-sm font-mono">→</span>
                </a>
              ))}
            </nav>
          </div>

          {/* Primary Action Button at Bottom of Drawer */}
          <div className="pt-6 border-t border-border space-y-3">
            {isPreorderPage ? (
              <Link
                href="/"
                className="btn btn-secondary w-full min-h-[48px] justify-center text-center no-underline font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Back to LUMI
              </Link>
            ) : (
              <Link
                href={ctaHref}
                className="btn btn-primary w-full min-h-[48px] justify-center text-center no-underline font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                {ctaText}
              </Link>
            )}
            <p className="text-center text-[11px] font-mono text-muted tracking-wider uppercase">
              LUMI TELEPRESENCE
            </p>
          </div>
        </div>,
        document.body
      )}
    </header>
  </>
  );
}
