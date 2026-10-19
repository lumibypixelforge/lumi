'use client';

/**
 * LUMI Home Page — Mobile Experience Fix & Desktop Stage Choreography
 *
 * Implements:
 * - Mobile Robot Dock (<768px): fixed under header, solid background, content scrolls underneath
 * - Alternating 12-column stage layout on desktop (768px+ & landscape <500px)
 * - Hero redesign: single brackets [ VISION ], [ VOICE ], [ DRIVE ] with zero wrapping glitches
 * - Chapter 02: 7 confirmed moods
 * - Chapter 03: illustrated companion app screen (no AI or stock dog photo, no fake metrics)
 * - Chapter 04: unconfirmed copy removed ('with family' and 'keeps audio crisp')
 * - Chapter 05: 'Seven moods, one face', 4-column grid of buttons (min-h 44px, no scrollbar), 'excited' removed
 * - Chapter 06: two powered wheels, three speeds, on-screen joystick
 * - Chapter 07: unconfirmed claims removed (cell bay servicing, pass-through charging, universal), dark dock cross-fade
 * - Chapter 08: '7 animated expressions'
 * - Chapter 09: conditional waitlist state until pricing is approved in Settings, accessible FAQ accordion
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
import { LumiLogo } from '@/components/ui/lumi-logo';

import { useIsLowEndDevice } from '@/components/3d/lumi-scene';

// Lazy-load the 3D scene (client-only WebGL)
const LumiScene = dynamic(
  () => import('@/components/3d/lumi-scene').then((mod) => ({ default: mod.LumiScene })),
  { ssr: false }
);

if (typeof window !== 'undefined') {
  import('@/components/3d/lumi-scene');
}

function ChapterLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <span className="chapter-number">{number}</span>
      <span className="micro-label">{label}</span>
    </div>
  );
}

function RobotStage({
  chapter,
  className = 'robot-stage-default',
  activeMood,
  isLiteMode = false,
}: {
  chapter: number;
  className?: string;
  activeMood?: LumiMood;
  isLiteMode?: boolean;
}) {
  const handleTap = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lumi:tap-robot'));
    }
  };

  return (
    <div
      className={`robot-stage ${className}`}
      data-chapter={chapter}
      aria-label={`LUMI Robot stage chapter ${chapter}`}
      onClick={handleTap}
    >
      {isLiteMode && (
        <img
          src={chapter === 5 ? `/lite-robot/mood-${activeMood || 'happy'}.webp` : `/lite-robot/ch${chapter}.webp`}
          alt="LUMI Robot"
          className="lite-robot-img"
        />
      )}
    </div>
  );
}

// ─── 01 Hero Chapter ────────────────────────────────────────────────

function HeroChapter({
  preordersOpen = true,
  isLiteMode = false,
}: {
  preordersOpen?: boolean;
  isLiteMode?: boolean;
}) {
  const [highlightedLabel, setHighlightedLabel] = useState<string | null>(null);
  const [cursorHintVisible, setCursorHintVisible] = useState(true);

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
    <section id="hero" className="chapter min-h-screen flex items-start lg:items-center relative pt-0 sm:pt-24 pb-3 sm:pb-12">
      <div className="container-lg">
        {/* Robot Stage on top for mobile (<768px): clamp(170px, 24svh, 210px) */}
        <RobotStage chapter={1} className="robot-stage-hero" isLiteMode={isLiteMode} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Text & Actions (Left Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20">
            {/* Eyebrow */}
            <p className="text-accent font-mono text-[11px] sm:text-xs font-semibold tracking-widest uppercase mb-2 sm:mb-5">
              STAY CLOSE, FROM ANYWHERE
            </p>

            {/* Giant Wordmark */}
            <h1 className="mb-3 sm:mb-6 select-none flex items-center">
              <span className="sr-only">LUMI</span>
              <div className="inline-block animate-[fadeRise_0.85s_ease-out_forwards]">
                <LumiLogo size="hero" className="text-ink" />
              </div>
            </h1>

            {/* Subhead: max 40-44 characters */}
            <p className="text-muted text-[15px] sm:text-lg lg:text-[20px] max-w-[40ch] mb-4 sm:mb-8 leading-relaxed text-balance">
              A compact telepresence robot you drive from your phone, with live video, two&#8209;way voice and an expressive animated face.
            </p>

            {/* Buttons (min 44px mobile, 48px desktop) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5 mb-6 sm:mb-8">
              <Link
                href={preordersOpen ? '/preorder' : '/#preorder'}
                onMouseEnter={triggerCtaHover}
                onMouseLeave={triggerCtaUnhover}
                className="btn btn-primary w-full sm:w-auto min-h-[44px] sm:min-h-[48px] py-2.5 sm:py-3 inline-flex items-center justify-center gap-2 no-underline group cursor-pointer text-sm sm:text-base font-semibold"
              >
                <span>{preordersOpen ? 'Pre-Order Now' : 'Join the waitlist'}</span>
                <IconArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#meet" className="btn btn-secondary w-full sm:w-auto min-h-[44px] sm:min-h-[48px] py-2.5 sm:py-3 no-underline text-center inline-flex items-center justify-center text-sm sm:text-base font-semibold">
                Explore LUMI
              </a>
            </div>

            {/* Cursor Hint (desktop only, hidden on mobile) */}
            <div
              className={`hidden sm:flex transition-opacity duration-500 mb-6 items-center gap-2 text-xs font-mono text-accent ${
                cursorHintVisible ? 'opacity-90' : 'opacity-0 pointer-events-none'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              <span>Move your cursor. LUMI is watching.</span>
            </div>

            {/* Feature row: Desktop 3-column cards with highlight support */}
            <div className="hidden sm:grid pt-6 border-t border-border grid-cols-3 gap-2 sm:gap-4 text-left">
              <div
                className={`p-2 sm:p-2.5 rounded-lg transition-all duration-300 ${
                  highlightedLabel === 'vision'
                    ? 'bg-accent-light/50 ring-1 ring-accent'
                    : 'bg-transparent'
                }`}
              >
                <span className={`micro-label ${highlightedLabel === 'vision' ? 'text-accent font-bold' : ''}`}>
                  VISION
                </span>
                <p className="text-xs sm:text-sm font-semibold text-ink mt-1 whitespace-nowrap">Live Wi&#8209;Fi</p>
              </div>

              <div
                className={`p-2 sm:p-2.5 rounded-lg transition-all duration-300 ${
                  highlightedLabel === 'voice'
                    ? 'bg-accent-light/50 ring-1 ring-accent'
                    : 'bg-transparent'
                }`}
              >
                <span className={`micro-label ${highlightedLabel === 'voice' ? 'text-accent font-bold' : ''}`}>
                  VOICE
                </span>
                <p className="text-xs sm:text-sm font-semibold text-ink mt-1 whitespace-nowrap">Two&#8209;Way</p>
              </div>

              <div
                className={`p-2 sm:p-2.5 rounded-lg transition-all duration-300 ${
                  highlightedLabel === 'drive'
                    ? 'bg-accent-light/50 ring-1 ring-accent'
                    : 'bg-transparent'
                }`}
              >
                <span className={`micro-label ${highlightedLabel === 'drive' ? 'text-accent font-bold' : ''}`}>
                  DRIVE
                </span>
                <p className="text-xs sm:text-sm font-semibold text-ink mt-1 whitespace-nowrap">2 Wheels</p>
              </div>
            </div>

            {/* Mobile feature row (hidden on desktop) */}
            <div className="sm:hidden pt-2 border-t border-border flex items-center justify-between text-center">
              <span className={`micro-label text-[11px] ${highlightedLabel === 'vision' ? 'text-accent font-bold' : ''}`}>
                VISION
              </span>
              <span className={`micro-label text-[11px] ${highlightedLabel === 'voice' ? 'text-accent font-bold' : ''}`}>
                VOICE
              </span>
              <span className={`micro-label text-[11px] ${highlightedLabel === 'drive' ? 'text-accent font-bold' : ''}`}>
                DRIVE
              </span>
            </div>

            {/* Scroll hint on desktop */}
            <div className="hidden sm:flex mt-8 items-center gap-3 text-muted opacity-75">
              <IconScrollDown size={18} className="text-accent flex-shrink-0" />
              <span className="text-xs font-mono uppercase tracking-wider">Scroll to follow the story</span>
            </div>
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[560px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── 02 Meet LUMI ───────────────────────────────────────────────────

function MeetChapter({ isLiteMode = false }: { isLiteMode?: boolean }) {
  return (
    <section id="meet" className="chapter min-h-screen flex items-start lg:items-center section relative">
      <div className="container-lg">
        {/* Mobile In-flow Stage */}
        <RobotStage chapter={2} className="robot-stage-default" isLiteMode={isLiteMode} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Reserved 3D Model Stage Space (Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />

          {/* Column 2: Text & Cards */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20">
            <ChapterLabel number="02" label="INTRO" />
            <h2 className="mb-2 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Meet LUMI
            </h2>
            <p className="text-[15px] sm:text-lg text-muted mb-4 sm:mb-8 leading-relaxed text-balance max-w-[40ch]">
              LUMI is a small robot that lets someone far away see, speak and move through a space.
              Open the app on your phone, and you are immediately there.
            </p>

            {/* Desktop cards (hidden on mobile) */}
            <div className="hidden md:flex flex-col gap-3">
              <div className="card p-5 h-auto min-h-0 text-left bg-surface border border-border rounded-lg shadow-xs flex items-center gap-4">
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

              <div className="card p-5 h-auto min-h-0 text-left bg-surface border border-border rounded-lg shadow-xs flex items-center gap-4">
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

              <div className="card p-5 h-auto min-h-0 text-left bg-surface border border-border rounded-lg shadow-xs flex items-center gap-4">
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

            {/* Mobile compact rows (hidden on desktop) */}
            <div className="md:hidden flex flex-col border-t border-border mt-2">
              <div className="compact-row flex items-center gap-3.5">
                <div className="w-8 h-8 bg-accent-light rounded flex items-center justify-center shrink-0">
                  <IconCamera size={18} className="text-accent" />
                </div>
                <p className="text-[15px] sm:text-[16px] text-ink font-medium leading-snug">
                  Live video stream over local Wi&#8209;Fi
                </p>
              </div>

              <div className="compact-row flex items-center gap-3.5">
                <div className="w-8 h-8 bg-accent-light rounded flex items-center justify-center shrink-0">
                  <IconSmile size={18} className="text-accent" />
                </div>
                <p className="text-[15px] sm:text-[16px] text-ink font-medium leading-snug">
                  Animated face with seven distinct moods
                </p>
              </div>

              <div className="compact-row flex items-center gap-3.5">
                <div className="w-8 h-8 bg-accent-light rounded flex items-center justify-center shrink-0">
                  <IconNavigation size={18} className="text-accent" />
                </div>
                <p className="text-[15px] sm:text-[16px] text-ink font-medium leading-snug">
                  Two powered wheels, three speeds
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 03 See ─────────────────────────────────────────────────────────

function SeeChapter({ isLiteMode = false }: { isLiteMode?: boolean }) {
  return (
    <section id="see" className="chapter min-h-screen flex items-start lg:items-center section relative">
      <div className="container-lg">
        {/* Mobile In-flow Stage */}
        <RobotStage chapter={3} className="robot-stage-default" isLiteMode={isLiteMode} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Text, Checks & Clean Illustrated Phone Mockup */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20">
            <ChapterLabel number="03" label="VISION" />
            <h2 className="mb-2 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              See where you want to&nbsp;be
            </h2>
            <p className="text-[15px] sm:text-lg leading-[22px] sm:leading-[28px] text-muted mb-4 sm:mb-8 text-balance max-w-[40ch]">
              Stream live video directly to your phone and look around in real time.
            </p>

            {/* Confirmed check items */}
            <ul className="space-y-2 sm:space-y-3 list-none p-0 mb-4 sm:mb-6">
              <li className="flex items-center gap-2.5 sm:gap-3">
                <IconCheck size={16} className="text-accent shrink-0 sm:w-[18px] sm:h-[18px]" />
                <span className="text-sm sm:text-base text-ink font-medium">Real-time live video view inside companion app</span>
              </li>
              <li className="flex items-center gap-2.5 sm:gap-3">
                <IconCheck size={16} className="text-accent shrink-0 sm:w-[18px] sm:h-[18px]" />
                <span className="text-sm sm:text-base text-ink font-medium">Battery and Wi&#8209;Fi status at a glance</span>
              </li>
            </ul>

            {/* LUMI Companion App Device Mockup (uncompressed, centered, up to 240px wide) */}
            <div className="phone-mockup-wrapper relative w-full max-w-[200px] sm:max-w-[240px] mx-auto lg:mx-0 my-3">
              <Image
                src="/drive1.png"
                alt="LUMI Companion App live video stream and touch driving controls"
                width={853}
                height={1844}
                className="w-full h-auto object-contain block select-none pointer-events-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                priority
              />
              <p className="text-[11px] font-mono text-muted text-center mt-2 tracking-wider uppercase leading-none">
                LUMI Companion App
              </p>
            </div>
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── 04 Talk ────────────────────────────────────────────────────────

function TalkChapter({ isLiteMode = false }: { isLiteMode?: boolean }) {
  return (
    <section id="talk" className="chapter min-h-screen flex items-start lg:items-center section bg-surface relative">
      <div className="container-lg">
        {/* Mobile In-flow Stage (renders with sound rings prop) */}
        <RobotStage chapter={4} className="robot-stage-default" isLiteMode={isLiteMode} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Reserved 3D Model Stage Space (Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />

          {/* Column 2: Text & Audio Cards/Rows */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20">
            <ChapterLabel number="04" label="VOICE" />
            <h2 className="mb-2 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Talk both ways
            </h2>
            <p className="text-[15px] sm:text-lg text-muted mb-4 sm:mb-8 leading-relaxed text-balance max-w-[40ch]">
              Two&#8209;way audio lets you hold a natural conversation through LUMI.
              Push&#8209;to&#8209;talk lets you speak on demand, while a lock option lets you speak hands&#8209;free.
            </p>

            {/* Desktop feature cards (hidden on mobile) */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="card p-5 h-auto min-h-0 bg-ground border border-border rounded-lg">
                <div className="w-8 h-8 mb-2 bg-accent-light rounded flex items-center justify-center">
                  <IconMicrophone size={18} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-ink">Push&#8209;to&#8209;Talk</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">Tap and hold to broadcast your voice instantly.</p>
              </div>
              <div className="card p-5 h-auto min-h-0 bg-ground border border-border rounded-lg">
                <div className="w-8 h-8 mb-2 bg-accent-light rounded flex items-center justify-center">
                  <IconSmile size={18} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-ink">Hands&#8209;Free Lock</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">Lock microphone open for natural conversation flow.</p>
              </div>
            </div>

            {/* Mobile compact rows (hidden on desktop) */}
            <div className="md:hidden flex flex-col border-t border-border mt-2 mb-3">
              <div className="compact-row flex items-center gap-3">
                <div className="w-8 h-8 bg-accent-light rounded flex items-center justify-center shrink-0">
                  <IconMicrophone size={18} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-ink leading-tight">Push&#8209;to&#8209;Talk</p>
              </div>
              <div className="compact-row flex items-center gap-3">
                <div className="w-8 h-8 bg-accent-light rounded flex items-center justify-center shrink-0">
                  <IconSmile size={18} className="text-accent" />
                </div>
                <p className="text-sm font-semibold text-ink leading-tight">Hands&#8209;Free Lock</p>
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
  preordersOpen = true,
  isLiteMode = false,
}: {
  activeMood: LumiMood;
  onMoodSelect: (m: LumiMood) => void;
  preordersOpen?: boolean;
  isLiteMode?: boolean;
}) {
  const moods: LumiMood[] = ['happy', 'neutral', 'sleep', 'angry', 'upset', 'sad', 'love'];

  return (
    <section id="express" className="chapter min-h-screen flex items-start lg:items-center section relative pb-4 sm:pb-20">
      <div className="container-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Title, Stage (mobile only), and Mood Buttons */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20">
            <ChapterLabel number="05" label="EXPRESSION" />
            <h2 className="mb-2 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Seven moods, one face
            </h2>

            {/* Mobile In-flow Stage (hidden on desktop via css) */}
            <RobotStage chapter={5} className="robot-stage-mood" activeMood={activeMood} isLiteMode={isLiteMode} />

            <p className="text-[15px] sm:text-lg text-muted mb-4 sm:mb-8 leading-relaxed text-balance max-w-[40ch]">
              LUMI's built&#8209;in display presents an expressive animated face with natural eyelids.
              Select any mood below to see LUMI's face change in real time.
            </p>

            {/* 4-column mood grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {moods.map((m) => {
                const isActive = m === activeMood;
                return (
                  <button
                    key={m}
                    data-mood={m}
                    type="button"
                    onClick={() => {
                      onMoodSelect(m);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('lumi:set-mood', { detail: m }));
                      }
                    }}
                    className={`btn min-h-[44px] capitalize transition-all cursor-pointer text-xs py-2 px-1 flex items-center justify-center font-medium ${
                      isActive ? 'btn-primary shadow-xs' : 'btn-secondary'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Caption showing current mood */}
            <p className="text-xs text-muted font-mono mb-4 sm:mb-8">
              Active face mood: <span className="text-accent font-semibold capitalize">{activeMood}</span>
            </p>

            {/* Pre-order / Waitlist CTA */}
            <div className="hidden sm:block">
              <Link
                href={preordersOpen ? '/preorder' : '/#preorder'}
                className="btn btn-primary btn-lg min-h-[48px] inline-flex items-center justify-center gap-2 no-underline cursor-pointer"
              >
                <span>{preordersOpen ? 'Pre-Order LUMI' : 'Join the waitlist'}</span>
                <IconArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── 06 Drive ───────────────────────────────────────────────────────

function DriveChapter({ isLiteMode = false }: { isLiteMode?: boolean }) {
  const [selectedSpeed, setSelectedSpeed] = useState('1.0x');

  return (
    <section id="drive" className="chapter min-h-screen flex items-start lg:items-center section bg-surface relative">
      <div className="container-lg">
        {/* Mobile In-flow Stage (renders with wheel turn & dotted trail) */}
        <RobotStage chapter={6} className="robot-stage-default" isLiteMode={isLiteMode} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Reserved 3D Model Stage Space (Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />

          {/* Column 2: Controls */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20">
            <ChapterLabel number="06" label="MOBILITY" />
            <h2 className="mb-2 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Drive from your phone
            </h2>
            <p className="text-[15px] sm:text-lg text-muted mb-4 sm:mb-8 leading-relaxed text-balance max-w-[40ch]">
              Steer with the on-screen joystick and choose from three speeds. Dual powered wheels navigate smoothly, with an on-screen stop button.
            </p>

            {/* Desktop speed chips & joystick card (hidden on mobile) */}
            <div className="hidden md:block">
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
                {PRODUCT_FACTS.drive.speedSettings.map((speed) => (
                  <div key={speed} className="card p-5 h-auto min-h-0 text-center bg-ground border border-border rounded-lg flex flex-col justify-center items-center">
                    <p className="text-2xl font-bold text-ink">{speed}</p>
                    <p className="text-xs text-muted font-mono mt-1">Speed</p>
                  </div>
                ))}
              </div>

              <div className="card p-5 h-auto min-h-0 bg-ground border border-border rounded-lg flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-surface rounded-full border border-border flex items-center justify-center shrink-0 relative shadow-inner">
                  <div className="w-7 h-7 bg-accent/20 rounded-full flex items-center justify-center border border-accent/40">
                    <div className="w-3.5 h-3.5 bg-accent rounded-full shadow-xs" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Touchscreen Joystick</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Intuitive touch steering with real-time responsive maneuvering.
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile speed tabs & compact row (hidden on desktop) */}
            <div className="md:hidden">
              <div className="p-1 min-h-[48px] bg-ground border border-border rounded-lg flex items-center justify-between mb-2">
                {PRODUCT_FACTS.drive.speedSettings.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setSelectedSpeed(speed)}
                    className={`flex-1 h-[40px] rounded flex items-center justify-center text-xs font-mono font-semibold transition-colors cursor-pointer border-none ${
                      speed === selectedSpeed
                        ? 'bg-surface text-ink shadow-xs border border-border font-bold'
                        : 'bg-transparent text-muted hover:text-ink'
                    }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>

              <div className="compact-row flex items-center gap-3.5 border-t border-border mb-3">
                <div className="w-8 h-8 bg-surface rounded-full border border-border flex items-center justify-center shrink-0">
                  <div className="w-3.5 h-3.5 bg-accent rounded-full shadow-xs" />
                </div>
                <p className="text-sm font-semibold text-ink leading-tight">Touchscreen Directional Joystick</p>
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

function PowerChapter({ isLiteMode = false }: { isLiteMode?: boolean }) {
  return (
    <section id="power" className="chapter min-h-screen flex items-start lg:items-center section relative" style={{ backgroundColor: 'var(--color-dark-bg)' }}>
      <div className="container-lg">
        {/* Mobile In-flow Stage with floor glow ring on dark background */}
        <RobotStage chapter={7} className="robot-stage-default" isLiteMode={isLiteMode} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Text & Battery Info (Left Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20">
            <ChapterLabel number="07" label="POWER" />
            <h2 className="mb-2 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold" style={{ color: 'var(--color-dark-text)' }}>
              Built to keep going
            </h2>
            <p className="text-[15px] sm:text-lg mb-4 sm:mb-8 leading-relaxed text-balance max-w-[40ch]" style={{ color: 'var(--color-dark-muted)' }}>
              LUMI runs on two rechargeable 18650 lithium&#8209;ion cells and recharges over USB&#8209;C.
            </p>

            {/* Desktop power spec cards: 3-col on desktop */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
              {/* Card 1: Cells */}
              <div
                className="p-4 rounded-xl border flex flex-col items-start transition-all duration-200"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="w-8 h-8 mb-2 bg-accent/20 rounded-lg flex items-center justify-center shrink-0">
                  <IconBattery size={18} className="text-accent" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold block">
                  CELLS
                </span>
                <p className="text-2xl font-bold mt-0.5 leading-none tracking-tight" style={{ color: 'var(--color-dark-text)' }}>
                  2×
                </p>
                <p className="text-[11px] font-mono mt-3 leading-tight" style={{ color: 'var(--color-dark-muted)' }}>
                  18650 Li&#8209;ion
                </p>
              </div>

              {/* Card 2: Charging */}
              <div
                className="p-4 rounded-xl border flex flex-col items-start transition-all duration-200"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="w-8 h-8 mb-2 bg-accent/20 rounded-lg flex items-center justify-center shrink-0">
                  <IconUsb size={18} className="text-accent" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold block">
                  PORT
                </span>
                <p className="text-2xl font-bold mt-0.5 leading-none tracking-tight" style={{ color: 'var(--color-dark-text)' }}>
                  USB&#8209;C
                </p>
                <p className="text-[11px] font-mono mt-3 leading-tight" style={{ color: 'var(--color-dark-muted)' }}>
                  Standard
                </p>
              </div>

              {/* Card 3: Chemistry */}
              <div
                className="p-4 rounded-xl border flex flex-col items-start transition-all duration-200"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="w-8 h-8 mb-2 bg-accent/20 rounded-lg flex items-center justify-center shrink-0">
                  <IconRefresh size={18} className="text-accent" />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold block">
                  TYPE
                </span>
                <p className="text-2xl font-bold mt-0.5 leading-none tracking-tight" style={{ color: 'var(--color-dark-text)' }}>
                  Li&#8209;ion
                </p>
                <p className="text-[11px] font-mono mt-3 leading-tight" style={{ color: 'var(--color-dark-muted)' }}>
                  Rechargeable
                </p>
              </div>
            </div>

            {/* Desktop confirmed spec highlights */}
            <div className="hidden md:block space-y-2 pt-2 border-t mb-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-dark-muted)' }}>
                <IconCheck size={14} className="text-accent shrink-0" />
                <span>Dual internal 18650 rechargeable battery configuration</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-dark-muted)' }}>
                <IconCheck size={14} className="text-accent shrink-0" />
                <span>Standard USB&#8209;C charging connector</span>
              </div>
            </div>

            {/* Mobile compact rows (hidden on desktop) */}
            <div className="md:hidden flex flex-col border-t border-white/10 mt-2 mb-3">
              <div className="compact-row-dark flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent/20 rounded flex items-center justify-center shrink-0">
                    <IconBattery size={18} className="text-accent" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-dark-text)' }}>Cells</span>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--color-dark-muted)' }}>2× 18650 Li&#8209;ion</span>
              </div>

              <div className="compact-row-dark flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent/20 rounded flex items-center justify-center shrink-0">
                    <IconUsb size={18} className="text-accent" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-dark-text)' }}>Charging Port</span>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--color-dark-muted)' }}>Standard USB&#8209;C</span>
              </div>

              <div className="compact-row-dark flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent/20 rounded flex items-center justify-center shrink-0">
                    <IconRefresh size={18} className="text-accent" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-dark-text)' }}>Chemistry</span>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--color-dark-muted)' }}>Rechargeable Li&#8209;ion</span>
              </div>
            </div>
          </div>

          {/* Column 2: Reserved 3D Model Stage Space (Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

// ─── 08 Specs ───────────────────────────────────────────────────────

function SpecsChapter({ isLiteMode = false }: { isLiteMode?: boolean }) {
  const confirmedSpecs = [
    { label: 'WHEELS', value: `${PRODUCT_FACTS.drive.wheelCount} powered wheels`, note: 'Dual-drive configuration' },
    { label: 'MOODS', value: '7 animated expressions', note: 'Built-in display' },
    { label: 'SPEEDS', value: PRODUCT_FACTS.drive.speedSettings.join(', '), note: 'App joystick control' },
    { label: 'CHARGING', value: PRODUCT_FACTS.power.chargingPort, note: 'Standard USB-C connector' },
    { label: 'CELLS', value: `${PRODUCT_FACTS.power.batteryCount} × 18650 Li-ion`, note: 'Rechargeable internal cells' },
  ];

  return (
    <section id="specs" className="chapter min-h-screen flex items-start lg:items-center section bg-surface relative">
      <div className="container-lg">
        {/* Mobile In-flow Stage */}
        <RobotStage chapter={8} className="robot-stage-default" isLiteMode={isLiteMode} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Reserved 3D Model Stage Space (Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 min-h-[500px] pointer-events-none" aria-hidden="true" />

          {/* Column 2: Confirmed Specs */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20">
            <ChapterLabel number="08" label="STATS" />
            <h2 className="mb-2 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
              Confirmed specifications
            </h2>
            <p className="text-[15px] sm:text-lg text-muted mb-4 sm:mb-8 leading-relaxed text-balance max-w-[40ch]">
              Core verified hardware parameters for the LUMI telepresence robot.
              More specifications will be published before pre-orders open.
            </p>

            {/* Desktop confirmed spec cards (hidden on mobile) */}
            <div className="hidden md:block space-y-3 mb-6">
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

            {/* Mobile compact rows (hidden on desktop) */}
            <dl className="md:hidden flex flex-col border-t border-border mt-2 mb-3">
              {confirmedSpecs.map((spec) => (
                <div key={spec.label} className="compact-row flex items-center justify-between">
                  <dt className="micro-label text-[11px]">{spec.label}</dt>
                  <dd className="text-sm font-semibold text-ink m-0">{spec.value}</dd>
                </div>
              ))}
            </dl>

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

function PreorderChapter({
  pricingApproved: propPricingApproved,
  preordersOpen: propPreordersOpen,
  depositPaise: propDepositPaise,
  productPricePaise: propProductPricePaise,
  shippingEstimate: propShippingEstimate,
  isLiteMode = false,
}: {
  pricingApproved?: boolean;
  preordersOpen?: boolean;
  depositPaise?: number;
  productPricePaise?: number;
  shippingEstimate?: string;
  isLiteMode?: boolean;
} = {}) {
  const [pricingApproved, setPricingApproved] = useState(propPricingApproved ?? false);
  const [preordersOpen, setPreordersOpen] = useState(propPreordersOpen ?? false);
  const [depositPaise, setDepositPaise] = useState(propDepositPaise ?? DEFAULT_PRICING.depositPaise);
  const [productPricePaise, setProductPricePaise] = useState(propProductPricePaise ?? DEFAULT_PRICING.pricePaise);
  const [shippingEstimate, setShippingEstimate] = useState(propShippingEstimate ?? DEFAULT_PRICING.shippingEstimate);

  // Sync props if passed
  useEffect(() => {
    if (typeof propPricingApproved === 'boolean') setPricingApproved(propPricingApproved);
    if (typeof propPreordersOpen === 'boolean') setPreordersOpen(propPreordersOpen);
    if (typeof propDepositPaise === 'number') setDepositPaise(propDepositPaise);
    if (typeof propProductPricePaise === 'number') setProductPricePaise(propProductPricePaise);
    if (typeof propShippingEstimate === 'string') setShippingEstimate(propShippingEstimate);
  }, [propPricingApproved, propPreordersOpen, propDepositPaise, propProductPricePaise, propShippingEstimate]);

  // Waitlist form state
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [waitlistMessage, setWaitlistMessage] = useState('');

  // Fetch settings to decide Waitlist vs Pre-order state if not provided
  useEffect(() => {
    if (propPreordersOpen !== undefined && propPricingApproved !== undefined) return;
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (typeof data.pricingApproved === 'boolean') setPricingApproved(data.pricingApproved);
          if (typeof data.preordersOpen === 'boolean') setPreordersOpen(data.preordersOpen);
          if (typeof data.depositPaise === 'number') setDepositPaise(data.depositPaise);
          if (typeof data.productPricePaise === 'number') setProductPricePaise(data.productPricePaise);
          if (typeof data.shippingEstimate === 'string') setShippingEstimate(data.shippingEstimate);
        }
      })
      .catch(() => {});
  }, [propPreordersOpen, propPricingApproved]);

  const depositText = formatPrice(depositPaise);
  const priceText = formatPrice(productPricePaise);
  const balancePaise = getBalancePaise(productPricePaise, depositPaise);
  const balanceText = balancePaise ? formatPrice(balancePaise) : '₹45,000';

  // FAQ accordion state
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenFAQ((current) => (current === id ? null : id));
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes('@')) {
      setWaitlistStatus('error');
      setWaitlistMessage('Please enter a valid email address.');
      return;
    }

    setWaitlistStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: waitlistEmail,
          name: waitlistName || undefined,
          marketingConsent: true,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to join waitlist');
      }

      setWaitlistStatus('success');
      setWaitlistMessage('You have joined the LUMI waitlist. We will notify you when pre-orders open.');
      setWaitlistEmail('');
      setWaitlistName('');
    } catch {
      setWaitlistStatus('error');
      setWaitlistMessage('Could not connect. Please try again.');
    }
  };

  return (
    <section id="preorder" className="chapter min-h-screen flex items-start lg:items-center section relative">
      <div className="container-lg">
        {/* Mobile In-flow Stage */}
        <RobotStage chapter={9} className="robot-stage-default" isLiteMode={isLiteMode} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Column 1: Order / Waitlist Module (Left Half: 5 cols) */}
          <div className="lg:col-span-5 max-w-[520px] relative z-20 preorder-form-container">
            {pricingApproved && preordersOpen ? (
              // Pre-Order Reservation Card (Only when approved in Settings)
              <>
                <ChapterLabel number="09" label="ORDER" />
                <h2 className="mb-2 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
                  Reserve your LUMI
                </h2>
                <p className="text-sm sm:text-base text-muted mb-4 leading-normal text-balance max-w-[40ch]">
                  Secure priority delivery with a {depositText} refundable deposit.
                </p>

                <div className="bg-surface border border-border rounded-lg p-3 sm:p-6 mb-2 shadow-sm">
                  <div className="space-y-1.5 text-xs text-muted mb-2.5 border-b border-border pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">Deposit Today</span>
                      <span className="font-bold text-accent text-sm">{depositText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Full Robot Price</span>
                      <span className="font-semibold text-ink">{priceText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estimated Delivery</span>
                      <span className="font-semibold text-ink">{shippingEstimate || 'Q3 2026'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Balance on Dispatch</span>
                      <span className="font-semibold text-ink">{balanceText}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Link
                      href="/preorder"
                      className="btn btn-primary w-full text-center justify-center py-2 text-sm sm:text-base no-underline inline-flex items-center gap-2 group cursor-pointer min-h-[44px] font-semibold"
                    >
                      <span>Pre-Order LUMI Now</span>
                      <IconArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                    <p className="text-[11px] text-muted text-center pt-0.5 leading-tight">
                      100% refundable prior to dispatch • <Link href="/refund-policy" className="underline hover:text-ink">Refund Policy</Link>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              // Waitlist State (Shown while pricing is unapproved / pre-orders closed)
              <>
                <ChapterLabel number="09" label="WAITLIST" />
                <h2 className="mb-4 sm:mb-6 text-balance text-2xl sm:text-3xl lg:text-4xl font-bold text-ink">
                  Join the LUMI waitlist
                </h2>
                <p className="text-base sm:text-lg text-muted mb-6 leading-relaxed text-balance max-w-[40ch]">
                  Be first in line when production reservations open. Verified pricing, delivery windows, and full specifications will be published before public deposits open.
                </p>

                <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 mb-8 shadow-sm">
                  {waitlistStatus === 'success' ? (
                    <div className="py-4 text-center">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <IconCheck size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-ink mb-1">You are on the list!</h3>
                      <p className="text-sm text-muted mb-4">{waitlistMessage}</p>
                      <button
                        type="button"
                        onClick={() => setWaitlistStatus('idle')}
                        className="btn btn-secondary btn-sm"
                      >
                        Add another email
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleWaitlistSubmit} className="space-y-3.5">
                      <div>
                        <label htmlFor="waitlist-email" className="block text-xs font-mono uppercase text-muted mb-1">
                          Email Address *
                        </label>
                        <input
                          id="waitlist-email"
                          type="email"
                          required
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="input min-h-[44px]"
                          disabled={waitlistStatus === 'loading'}
                        />
                      </div>

                      <div>
                        <label htmlFor="waitlist-name" className="block text-xs font-mono uppercase text-muted mb-1">
                          Your Name (Optional)
                        </label>
                        <input
                          id="waitlist-name"
                          type="text"
                          value={waitlistName}
                          onChange={(e) => setWaitlistName(e.target.value)}
                          placeholder="Anmol"
                          className="input min-h-[44px]"
                          disabled={waitlistStatus === 'loading'}
                        />
                      </div>

                      {waitlistStatus === 'error' && (
                        <p className="text-xs text-red-600 font-medium">{waitlistMessage}</p>
                      )}

                      <button
                        type="submit"
                        disabled={waitlistStatus === 'loading'}
                        className="btn btn-primary w-full min-h-[48px] justify-center text-center font-semibold cursor-pointer"
                      >
                        {waitlistStatus === 'loading' ? 'Joining...' : 'Join the Waitlist'}
                      </button>

                      <p className="text-[11px] text-muted text-center leading-normal">
                        Zero spam. We will only notify you about LUMI pre-order availability.
                      </p>
                    </form>
                  )}
                </div>
              </>
            )}

            {/* Accessible FAQ Accordion (Desktop only) */}
            <div className="hidden md:block border-t border-border pt-8 sm:pt-12">
              <h3 className="text-xl font-bold text-ink mb-6 sm:mb-8">
                Frequently asked questions
              </h3>

              <div className="space-y-4" role="region" aria-label="FAQ Accordion">
                {FAQ_ITEMS.map((item) => {
                  const isOpen = openFAQ === item.id;
                  return (
                    <div key={item.id} className="border-b border-border/80 pb-4">
                      <button
                        type="button"
                        onClick={() => toggleFAQ(item.id)}
                        aria-expanded={isOpen}
                        aria-controls={`${item.id}-answer`}
                        id={`${item.id}-question`}
                        className="w-full text-left flex items-center justify-between gap-4 cursor-pointer bg-transparent border-none p-0 group min-h-[44px]"
                      >
                        <span className="text-[18px] sm:text-[20px] font-semibold text-ink group-hover:text-accent transition-colors">
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
                          className="mt-3 text-[16px] text-muted leading-[1.6]"
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

          {/* Column 2: Reserved 3D Model Stage Space (Desktop only) */}
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

  // Unified Pre-Order & Store Settings State
  const [preordersOpen, setPreordersOpen] = useState(DEFAULT_PRICING.preordersOpen);
  const [pricingApproved, setPricingApproved] = useState(false);
  const [depositPaise, setDepositPaise] = useState(DEFAULT_PRICING.depositPaise);
  const [productPricePaise, setProductPricePaise] = useState(DEFAULT_PRICING.pricePaise);
  const [shippingEstimate, setShippingEstimate] = useState(DEFAULT_PRICING.shippingEstimate);

  // Low-end device Lite mode detection
  const isLiteMode = useIsLowEndDevice();

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (typeof data.preordersOpen === 'boolean') setPreordersOpen(data.preordersOpen);
          if (typeof data.pricingApproved === 'boolean') setPricingApproved(data.pricingApproved);
          if (typeof data.depositPaise === 'number') setDepositPaise(data.depositPaise);
          if (typeof data.productPricePaise === 'number') setProductPricePaise(data.productPricePaise);
          if (typeof data.shippingEstimate === 'string') setShippingEstimate(data.shippingEstimate);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const chapterIds = ['hero', 'meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];

    const observer = new IntersectionObserver(
      (entries) => {
        // If near the very top of the page, hero (chapter 1) always wins
        if (typeof window !== 'undefined' && window.scrollY < 80) {
          setActiveChapter(1);
          return;
        }

        // Find the intersecting chapter closest to the viewport vertical center
        let bestChapter = -1;
        let bestDist = Infinity;
        const winMid = window.innerHeight * 0.5;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = chapterIds.indexOf(entry.target.id);
            if (index !== -1) {
              const r = entry.boundingClientRect;
              const mid = r.top + r.height * 0.5;
              const dist = Math.abs(mid - winMid);
              if (dist < bestDist) {
                bestDist = dist;
                bestChapter = index + 1;
              }
            }
          }
        });

        if (bestChapter !== -1) {
          setActiveChapter(bestChapter);

          if (bestChapter !== 5) {
            setChapter5Mood('happy');
            const defaultMood = CHAPTER_DEFAULT_MOODS[bestChapter] || 'happy';
            window.dispatchEvent(new CustomEvent('lumi:set-mood', { detail: defaultMood }));
          }
        }
      },
      {
        threshold: 0.20,
      }
    );

    chapterIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const handleScroll = () => {
      setScrollPastHero(window.scrollY > window.innerHeight * 0.45);
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
      {/* Chapter Indicator: 01 to 09 on desktop page edge */}
      <ChapterIndicator activeChapter={activeChapter} />

      {/* Fixed 3D Canvas / Mobile Robot Dock */}
      <LumiScene activeChapter={activeChapter} mood={sceneMood} />

      {/* Mobile story wrapper gives page content top padding equal to --header-h on mobile */}
      <div className="mobile-story-wrapper relative z-10">
        <HeroChapter preordersOpen={preordersOpen} isLiteMode={isLiteMode} />
        <MeetChapter isLiteMode={isLiteMode} />
        <SeeChapter isLiteMode={isLiteMode} />
        <TalkChapter isLiteMode={isLiteMode} />
        <ExpressChapter
          activeMood={chapter5Mood}
          onMoodSelect={handleChapter5MoodSelect}
          preordersOpen={preordersOpen}
          isLiteMode={isLiteMode}
        />
        <DriveChapter isLiteMode={isLiteMode} />
        <PowerChapter isLiteMode={isLiteMode} />
        <SpecsChapter isLiteMode={isLiteMode} />
        <PreorderChapter
          preordersOpen={preordersOpen}
          pricingApproved={pricingApproved}
          depositPaise={depositPaise}
          productPricePaise={productPricePaise}
          shippingEstimate={shippingEstimate}
          isLiteMode={isLiteMode}
        />
      </div>

      {/* Mobile bottom CTA bar driven from unified preordersOpen */}
      <MobileCTABar
        visible={scrollPastHero}
        activeChapter={activeChapter}
        preordersOpen={preordersOpen}
        pricingApproved={pricingApproved}
        depositPaise={depositPaise}
      />
    </>
  );
}
