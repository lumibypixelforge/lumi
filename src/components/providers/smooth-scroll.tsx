'use client';

/**
 * High-performance smooth scroll provider with Lenis
 * Exposes a mutable scrollStore ref for the R3F Three.js frame loop
 * to read scroll position and velocity with zero React re-renders.
 */

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

export interface ScrollStore {
  y: number;
  targetY: number;
  velocity: number;
  direction: number; // +1 down, -1 up
  isScrolling: boolean;
  lastScrollTime: number;
  lenisInstance: Lenis | null;
}

export const scrollStore: ScrollStore = {
  y: 0,
  targetY: 0,
  velocity: 0,
  direction: 1,
  isScrolling: false,
  lastScrollTime: 0,
  lenisInstance: null,
};

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      return;
    }
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0.1 : 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
    });

    scrollStore.lenisInstance = lenis;
    scrollStore.y = window.scrollY;
    scrollStore.targetY = window.scrollY;

    lenis.on('scroll', (e: { scroll: number; velocity: number; direction: number }) => {
      const now = performance.now();
      const deltaY = e.scroll - scrollStore.y;
      scrollStore.direction = deltaY >= 0 ? 1 : -1;
      scrollStore.velocity = e.velocity ?? (deltaY / 16);
      scrollStore.y = e.scroll;
      scrollStore.isScrolling = true;
      scrollStore.lastScrollTime = now;
    });

    // Native fallback scroll listener (only when Lenis is inactive)
    const onNativeScroll = () => {
      if (scrollStore.lenisInstance) return;
      const curY = window.scrollY;
      const deltaY = curY - scrollStore.y;
      scrollStore.direction = deltaY >= 0 ? 1 : -1;
      scrollStore.velocity = deltaY / 16;
      scrollStore.y = curY;
      scrollStore.isScrolling = true;
      scrollStore.lastScrollTime = performance.now();
    };

    window.addEventListener('scroll', onNativeScroll, { passive: true });

    // Sync with requestAnimationFrame
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      // Decay isScrolling flag after 150ms of inactivity
      if (scrollStore.isScrolling && performance.now() - scrollStore.lastScrollTime > 150) {
        scrollStore.isScrolling = false;
        scrollStore.velocity = 0;
      }
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onNativeScroll);
      lenis.destroy();
      scrollStore.lenisInstance = null;
    };
  }, []);

  return <>{children}</>;
}
