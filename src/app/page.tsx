'use client';

/**
 * LUMI Home Page — Revision 3
 *
 * Storytelling product site featuring:
 * - Alternating 12-column stage layout: text in 5 cols, 3D stage in 7 cols, zero overlap
 * - Continuous smooth-scroll choreography: 35% dwell -> 30% travel (smootherstep) -> 35% dwell
 * - Hero redesign: giant wordmark LUMI at clamp(96px, 14vw, 220px), 4.5s circular intro lap
 *   with label glances and excited eye flashes, interactive cursor reaction & joy lap
 * - Expressive eye system: 8 parametric moods, eyelid morphing with spring smoothing,
 *   anti-glare screen (roughness 0.35, clearcoat 0, envMapIntensity 0, static sheen)
 * - Chapter 02 stacked row cards with 16px text
 * - Chapter 05 single-row mood buttons & column-contained robot
 * - Chapter 06 & 07 copy deduplication and refined floor ring
 * - Chapter 08 updated specs notice
 * - Chapter 09 waitlist prospect capture form and accessible FAQ accordion
 */

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  IconScrollDown,
  IconCamera,
  IconMicrophone,
  IconSmile,
  IconNavigation,
  IconBattery,
  IconArrowRight,
  IconCheck,
  IconUsb,
  IconRefresh,
} from '@/components/ui/icons';
import { PRODUCT_FACTS, DEFAULT_PRICING, formatPrice, getBalancePaise } from '@/config/product';
import type { LumiMood } from '@/components/3d/eye-engine';
import { MobileCTABar } from '@/components/ui/mobile-cta-bar';
import { ChapterIndicator } from '@/components/ui/chapter-indicator';

// Lazy-load the 3D scene (client-only WebGL)
const LumiScene = dynamic(
  () => import('@/components/3d/lumi-scene').then((mod) => ({ default: mod.LumiScene })),
  { ssr: false }
);

// Eagerly preload 3D scene bundle immediately on client load to minimize render delay
if (typeof window !== 'undefined') {
  import('@/components/3d/lumi-scene');
}

function ChapterLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="chapter-number">{number}</span>
      <span className="micro-label">{label}</span>
    </div>
  );
}

// ─── 01 Hero Redesign ───────────────────────────────────────────────

