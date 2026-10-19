'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DEFAULT_PRICING, formatPrice } from '@/config/product';
import { IconArrowRight } from './icons';

interface MobileCTABarProps {
  visible?: boolean;
  activeChapter?: number;
  preordersOpen?: boolean;
  pricingApproved?: boolean;
  depositPaise?: number;
}

export function MobileCTABar({
  visible = true,
  activeChapter = 1,
  preordersOpen: propPreordersOpen,
  pricingApproved: propPricingApproved,
  depositPaise: propDepositPaise,
}: MobileCTABarProps) {
  const [preordersOpen, setPreordersOpen] = useState(propPreordersOpen ?? DEFAULT_PRICING.preordersOpen);
  const [pricingApproved, setPricingApproved] = useState(propPricingApproved ?? false);
  const [depositPaise, setDepositPaise] = useState(propDepositPaise ?? DEFAULT_PRICING.depositPaise);

  // Sync props if passed
  useEffect(() => {
    if (typeof propPreordersOpen === 'boolean') setPreordersOpen(propPreordersOpen);
    if (typeof propPricingApproved === 'boolean') setPricingApproved(propPricingApproved);
    if (typeof propDepositPaise === 'number') setDepositPaise(propDepositPaise);
  }, [propPreordersOpen, propPricingApproved, propDepositPaise]);

  // Visibility states
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [formInView, setFormInView] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const [isShortScreen, setIsShortScreen] = useState(false);

  // Fetch settings from API if not passed as props
  useEffect(() => {
    if (propPreordersOpen !== undefined) return;
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (typeof data.preordersOpen === 'boolean') setPreordersOpen(data.preordersOpen);
          if (typeof data.pricingApproved === 'boolean') setPricingApproved(data.pricingApproved);
          if (typeof data.depositPaise === 'number') setDepositPaise(data.depositPaise);
        }
      })
      .catch(() => {});
  }, [propPreordersOpen]);

  // Screen height & visual viewport check for mobile keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDimensions = () => {
      const h = window.innerHeight;
      setIsShortScreen(h < 600);

      if (window.visualViewport) {
        // If visual viewport shrank by more than 25%, keyboard is open
        const isKb = window.visualViewport.height < h * 0.75;
        setKeyboardOpen(isKb);
      }
    };

    checkDimensions();
    window.addEventListener('resize', checkDimensions, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkDimensions, { passive: true });
    }

    // Hide immediately on focus of any input/textarea
    const onFocusIn = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        setKeyboardOpen(true);
      }
    };
    const onFocusOut = () => {
      setTimeout(() => setKeyboardOpen(false), 200);
    };

    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);

    return () => {
      window.removeEventListener('resize', checkDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkDimensions);
      }
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Observe footer and preorder/waitlist card to hide bottom bar when in view
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.tagName.toLowerCase() === 'footer') {
            setFooterInView(entry.isIntersecting);
          } else if (entry.target.id === 'preorder' || entry.target.classList.contains('preorder-form-container')) {
            // When user reaches preorder section or is interacting with card
            setFormInView(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.2 }
    );

    const footer = document.querySelector('footer');
    if (footer) observer.observe(footer);

    const preorderSection = document.getElementById('preorder');
    if (preorderSection) observer.observe(preorderSection);

    return () => observer.disconnect();
  }, []);

  // Scroll direction and up-distance tracking (>24px)
  const [scrolledUp24, setScrolledUp24] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollUpDistRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const curY = window.scrollY;
      const prevY = lastScrollYRef.current;
      const diff = prevY - curY;

      if (diff > 0) {
        // Scrolling UP
        setIsScrollingDown(false);
        scrollUpDistRef.current += diff;
        if (scrollUpDistRef.current > 24) {
          setScrolledUp24(true);
        }
      } else if (diff < -4) {
        // Scrolling DOWN
        setIsScrollingDown(true);
        scrollUpDistRef.current = 0;
        setScrolledUp24(false);
      }

      lastScrollYRef.current = curY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Three anchors: end of hero (ch 1 with visible), end of mood chapter (ch 5), order chapter (ch 9)
  const isAtAnchor = (activeChapter === 1 && visible) || activeChapter === 5 || activeChapter === 9;

  // Rules:
  // 1. Hide while order card or form is on screen
  // 2. Hide in the footer
  // 3. Hide when keyboard is open
  // 4. Hide on scroll down
  // 5. Show when scrolling up > 24px OR at three anchors (unless scrolling down or blocked)
  if (keyboardOpen || footerInView || formInView) return null;
  if (isScrollingDown && !isAtAnchor) return null;

  const isVisible = scrolledUp24 || isAtAnchor;
  if (!isVisible) return null;

  // Label formatting
  let buttonLabel = 'Join the waitlist';
  let buttonHref = '/#preorder';

  if (preordersOpen) {
    buttonHref = '/preorder';
    if (pricingApproved && depositPaise) {
      buttonLabel = `Pre-Order Now • ${formatPrice(depositPaise)} deposit`;
    } else {
      buttonLabel = 'Pre-Order Now';
    }
  }

  return (
    <aside
      aria-label="Mobile quick action bar"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-ground/95 backdrop-blur-md border-t border-border px-4 py-2.5 shadow-lg transition-transform duration-250 ease-out"
      style={{
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="w-full">
        <Link
          href={buttonHref}
          className="btn btn-primary w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 no-underline text-center shadow-xs"
        >
          <span>{buttonLabel}</span>
          <IconArrowRight size={16} />
        </Link>
      </div>
    </aside>
  );
}
