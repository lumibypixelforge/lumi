'use client';

/**
 * Floating Chapter Indicator — Revision 3
 *
 * Implements:
 * - Direct jumping between chapters 01 to 09
 * - Hidden when footer is in view (IntersectionObserver)
 * - Safe right edge placement to guarantee zero overlap with the 3D robot stage
 */

import React, { useState, useEffect } from 'react';

const CHAPTERS = [
  { num: '01', id: 'hero', label: 'Hero' },
  { num: '02', id: 'meet', label: 'Intro' },
  { num: '03', id: 'see', label: 'Vision' },
  { num: '04', id: 'talk', label: 'Voice' },
  { num: '05', id: 'express', label: 'Expression' },
  { num: '06', id: 'drive', label: 'Mobility' },
  { num: '07', id: 'power', label: 'Power' },
  { num: '08', id: 'specs', label: 'Specs' },
  { num: '09', id: 'preorder', label: 'Order' },
];

export function ChapterIndicator({ activeChapter = 1 }: { activeChapter: number }) {
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  // Hide chapter indicator while the footer is in view
  useEffect(() => {
    const footerEl = document.getElementById('site-footer');
    if (!footerEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsFooterVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.05,
      }
    );

    observer.observe(footerEl);
    return () => observer.disconnect();
  }, []);

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <aside
      className={`hidden xl:flex fixed right-6 xl:right-8 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-2.5 select-none transition-opacity duration-300 ${
        isFooterVisible ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      aria-label="Chapter indicator"
    >
      {CHAPTERS.map((ch, idx) => {
        const chNum = idx + 1;
        const isActive = chNum === activeChapter;
        return (
          <button
            key={ch.id}
            type="button"
            onClick={() => scrollToChapter(ch.id)}
            className="group flex items-center gap-2.5 py-1 px-1 text-right cursor-pointer bg-transparent border-none transition-all"
            aria-label={`Jump to Chapter ${ch.num}: ${ch.label}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={`text-[11px] font-mono tracking-widest transition-all duration-200 ${
                isActive
                  ? 'text-accent font-bold opacity-100 scale-105'
                  : 'text-muted/60 font-medium opacity-40 group-hover:opacity-90 group-hover:text-ink'
              }`}
            >
              {ch.num}
            </span>
            <span
              className={`h-1.5 rounded-full transition-all duration-200 ${
                isActive
                  ? 'w-5 bg-accent'
                  : 'w-1.5 bg-border-strong group-hover:bg-muted group-hover:w-3'
              }`}
            />
          </button>
        );
      })}
    </aside>
  );
}