function HeroChapter() {
  const isPreorderOpen = DEFAULT_PRICING.preordersOpen;
  const [highlightedLabel, setHighlightedLabel] = useState<string | null>(null);
  const [cursorHintVisible, setCursorHintVisible] = useState(true);

  // Listen for label highlights during intro lap and cursor movement
  useEffect(() => {
    const onHighlight = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setHighlightedLabel(customEvent.detail);
      setTimeout(() => setHighlightedLabel(null), 450);
    };

    const onCursorMoved = () => {
      setCursorHintVisible(false);
    };

    window.addEventListener('lumi:highlight-label', onHighlight);
    window.addEventListener('lumi:cursor-moved', onCursorMoved);

    return () => {
      window.removeEventListener('lumi:highlight-label', onHighlight);
      window.removeEventListener('lumi:cursor-moved', onCursorMoved);
    };
  }, []);

  const triggerCtaHover = () => {
    window.dispatchEvent(new CustomEvent('lumi:hover-cta'));
  };

  const triggerCtaUnhover = () => {
    window.dispatchEvent(new CustomEvent('lumi:unhover-cta'));
  };

  return (
    <section id="hero" className="chapter min-h-screen flex items-start lg:items-center relative pt-20 sm:pt-24 pb-16 scroll-mt-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Text & Actions (Left Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[310px] relative z-20">
            {/* Eyebrow: 20px spacing to wordmark */}
            <p className="text-accent font-mono text-xs font-semibold tracking-widest uppercase mb-4 sm:mb-5">
              STAY CLOSE, FROM ANYWHERE
            </p>

            {/* Giant Wordmark: clamp(96px, 14vw, 220px) on desktop, 6xl on mobile */}
            <h1 className="text-ink text-6xl sm:text-7xl lg:text-[clamp(96px,14vw,220px)] font-bold tracking-tight leading-[0.9] mb-4 sm:mb-6 overflow-hidden select-none">
              <span className="inline-block animate-[fadeRise_0.85s_ease-out_forwards]">
                LUMI
              </span>
            </h1>

            {/* Subhead: max 44 characters wide */}
            <p className="text-muted text-base sm:text-lg lg:text-[20px] max-w-[44ch] mb-8 sm:mb-10 leading-relaxed text-balance">
              A compact telepresence robot you drive from your phone, with live video, two&#8209;way voice and an expressive animated face.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-10">
              <Link
                href="/preorder"
                onMouseEnter={triggerCtaHover}
                onMouseLeave={triggerCtaUnhover}
                className="btn btn-primary btn-lg inline-flex items-center justify-center gap-2 no-underline group cursor-pointer"
              >
                <span>Pre-Order Now</span>
                <IconArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#meet" className="btn btn-secondary btn-lg no-underline text-center">
                Explore LUMI
              </a>
            </div>

            {/* Cursor Hint (fades out after first pointer movement) */}
            <div
              className={`transition-opacity duration-500 mb-6 flex items-center gap-2 text-xs font-mono text-accent ${
                cursorHintVisible ? 'opacity-90' : 'opacity-0 pointer-events-none'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              <span>Move your cursor. LUMI is watching.</span>
            </div>

            {/* Feature row with reactive highlight states */}
            <div className="pt-6 border-t border-border grid grid-cols-3 gap-4 text-left">
              <div
                className={`p-2.5 rounded-lg transition-all duration-300 ${
                  highlightedLabel === 'vision'
                    ? 'bg-accent-light/50 ring-1 ring-accent'
                    : 'bg-transparent'
                }`}
              >
                <span className={`micro-label ${highlightedLabel === 'vision' ? 'text-accent font-bold' : ''}`}>
                  [ VISION ]
                </span>
                <p className="text-sm font-semibold text-ink mt-1">Live Wi&#8209;Fi</p>
              </div>

              <div
                className={`p-2.5 rounded-lg transition-all duration-300 ${
                  highlightedLabel === 'voice'
                    ? 'bg-accent-light/50 ring-1 ring-accent'
                    : 'bg-transparent'
                }`}
              >
                <span className={`micro-label ${highlightedLabel === 'voice' ? 'text-accent font-bold' : ''}`}>
                  [ VOICE ]
                </span>
                <p className="text-sm font-semibold text-ink mt-1">Two&#8209;Way</p>
              </div>

              <div
                className={`p-2.5 rounded-lg transition-all duration-300 ${
                  highlightedLabel === 'drive'
                    ? 'bg-accent-light/50 ring-1 ring-accent'
                    : 'bg-transparent'
                }`}
              >
                <span className={`micro-label ${highlightedLabel === 'drive' ? 'text-accent font-bold' : ''}`}>
                  [ DRIVE ]
                </span>
                <p className="text-sm font-semibold text-ink mt-1">2 Wheels</p>
              </div>
            </div>

            {/* Scroll hint */}
            <div className="mt-8 flex items-center gap-3 text-muted opacity-70">
              <IconScrollDown size={18} className="text-accent" />
              <span className="text-xs font-mono uppercase tracking-wider">Scroll to follow the story</span>
            </div>
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Right Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[560px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── 02 Meet LUMI ───────────────────────────────────────────────────

function MeetChapter() {
  return (
    <section id="meet" className="chapter min-h-screen flex items-start lg:items-center section relative scroll-mt-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Reserved 3D Model Stage Space (Left Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />

          {/* Column 2: Text & Stacked Row Cards (Right Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[310px] relative z-20">
            <ChapterLabel number="02" label="INTRO" />
            <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Meet LUMI
            </h2>
            <p className="text-base sm:text-lg text-muted mb-6 sm:mb-8 leading-relaxed text-balance">
              LUMI is a small robot that lets someone far away see, speak and move through a space.
              Open the app on your phone, and you are immediately there.
            </p>

            {/* Three stacked row cards (Revision 3: prevents 1-word-per-line wrapping, 16px text) */}
            <div className="flex flex-col gap-3.5">
              <div className="card p-4 sm:p-5 text-left bg-surface border border-border rounded-lg shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 bg-accent-light rounded-md flex items-center justify-center shrink-0">
                  <IconCamera size={20} className="text-accent" />
                </div>
                <div>
                  <span className="micro-label">Camera</span>
                  <p className="text-[16px] text-ink font-medium mt-0.5 leading-snug">
                    Live video stream over local Wi&#8209;Fi
                  </p>
                </div>
              </div>

              <div className="card p-4 sm:p-5 text-left bg-surface border border-border rounded-lg shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 bg-accent-light rounded-md flex items-center justify-center shrink-0">
                  <IconSmile size={20} className="text-accent" />
                </div>
                <div>
                  <span className="micro-label">Display</span>
                  <p className="text-[16px] text-ink font-medium mt-0.5 leading-snug">
                    Animated face with seven distinct moods
                  </p>
                </div>
              </div>

              <div className="card p-4 sm:p-5 text-left bg-surface border border-border rounded-lg shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 bg-accent-light rounded-md flex items-center justify-center shrink-0">
                  <IconNavigation size={20} className="text-accent" />
                </div>
                <div>
                  <span className="micro-label">Wheels</span>
                  <p className="text-[16px] text-ink font-medium mt-0.5 leading-snug">
                    Two powered wheels, three speeds
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 03 See ─────────────────────────────────────────────────────────

function SeeChapter() {
  return (
    <section id="see" className="chapter min-h-screen flex items-start lg:items-center section relative scroll-mt-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Text, Checks & Clean Light Phone Mockup (Left Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[310px] relative z-20">
            <ChapterLabel number="03" label="VISION" />
            <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              See where you want to&nbsp;be
            </h2>
            <p className="text-base sm:text-lg text-muted mb-6 sm:mb-10 leading-relaxed text-balance">
              LUMI streams live video from its camera directly to your phone over Wi&#8209;Fi.
              Look around, check in on your space, and be present with those who matter.
            </p>

            {/* Confirmed check items without unconfirmed claims */}
            <ul className="space-y-3 list-none p-0 mb-10">
              <li className="flex items-start gap-3">
                <IconCheck size={18} className="text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm text-ink font-medium">Real-time live video view inside the LUMI companion app</span>
              </li>
              <li className="flex items-start gap-3">
                <IconCheck size={18} className="text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm text-ink font-medium">Battery and connection indicators in the app</span>
              </li>
            </ul>

            {/* LUMI Companion App Device Mockup */}
            <div className="relative max-w-[260px] sm:max-w-[280px] mx-auto lg:mx-0 transition-transform duration-300 hover:scale-[1.02]">
              <Image
                src="/drive1.png"
                alt="LUMI Companion App live video stream and touch driving controls"
                width={853}
                height={1844}
                className="w-full h-auto object-contain block select-none pointer-events-none drop-shadow-[0_16px_36px_rgba(0,0,0,0.14)]"
                priority
              />
              <p className="text-[11px] font-mono text-muted text-center mt-3 tracking-wider uppercase">
                LUMI Companion App (Android)
              </p>
            </div>
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Right Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── 04 Talk ────────────────────────────────────────────────────────

function TalkChapter() {
  return (
    <section id="talk" className="chapter min-h-screen flex items-start lg:items-center section bg-surface relative scroll-mt-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Reserved 3D Model Stage Space (Left Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />

          {/* Column 2: Text & Audio Badges (Right Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[310px] relative z-20">
            <ChapterLabel number="04" label="VOICE" />
            <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Talk both ways
            </h2>
            <p className="text-base sm:text-lg text-muted mb-6 sm:mb-10 leading-relaxed text-balance">
              Two&#8209;way audio lets you hold a natural conversation through LUMI.
              Push&#8209;to&#8209;talk keeps audio crisp, while a lock option lets you speak hands&#8209;free with family.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="card p-5 bg-ground border border-border rounded-lg">
                <div className="w-8 h-8 mb-2 bg-accent-light rounded flex items-center justify-center">
                  <IconMicrophone size={18} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-ink">Push&#8209;to&#8209;Talk</p>
                <p className="text-xs text-muted mt-1">Tap and hold to broadcast your voice instantly.</p>
              </div>
              <div className="card p-5 bg-ground border border-border rounded-lg">
                <div className="w-8 h-8 mb-2 bg-accent-light rounded flex items-center justify-center">
                  <IconSmile size={18} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-ink">Hands&#8209;Free Lock</p>
                <p className="text-xs text-muted mt-1">Lock microphone open for natural conversation flow.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="badge badge-accent">Two&#8209;way audio</span>
              <span className="badge badge-accent">Onboard Speaker</span>
              <span className="badge badge-accent">Wi&#8209;Fi Stream</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 05 Express ─────────────────────────────────────────────────────

function ExpressChapter({
  activeMood,
  onMoodSelect,
}: {
  activeMood: LumiMood;
  onMoodSelect: (m: LumiMood) => void;
}) {
  // All 8 expressive moods in Revision 3
  const moods: LumiMood[] = ['neutral', 'happy', 'excited', 'sleep', 'angry', 'upset', 'sad', 'love'];

  return (
    <section id="express" className="chapter min-h-screen flex items-start lg:items-center section relative pb-20 scroll-mt-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Text & Mood Buttons (Left Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[300px] relative z-20">
            <ChapterLabel number="05" label="EXPRESSION" />
            <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Eight moods, one face
            </h2>
            <p className="text-base sm:text-lg text-muted mb-6 sm:mb-8 leading-relaxed text-balance">
              LUMI's built&#8209;in display presents an expressive animated face with natural eyelids.
              Select any mood below to morph LUMI's face in real time.
            </p>

            {/* Revision 3: Single clean row of mood buttons (no uneven wrapping) */}
            <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 mb-4 py-1">
              {moods.map((m) => {
                const isActive = m === activeMood;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onMoodSelect(m);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('lumi:set-mood', { detail: m }));
                      }
                    }}
                    className={`btn btn-sm capitalize transition-all cursor-pointer shrink-0 text-xs py-1.5 px-3 ${
                      isActive ? 'btn-primary shadow-xs' : 'btn-secondary'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Caption showing current mood */}
            <p className="text-xs text-muted font-mono mb-10">
              Active face mood: <span className="text-accent font-semibold capitalize">{activeMood}</span>
            </p>

            {/* Pre-order CTA */}
            <div>
              <Link
                href="/preorder"
                className="btn btn-primary btn-lg inline-flex items-center justify-center gap-2 no-underline cursor-pointer"
              >
                <span>Pre-Order LUMI</span>
                <IconArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Right Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── 06 Drive ───────────────────────────────────────────────────────

function DriveChapter() {
  return (
    <section id="drive" className="chapter min-h-screen flex items-start lg:items-center section bg-surface relative scroll-mt-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Reserved 3D Model Stage Space (Left Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />

          {/* Column 2: Text, Speed Chips & Mobility Controls (Right Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[310px] relative z-20">
            <ChapterLabel number="06" label="MOBILITY" />
            <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Drive from your phone
            </h2>
            {/* Revision 3: Cut 'deliberate, steady control' */}
            <p className="text-base sm:text-lg text-muted mb-6 sm:mb-10 leading-relaxed text-balance">
              Steer with the on-screen joystick and choose from three speeds. Dual powered wheels navigate smoothly, with an on-screen stop button.
            </p>

            {/* Speed chips */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {PRODUCT_FACTS.drive.speedSettings.map((speed) => (
                <div key={speed} className="card p-4 text-center bg-ground border border-border rounded-lg">
                  <p className="text-2xl font-bold text-ink">{speed}</p>
                  <p className="text-xs text-muted font-mono mt-1">Speed</p>
                </div>
              ))}
            </div>

            {/* Joystick UI Card (Revision 3: Removed duplicated sentence) */}
            <div className="bg-ground border border-border rounded-lg p-5 flex items-center gap-5 mb-6">
              <div className="w-16 h-16 bg-surface rounded-full border border-border flex items-center justify-center flex-shrink-0 relative shadow-inner">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center border border-accent/40">
                  <div className="w-4 h-4 bg-accent rounded-full shadow-xs" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Touchscreen Joystick</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Intuitive touch steering with real-time responsive maneuvering.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="badge badge-accent">Joystick Control</span>
              <span className="badge badge-accent">Stop Button</span>
              <span className="badge badge-accent">Two Powered Wheels</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 07 Power ───────────────────────────────────────────────────────

function PowerChapter() {
  return (
    <section id="power" className="chapter min-h-screen flex items-start lg:items-center section relative scroll-mt-20" style={{ backgroundColor: 'var(--color-dark-bg)' }}>
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Text & Battery Info (Left Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[310px] relative z-20">
            <ChapterLabel number="07" label="POWER" />
            <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold" style={{ color: 'var(--color-dark-text)' }}>
              Built to keep going
            </h2>
            <p className="text-base sm:text-lg mb-6 sm:mb-10 leading-relaxed text-balance" style={{ color: 'var(--color-dark-muted)' }}>
              LUMI runs on two rechargeable 18650 lithium&#8209;ion cells and recharges over USB&#8209;C.
            </p>

            {/* Power spec cards: Balanced 3-column layout with zero text wrapping or overflow */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
              {/* Card 1: Cells */}
              <div
                className="p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 hover:border-accent/40"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div>
                  <div className="w-8 h-8 mb-2.5 bg-accent/20 rounded-lg flex items-center justify-center">
                    <IconBattery size={18} className="text-accent" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold block">
                    CELLS
                  </span>
                  <p className="text-xl sm:text-2xl font-bold mt-1 leading-none tracking-tight" style={{ color: 'var(--color-dark-text)' }}>
                    2×
                  </p>
                </div>
                <p className="text-[11px] font-mono mt-3 leading-tight" style={{ color: 'var(--color-dark-muted)' }}>
                  18650 Li&#8209;ion
                </p>
              </div>

              {/* Card 2: Charging */}
              <div
                className="p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 hover:border-accent/40"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div>
                  <div className="w-8 h-8 mb-2.5 bg-accent/20 rounded-lg flex items-center justify-center">
                    <IconUsb size={18} className="text-accent" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold block">
                    PORT
                  </span>
                  <p className="text-xl sm:text-2xl font-bold mt-1 leading-none tracking-tight" style={{ color: 'var(--color-dark-text)' }}>
                    USB&#8209;C
                  </p>
                </div>
                <p className="text-[11px] font-mono mt-3 leading-tight" style={{ color: 'var(--color-dark-muted)' }}>
                  Universal
                </p>
              </div>

              {/* Card 3: Chemistry */}
              <div
                className="p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 hover:border-accent/40"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div>
                  <div className="w-8 h-8 mb-2.5 bg-accent/20 rounded-lg flex items-center justify-center">
                    <IconRefresh size={18} className="text-accent" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold block">
                    CHEMISTRY
                  </span>
                  <p className="text-xl sm:text-2xl font-bold mt-1 leading-none tracking-tight" style={{ color: 'var(--color-dark-text)' }}>
                    Li&#8209;ion
                  </p>
                </div>
                <p className="text-[11px] font-mono mt-3 leading-tight truncate" style={{ color: 'var(--color-dark-muted)' }}>
                  Rechargeable
                </p>
              </div>
            </div>

            {/* Spec Highlights */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-dark-muted)' }}>
                <IconCheck size={14} className="text-accent shrink-0" />
                <span>Replaceable standard 18650 cell bay for easy servicing</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-dark-muted)' }}>
                <IconCheck size={14} className="text-accent shrink-0" />
                <span>Supports pass&#8209;through charging over any standard USB&#8209;C power adapter</span>
              </div>
            </div>
            {/* Revision 3: Removed duplicated bottom sentence */}
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Right Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── 08 Specs ───────────────────────────────────────────────────────

function SpecsChapter() {
  const confirmedSpecs = [
    { label: 'WHEELS', value: `${PRODUCT_FACTS.drive.wheelCount} powered wheels`, note: 'Dual-drive configuration' },
    { label: 'MOODS', value: '8 animated expressions', note: 'Built-in display' },
    { label: 'SPEEDS', value: PRODUCT_FACTS.drive.speedSettings.join(', '), note: 'App joystick control' },
    { label: 'CHARGING', value: PRODUCT_FACTS.power.chargingPort, note: 'Standard USB-C connector' },
    { label: 'CELLS', value: `${PRODUCT_FACTS.power.batteryCount} × 18650 Li-ion`, note: 'Rechargeable internal cells' },
  ];

  return (
    <section id="specs" className="chapter min-h-screen flex items-start lg:items-center section bg-surface relative scroll-mt-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Reserved 3D Model Stage Space (Left Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />

          {/* Column 2: Confirmed Specs (Right Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[280px] relative z-20">
            <ChapterLabel number="08" label="STATS" />
            <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Confirmed specifications
            </h2>
            {/* Revision 3: Replaced production certification sentence */}
            <p className="text-base sm:text-lg text-muted mb-6 sm:mb-10 leading-relaxed text-balance">
              Core verified hardware parameters for the LUMI telepresence robot.
              More specifications will be published before pre-orders open.
            </p>

            {/* Confirmed spec cards */}
            <div className="space-y-3 mb-8">
              {confirmedSpecs.map((spec) => (
                <div
                  key={spec.label}
                  className="p-4 bg-ground border border-border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <span className="micro-label">{spec.label}</span>
                    <p className="text-base font-bold text-ink mt-0.5">{spec.value}</p>
                  </div>
                  <span className="text-xs text-muted font-mono hidden sm:inline-block">{spec.note}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>All 5 listed specifications are confirmed production hardware facts.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 09 Pre-Order / Waitlist & Accessible FAQ ────────────────────────

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What is a pre-order?',
    answer:
      'A pre-order reserves your LUMI unit from our initial production batch. You will place a deposit to secure your delivery queue spot.',
  },
  {
    id: 'faq-2',
    question: 'When will pricing and shipping dates be announced?',
    answer:
      'Pricing, delivery windows, and full specifications will be published prior to opening public deposits.',
  },
  {
    id: 'faq-3',
    question: 'What payment methods will be supported?',
    answer:
      'UPI, major credit and debit cards, netbanking, and digital wallets through our secure payment gateway.',
  },
];

function PreorderChapter() {
  const depositText = formatPrice(DEFAULT_PRICING.depositPaise);
  const priceText = formatPrice(DEFAULT_PRICING.pricePaise);
  const balancePaise = getBalancePaise(DEFAULT_PRICING.pricePaise, DEFAULT_PRICING.depositPaise);
  const balanceText = balancePaise ? formatPrice(balancePaise) : '₹45,000';

  // FAQ accordion state
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenFAQ((current) => (current === id ? null : id));
  };

  return (
    <section id="preorder" className="chapter min-h-screen flex items-start lg:items-center section relative scroll-mt-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Pre-order Reservation Module (Left Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] max-lg:pt-[260px] relative z-20">
            <ChapterLabel number="09" label="ORDER" />
            <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Reserve your LUMI
            </h2>
            <p className="text-base sm:text-lg text-muted mb-6 sm:mb-10 leading-relaxed text-balance">
              Secure priority shipping from Batch 01 with a {depositText} refundable deposit. The remaining balance of {balanceText} is payable only before your robot ships in {DEFAULT_PRICING.shippingEstimate || 'Q3 2026'}.
            </p>

            {/* Direct Pre-order Reservation Card */}
            <div className="bg-surface border border-border rounded-xl p-6 mb-12 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                <div>
                  <span className="badge badge-accent mb-1.5">BATCH 01 ALLOCATION</span>
                  <h3 className="text-xl font-bold text-ink">LUMI Robot</h3>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-mono text-muted uppercase">Deposit Today</span>
                  <span className="text-xl font-bold text-accent">{depositText}</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-muted mb-6">
                <div className="flex items-center justify-between">
                  <span>Full Robot Price</span>
                  <span className="font-semibold text-ink">{priceText}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estimated Delivery</span>
                  <span className="font-semibold text-ink">{DEFAULT_PRICING.shippingEstimate || 'Q3 2026'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Balance Due on Dispatch</span>
                  <span className="font-semibold text-ink">{balanceText}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-emerald-600 font-medium">
                  <span>Deposit Refund Policy</span>
                  <span>100% Refundable Anytime</span>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href="/preorder"
                  className="btn btn-primary w-full text-center justify-center py-3.5 text-base no-underline inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span>Pre-Order LUMI Now</span>
                  <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <div className="text-center pt-1">
                  <Link
                    href="/account"
                    className="text-xs text-muted hover:text-ink no-underline transition-colors"
                  >
                    Already placed a reservation? View your account →
                  </Link>
                </div>
              </div>
            </div>

            {/* Accessible FAQ Accordion */}
            <div className="border-t border-border pt-12">
              <h3 className="text-xl font-bold text-ink mb-12">
                Frequently asked questions
              </h3>

              <div className="space-y-6" role="region" aria-label="FAQ Accordion">
                {FAQ_ITEMS.map((item) => {
                  const isOpen = openFAQ === item.id;
                  return (
                    <div key={item.id} className="border-b border-border/80 pb-6">
                      <button
                        type="button"
                        onClick={() => toggleFAQ(item.id)}
                        aria-expanded={isOpen}
                        aria-controls={`${item.id}-answer`}
                        id={`${item.id}-question`}
                        className="w-full text-left flex items-center justify-between gap-4 cursor-pointer bg-transparent border-none p-0 group"
                      >
                        <span className="text-[20px] font-semibold text-ink group-hover:text-accent transition-colors">
                          {item.question}
                        </span>
                        <span className="text-accent text-xl font-mono flex-shrink-0 transition-transform duration-200">
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>
                      {isOpen && (
                        <div
                          id={`${item.id}-answer`}
                          role="region"
                          aria-labelledby={`${item.id}-question`}
                          className="mt-4 text-[16px] text-muted leading-[1.6]"
                        >
                          <p className="text-[16px] text-muted leading-[1.6]">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Right Half: 7 cols) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── Main Page Component ────────────────────────────────────────────

const CHAPTER_DEFAULT_MOODS: Record<number, LumiMood> = {
  1: 'happy',
  2: 'happy',
  3: 'neutral',
  4: 'happy',
  5: 'happy',
  6: 'happy',
  7: 'happy',
  8: 'neutral',
  9: 'love',
};

export default function HomePage() {
  const [activeChapter, setActiveChapter] = useState(1);
  const [chapter5Mood, setChapter5Mood] = useState<LumiMood>('happy');
  const [scrollPastHero, setScrollPastHero] = useState(false);

  // Track active chapter for ChapterIndicator (debounced, does not re-render 3D loop)
  useEffect(() => {
    const chapterIds = ['hero', 'meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = chapterIds.indexOf(entry.target.id);
            if (index !== -1) {
              const newChapter = index + 1;
              setActiveChapter(newChapter);

              // When scrolling away from chapter 5 (e.g. down to 6, 7 or up to 4, 3, etc.):
              // Clear the selected expression so it does NOT persist!
              if (newChapter !== 5) {
                setChapter5Mood('happy');
                const defaultMood = CHAPTER_DEFAULT_MOODS[newChapter] || 'happy';
                window.dispatchEvent(new CustomEvent('lumi:set-mood', { detail: defaultMood }));
              }
            }
          }
        });
      },
      {
        threshold: 0.35,
      }
    );

    chapterIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const handleScroll = () => {
      setScrollPastHero(window.scrollY > window.innerHeight * 0.7);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleChapter5MoodSelect = (mood: LumiMood) => {
    setChapter5Mood(mood);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lumi:set-mood', { detail: mood }));
    }
  };

  const sceneMood = activeChapter === 5 ? chapter5Mood : (CHAPTER_DEFAULT_MOODS[activeChapter] || 'happy');

  return (
    <>
      {/* Chapter Indicator: 01 to 09 on desktop page edge (hidden when footer in view) */}
      <ChapterIndicator activeChapter={activeChapter} />

      {/* Fixed 3D Canvas coordinating camera and model smoothly per chapter */}
      <LumiScene activeChapter={activeChapter} mood={sceneMood} />

      {/* Two-column alternating scroll chapters */}
      <div className="relative z-10">
        <HeroChapter />
        <MeetChapter />
        <SeeChapter />
        <TalkChapter />
        <ExpressChapter
          activeMood={chapter5Mood}
          onMoodSelect={handleChapter5MoodSelect}
        />
        <DriveChapter />
        <PowerChapter />
        <SpecsChapter />
        <PreorderChapter />
      </div>

      {/* Mobile bottom CTA bar (appears after hero) */}
      <MobileCTABar visible={scrollPastHero} />
    </>
  );
}
