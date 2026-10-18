'use client';

import { useState, useEffect } from 'react';
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

  // Rules:
  // 1. Hide while order card or form is on screen
  // 2. Hide in the footer
  // 3. Hide when keyboard is open
  // 4. On screens shorter than 600px, show ONLY in the hero (ch 1) and chapter 09 (ch 9)
  if (!visible) return null;
  if (keyboardOpen) return null;
  if (footerInView) return null;
  if (formInView) return null;

  if (isShortScreen && activeChapter !== 1 && activeChapter !== 9) {
    return null;
  }

  // Label formatting
  let buttonLabel = 'Join the waitlist';
  let buttonHref = '/#preorder';

  if (preordersOpen) {
    buttonHref = '/preorder';
    if (pricingApproved && depositPaise) {
      buttonLabel = `Pre-Order Now • Deposit ${formatPrice(depositPaise)}`;
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
