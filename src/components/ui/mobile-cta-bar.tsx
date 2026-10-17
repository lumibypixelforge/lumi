'use client';

import Link from 'next/link';
import { DEFAULT_PRICING, formatPrice } from '@/config/product';
import { IconArrowRight } from './icons';

interface MobileCTABarProps {
  visible: boolean;
}

export function MobileCTABar({ visible }: MobileCTABarProps) {
  if (!visible) return null;

  return (
    <aside
      aria-label="Mobile pre-order quick bar"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-lg transition-transform duration-300 ease-out"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="block text-[11px] font-mono uppercase tracking-wider text-muted">
            LUMI Telepresence Robot
          </span>
          <span className="text-sm font-semibold text-ink">
            {DEFAULT_PRICING.depositPaise ? formatPrice(DEFAULT_PRICING.depositPaise) : '₹4,999 Deposit'}
          </span>
        </div>
        <Link
          href="/preorder"
          className="btn btn-primary py-2 px-3.5 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 no-underline"
        >
          <span>Pre-Order Now</span>
          <IconArrowRight size={14} />
        </Link>
      </div>
    </aside>
  );
}
