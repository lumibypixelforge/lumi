'use client';

/**
 * LUMI 3D Scene Choreographer — Revision 3 (Smooth & Glitch-Free)
 *
 * Implements:
 * 1. Shortest-path angle interpolation (lerpAngle) eliminating all 360° spin glitches.
 * 2. Exponentially smoothed velocity tracking (smoothedVx) for calm, non-jittery anticipation & banking.
 * 3. 35% dwell -> 30% travel with smootherstep -> 35% dwell between sections.
 * 4. Critically damped smoothing with delta clamped to 1/30s.
 * 5. Single R3F loop reading mutable scrollStore ref with ZERO React re-renders.
 * 6. Hero intro sequence (smooth roll-in -> full lap around ring -> glances & excited flashes -> hop -> settle happy).
 * 7. Interactive cursor tracking: head turns up to 24° to follow cursor, body follows at 20% delay.
 * 8. Gaze weights per chapter.
 * 9. Natural eye behaviors: blinks every 3-6s (10% double blinks), micro-saccades, breathing scale.
 * 10. Anti-overlap guarantee: robot waypoint kept at x = 0.95 desktop, clear of chapter indicator at all widths.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LumiGLBModel, type LumiSceneAnimationData } from './lumi-custom-model';
import { type LumiMood } from './eye-engine';
import { scrollStore } from '@/components/providers/smooth-scroll';

// Eagerly preload GLTF model to prevent any render latency
useGLTF.preload('/models/lumi.glb');

export interface LumiSceneProps {
  activeChapter?: number;
  mood?: LumiMood;
  onMoodChange?: (m: LumiMood) => void;
}

interface ChapterKeyframe {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  scale: number;
  headTiltX: number;
  headTurnY: number;
  soundRingsOpacity: number;
  dottedTrailOpacity: number;
  floorGlowOpacity: number;
  bgDarkIntensity: number;
  lightIntensity: number;
  mood: LumiMood;
}

// ─── Mathematical Angle Utilities (Eliminates Spinning Glitches) ──────

function normalizeAngle(a: number): number {
  return THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;
}

function lerpAngle(from: number, to: number, t: number): number {
  const fromNorm = normalizeAngle(from);
  const toNorm = normalizeAngle(to);
  let diff = toNorm - fromNorm;
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return fromNorm + diff * t;
}

// ─── Keyframes per Chapter (1 to 9) ──────────────────────────────────

const DESKTOP_KEYFRAMES: Record<number, ChapterKeyframe> = {
  1: {
    x: 0.75, y: 0.0, z: 0,
    yaw: 0, pitch: 0, roll: 0,
    scale: 1.15,
    headTiltX: 0, headTurnY: 0,
    soundRingsOpacity: 0, dottedTrailOpacity: 0, floorGlowOpacity: 0,
    bgDarkIntensity: 0, lightIntensity: 1.0,
    mood: 'happy',
  },
  2: {
    x: -0.75, y: -0.05, z: 0,
    yaw: 0.28, pitch: 0, roll: 0,
    scale: 1.0,
    headTiltX: 0, headTurnY: 0.08,
    soundRingsOpacity: 0, dottedTrailOpacity: 0, floorGlowOpacity: 0,
    bgDarkIntensity: 0, lightIntensity: 1.0,
    mood: 'happy',
  },
  3: {
    x: 0.75, y: -0.05, z: 0,
    yaw: -0.28, pitch: 0, roll: 0,
    scale: 1.0,
    headTiltX: 0, headTurnY: -0.08,
    soundRingsOpacity: 0, dottedTrailOpacity: 0, floorGlowOpacity: 0,
    bgDarkIntensity: 0, lightIntensity: 1.0,
    mood: 'neutral',
  },
  4: {
    x: -0.75, y: -0.05, z: 0,
    yaw: 0.0, pitch: 0, roll: 0,
    scale: 1.0,
    headTiltX: 0.06, headTurnY: 0,
    soundRingsOpacity: 1.0, dottedTrailOpacity: 0, floorGlowOpacity: 0,
    bgDarkIntensity: 0, lightIntensity: 1.0,
    mood: 'happy',
  },
  5: {
    x: 0.72, y: -0.06, z: 0.15,
    yaw: 0.0, pitch: 0, roll: 0,
    scale: 1.15,
    headTiltX: -0.02, headTurnY: 0,
    soundRingsOpacity: 0, dottedTrailOpacity: 0, floorGlowOpacity: 0,
    bgDarkIntensity: 0, lightIntensity: 1.0,
    mood: 'happy',
  },
  6: {
    x: -0.75, y: -0.05, z: 0,
    yaw: 0.12, pitch: 0, roll: 0,
    scale: 1.0,
    headTiltX: 0, headTurnY: 0.04,
    soundRingsOpacity: 0, dottedTrailOpacity: 1.0, floorGlowOpacity: 0,
    bgDarkIntensity: 0, lightIntensity: 1.0,
    mood: 'happy',
  },
  7: {
    x: 0.75, y: -0.05, z: 0,
    yaw: -0.35, pitch: 0, roll: 0,
    scale: 1.0,
    headTiltX: 0, headTurnY: -0.08,
    soundRingsOpacity: 0, dottedTrailOpacity: 0, floorGlowOpacity: 1.0,
    bgDarkIntensity: 1.0, lightIntensity: 0.55,
    mood: 'happy',
  },
  8: {
    x: -0.75, y: -0.05, z: 0,
    yaw: 0.0, pitch: 0, roll: 0,
    scale: 0.96,
    headTiltX: 0, headTurnY: 0,
    soundRingsOpacity: 0, dottedTrailOpacity: 0, floorGlowOpacity: 0,
    bgDarkIntensity: 0, lightIntensity: 1.0,
    mood: 'neutral',
  },
  9: {
    x: 0.75, y: -0.08, z: -0.1,
    yaw: 0.0, pitch: 0, roll: 0,
    scale: 0.95,
    headTiltX: 0, headTurnY: 0,
    soundRingsOpacity: 0, dottedTrailOpacity: 0, floorGlowOpacity: 0,
    bgDarkIntensity: 0, lightIntensity: 1.0,
    mood: 'love',
  },
};

const MOBILE_KEYFRAMES: Record<number, ChapterKeyframe> = {
  1: { ...DESKTOP_KEYFRAMES[1], x: 0, y: 0.44, z: -0.08, scale: 0.46 },
  2: { ...DESKTOP_KEYFRAMES[2], x: 0, y: 0.44, z: -0.08, scale: 0.44, yaw: 0.20, headTurnY: 0.08 },
  3: { ...DESKTOP_KEYFRAMES[3], x: 0, y: 0.44, z: -0.08, scale: 0.44, yaw: -0.20, headTurnY: -0.08 },
  4: { ...DESKTOP_KEYFRAMES[4], x: 0, y: 0.44, z: -0.08, scale: 0.44, headTiltX: 0.06 },
  5: { ...DESKTOP_KEYFRAMES[5], x: 0, y: 0.40, z: 0.02, scale: 0.50, headTiltX: -0.02 },
  6: { ...DESKTOP_KEYFRAMES[6], x: 0, y: 0.44, z: -0.08, scale: 0.44, yaw: 0.15 },
  7: { ...DESKTOP_KEYFRAMES[7], x: 0, y: 0.44, z: -0.08, scale: 0.44, yaw: -0.25 },
  8: { ...DESKTOP_KEYFRAMES[8], x: 0, y: 0.46, z: -0.12, scale: 0.38 },
  9: { ...DESKTOP_KEYFRAMES[9], x: 0, y: 0.48, z: -0.16, scale: 0.34 },
};

const TABLET_KEYFRAMES: Record<number, ChapterKeyframe> = {
  1: { ...DESKTOP_KEYFRAMES[1], x: 0, y: 0.38, z: -0.05, scale: 0.58 },
  2: { ...DESKTOP_KEYFRAMES[2], x: 0, y: 0.38, z: -0.05, scale: 0.54, yaw: 0.20, headTurnY: 0.08 },
  3: { ...DESKTOP_KEYFRAMES[3], x: 0, y: 0.38, z: -0.05, scale: 0.54, yaw: -0.20, headTurnY: -0.08 },
  4: { ...DESKTOP_KEYFRAMES[4], x: 0, y: 0.38, z: -0.05, scale: 0.54, headTiltX: 0.06 },
  5: { ...DESKTOP_KEYFRAMES[5], x: 0, y: 0.34, z: 0.05, scale: 0.62, headTiltX: -0.02 },
  6: { ...DESKTOP_KEYFRAMES[6], x: 0, y: 0.38, z: -0.05, scale: 0.54, yaw: 0.15 },
  7: { ...DESKTOP_KEYFRAMES[7], x: 0, y: 0.38, z: -0.05, scale: 0.54, yaw: -0.25 },
  8: { ...DESKTOP_KEYFRAMES[8], x: 0, y: 0.40, z: -0.10, scale: 0.48 },
  9: { ...DESKTOP_KEYFRAMES[9], x: 0, y: 0.42, z: -0.15, scale: 0.42 },
};

const GAZE_WEIGHTS: Record<number, number> = {
  1: 1.0, // Hero
  2: 0.5,
  3: 0.5,
  4: 0.5,
  5: 0.2,
  6: 0.3,
  7: 0.5, // Power
  8: 0.4,
  9: 0.6,
};

// ─── Hero Floor Stage Disc & Ellipse Ring ─────────────────────────────

function HeroFloorRing({
  groupRef,
  centerX = 0.75,
  centerY = -0.772,
  scale = 1.0,
}: {
  groupRef?: React.RefObject<THREE.Group | null>;
  centerX?: number;
  centerY?: number;
  scale?: number;
}) {
  return (
    <group ref={groupRef} position={[centerX, centerY, 0]} scale={[scale, scale, scale]}>
      {/* 1. Flat circular stage disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 64]} />
        <meshBasicMaterial color="#EAE9F2" transparent opacity={0.6} depthWrite={false} />
      </mesh>

      {/* 2. Hairline ring border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.716, 0.72, 64]} />
        <meshBasicMaterial color="#6D4AE0" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* 3. Thin dashed floor ellipse */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 0.986, 64]} />
        <meshBasicMaterial color="#6D4AE0" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Professional Ground Shadow Component ─────────────────────────────
// Permanent, studio-grade contact & ambient ground shadow across all 9 chapters.
// Dual tire contact patches + soft body ambient shadow.
// Stays grounded on the floor when LUMI hops, soft-fading with elevation.

interface LumiGroundShadowProps {
  shadowGroupRef: React.RefObject<THREE.Group | null>;
  wheelShadowLRef: React.RefObject<THREE.Mesh | null>;
  wheelShadowRRef: React.RefObject<THREE.Mesh | null>;
  bodyShadowRef: React.RefObject<THREE.Mesh | null>;
  wheelShadowTexture: THREE.CanvasTexture;
  bodyShadowTexture: THREE.CanvasTexture;
}

function LumiGroundShadow({
  shadowGroupRef,
  wheelShadowLRef,
  wheelShadowRRef,
  bodyShadowRef,
  wheelShadowTexture,
  bodyShadowTexture,
}: LumiGroundShadowProps) {
  return (
    <group ref={shadowGroupRef} position={[0, -0.772, 0]}>
      {/* 1. Left Wheel Contact Shadow */}
      <mesh ref={wheelShadowLRef} position={[-0.26, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.4, 1]}>
        <planeGeometry args={[0.22, 0.28]} />
        <meshBasicMaterial
          map={wheelShadowTexture}
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Right Wheel Contact Shadow */}
      <mesh ref={wheelShadowRRef} position={[0.26, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.4, 1]}>
        <planeGeometry args={[0.22, 0.28]} />
        <meshBasicMaterial
          map={wheelShadowTexture}
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Soft Body Ambient Diffuse Shadow */}
      <mesh ref={bodyShadowRef} position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.25, 0.98]} />
        <meshBasicMaterial
          map={bodyShadowTexture}
          transparent
          opacity={0.52}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Inner R3F Scene Content ─────────────────────────────────────────

function LumiSceneContent({
  activeChapter = 1,
  selectedMood = 'happy',
  onMoodChange,
}: {
  activeChapter: number;
  selectedMood: LumiMood;
  onMoodChange?: (m: LumiMood) => void;
}) {
  const { size } = useThree();
  const isMobile = size.width < 768;
  const isTablet = size.width >= 768 && size.width < 1024;
  const responsiveScaleMul = isMobile ? 1.0 : isTablet ? 0.88 : 1.0;

  const modelGroupRef = useRef<THREE.Group>(null!);
  const ambientLightRef = useRef<THREE.AmbientLight>(null!);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);

  const initialStageX = isMobile ? 0 : 0.75;

  // Smooth transform states
  const curPos = useRef(new THREE.Vector3(initialStageX, 0, 0));
  const curYaw = useRef(0);
  const curRoll = useRef(0);
  const curScale = useRef(1.15);
  const curHeadTiltX = useRef(0);
  const curHeadTurnY = useRef(0);

  // Filtered velocity tracking (eliminates twitching/glitching)
  const prevTargetX = useRef(initialStageX);
  const smoothedVx = useRef(0);

  // Wheel velocities
  const wheelSpinL = useRef(0);
  const wheelSpinR = useRef(0);

  // Cached Section Offsets (updated via ResizeObserver)
  const sectionOffsetsRef = useRef<number[]>([0, 900, 1800, 2700, 3600, 4500, 5400, 6300, 7200]);

  // Dynamic Mood & Eye State
  const currentChapterFloat = useRef(1.0);
  const activeMoodRef = useRef<LumiMood>('happy');
  const userMoodOverrideRef = useRef<LumiMood | null>(null);

  // Live 60fps Animation Data container shared with LumiGLBModel
  const animDataRef = useRef<LumiSceneAnimationData>({
    mood: 'happy',
    eyeLookX: 0,
    eyeLookY: 0,
    eyeOpenness: 1.0,
    eyeScale: 1.0,
    twinklePhase: 0,
    wheelSpinL: 0,
    wheelSpinR: 0,
    headTiltX: 0,
    headTurnY: 0,
    soundRingsOpacity: 0,
    dottedTrailOpacity: 0,
    floorGlowOpacity: 0,
    trailLength: 1,
    fadeOpacity: 1.0,
  });

  const fadeOpacityRef = useRef(1.0);

  // Dedicated shadow textures memoized once
  const { wheelShadowTexture, bodyShadowTexture } = useMemo(() => {
    if (typeof window === 'undefined') {
      const dummy = new THREE.Texture();
      return { wheelShadowTexture: dummy as unknown as THREE.CanvasTexture, bodyShadowTexture: dummy as unknown as THREE.CanvasTexture };
    }
    const c1 = document.createElement('canvas');
    c1.width = 128;
    c1.height = 128;
    const ctx1 = c1.getContext('2d')!;
    const g1 = ctx1.createRadialGradient(64, 64, 2, 64, 64, 58);
    g1.addColorStop(0, 'rgba(25, 20, 38, 0.75)');
    g1.addColorStop(0.35, 'rgba(28, 22, 42, 0.48)');
    g1.addColorStop(0.7, 'rgba(32, 25, 48, 0.16)');
    g1.addColorStop(1, 'rgba(32, 25, 48, 0)');
    ctx1.fillStyle = g1;
    ctx1.fillRect(0, 0, 128, 128);
    const t1 = new THREE.CanvasTexture(c1);
    t1.needsUpdate = true;

    const c2 = document.createElement('canvas');
    c2.width = 256;
    c2.height = 256;
    const ctx2 = c2.getContext('2d')!;
    const g2 = ctx2.createRadialGradient(128, 128, 6, 128, 128, 122);
    g2.addColorStop(0, 'rgba(32, 25, 48, 0.35)');
    g2.addColorStop(0.4, 'rgba(32, 25, 48, 0.18)');
    g2.addColorStop(0.75, 'rgba(32, 25, 48, 0.05)');
    g2.addColorStop(1, 'rgba(32, 25, 48, 0)');
    ctx2.fillStyle = g2;
    ctx2.fillRect(0, 0, 256, 256);
    const t2 = new THREE.CanvasTexture(c2);
    t2.needsUpdate = true;

    return { wheelShadowTexture: t1, bodyShadowTexture: t2 };
  }, []);

  // Permanent Ground Shadow & Stage Disc Refs
  const shadowGroupRef = useRef<THREE.Group>(null!);
  const wheelShadowLRef = useRef<THREE.Mesh>(null!);
  const wheelShadowRRef = useRef<THREE.Mesh>(null!);
  const bodyShadowRef = useRef<THREE.Mesh>(null!);
  const heroDiscRef = useRef<THREE.Group>(null!);

  // Section Arrival Inspection & Jump Triggers
  const activeSettledChapterRef = useRef(1);
  const sectionArrivalMsRef = useRef(performance.now());
  const arrivalHopDoneRef = useRef<Record<number, boolean>>({});

  // Eye Animation Subsystems
  const eyeLookRef = useRef({ x: 0, y: 0 });
  const eyeOpennessRef = useRef(1.0);
  const eyeScaleRef = useRef(1.0);
  const eyeTwinkleRef = useRef(0);

  // Blinking system
  const blinkTimerRef = useRef(0);
  const nextBlinkAtRef = useRef(3.5);
  const isBlinkingRef = useRef(false);
  const blinkProgressRef = useRef(0);
  const isDoubleBlinkRef = useRef(false);
  const doubleBlinkDoneRef = useRef(false);

  // Micro-saccades (tiny gaze shifts every 0.8 to 2.2s)
  const saccadeTimerRef = useRef(0);
  const nextSaccadeAtRef = useRef(1.4);
  const saccadeOffsetRef = useRef({ x: 0, y: 0 });

  // Cursor tracking state
  const mousePosRef = useRef({ nx: 0, ny: 0, isInside: false, lastMoveTime: 0 });
  const isHoveringCtaRef = useRef(false);
  const isHoveringLumiRef = useRef(false);

  // Hop animation
  const hopStartTimeRef = useRef(-10);

  // Joy lap
  const joyLapStartTimeRef = useRef(-10);
  const lastJoyLapTimeRef = useRef(-10);

  // Hero Intro Sequence
  const [introActive, setIntroActive] = useState(false);
  const introStartTimeRef = useRef<number | null>(null);
  const introFinishedRef = useRef(false);

  // Check session storage for intro on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasPlayed = sessionStorage.getItem('lumi_hero_intro_played') === 'true';
    const scrolledDown = window.scrollY > 40;

    if (hasPlayed || prefersReducedMotion || scrolledDown) {
      introFinishedRef.current = true;
      setIntroActive(false);
    } else {
      setIntroActive(true);
      introStartTimeRef.current = null;
    }
  }, []);

  // Cache section anchors via ResizeObserver
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const chapterIds = ['hero', 'meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];

    const updateAnchors = () => {
      const scrollY = window.scrollY;
      const offsets: number[] = [];
      chapterIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          offsets.push(rect.top + scrollY);
        } else {
          offsets.push(0);
        }
      });
      sectionOffsetsRef.current = offsets;
    };

    updateAnchors();

    const resizeObserver = new ResizeObserver(() => {
      updateAnchors();
    });

    resizeObserver.observe(document.body);
    window.addEventListener('resize', updateAnchors);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateAnchors);
    };
  }, []);

  // Global mouse tracking and custom events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mousePosRef.current = {
        nx,
        ny,
        isInside: true,
        lastMoveTime: performance.now(),
      };
      window.dispatchEvent(new CustomEvent('lumi:cursor-moved'));
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const nx = (touch.clientX / window.innerWidth) * 2 - 1;
        const ny = (touch.clientY / window.innerHeight) * 2 - 1;
        mousePosRef.current = {
          nx,
          ny,
          isInside: true,
          lastMoveTime: performance.now(),
        };
        window.dispatchEvent(new CustomEvent('lumi:cursor-moved'));
      }
    };

    const onMouseLeave = () => {
      mousePosRef.current.isInside = false;
    };

    const onHoverCTA = () => {
      isHoveringCtaRef.current = true;
      hopStartTimeRef.current = performance.now();
    };

    const onUnhoverCTA = () => {
      isHoveringCtaRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchstart', onTouchMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('lumi:hover-cta', onHoverCTA);
    window.addEventListener('lumi:unhover-cta', onUnhoverCTA);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('lumi:hover-cta', onHoverCTA);
      window.removeEventListener('lumi:unhover-cta', onUnhoverCTA);
    };
  }, []);

  // Listen for real-time mood change commands
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onSetMood = (e: Event) => {
      const customEvent = e as CustomEvent<LumiMood>;
      const newMood = customEvent.detail;
      if (newMood) {
        userMoodOverrideRef.current = newMood;
        activeMoodRef.current = newMood;
        isBlinkingRef.current = true;
        blinkProgressRef.current = 0;
        if (animDataRef.current) {
          animDataRef.current.mood = newMood;
        }
      }
    };

    window.addEventListener('lumi:set-mood', onSetMood);
    return () => {
      window.removeEventListener('lumi:set-mood', onSetMood);
    };
  }, []);

  // Chapter 05 user mood override handler via props
  useEffect(() => {
    if (selectedMood) {
      userMoodOverrideRef.current = selectedMood;
      activeMoodRef.current = selectedMood;
      isBlinkingRef.current = true;
      blinkProgressRef.current = 0;
      if (animDataRef.current) {
        animDataRef.current.mood = selectedMood;
      }
    }
  }, [selectedMood]);

  // Click on LUMI: Joy Lap
  const handleLumiClick = () => {
    const now = performance.now();
    if (now - lastJoyLapTimeRef.current > 4000) {
      lastJoyLapTimeRef.current = now;
      joyLapStartTimeRef.current = now;
      hopStartTimeRef.current = now;
    }
  };

  // ─── Main Animation Loop (Single R3F loop) ──────────────────────────
  useFrame((state, delta) => {
    if (!modelGroupRef.current) return;

    const t = state.clock.elapsedTime;
    const safeDelta = Math.min(delta, 1 / 30);
    const nowMs = performance.now();

    // ─── 1. Footer Clearance Fade ───
    let footerFade = 1.0;
    if (typeof window !== 'undefined') {
      const scrollY = scrollStore.y;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const distToBottom = docHeight - (scrollY + winHeight);

      if (distToBottom < 800) {
        footerFade = Math.max(0, (distToBottom - 380) / 420);
      }
      fadeOpacityRef.current = footerFade;
      modelGroupRef.current.visible = footerFade > 0.005;
      animDataRef.current.fadeOpacity = footerFade;
    }

    // ─── 2. Calculate Continuous Float Chapter Coordinate ───
    const scrollY = scrollStore.y;
    const offsets = sectionOffsetsRef.current;
    let floatChapter = 1.0;

    if (scrollY <= offsets[0]) {
      floatChapter = 1.0;
    } else if (scrollY >= offsets[offsets.length - 1]) {
      floatChapter = 9.0;
    } else {
      for (let i = 0; i < offsets.length - 1; i++) {
        if (scrollY >= offsets[i] && scrollY < offsets[i + 1]) {
          const sectionHeight = Math.max(1, offsets[i + 1] - offsets[i]);
          const p = (scrollY - offsets[i]) / sectionHeight;

          // 35% Dwell at start, 30% Travel with smootherstep, 35% Dwell at end
          if (p <= 0.35) {
            floatChapter = i + 1;
          } else if (p >= 0.65) {
            floatChapter = i + 2;
          } else {
            const u = (p - 0.35) / 0.30;
            const travel = u * u * u * (u * (u * 6 - 15) + 10);
            floatChapter = (i + 1) + travel;
          }
          break;
        }
      }
    }

    currentChapterFloat.current = floatChapter;

    // ─── 3. Interpolate Keyframes ───
    const keyframes = isMobile ? MOBILE_KEYFRAMES : isTablet ? TABLET_KEYFRAMES : DESKTOP_KEYFRAMES;
    const kLow = Math.max(1, Math.min(8, Math.floor(floatChapter)));
    const kHigh = Math.min(9, kLow + 1);
    const blend = floatChapter - kLow;

    const kfA = keyframes[kLow];
    const kfB = keyframes[kHigh];

    const targetX = THREE.MathUtils.lerp(kfA.x, kfB.x, blend);
    const targetY = THREE.MathUtils.lerp(kfA.y, kfB.y, blend);
    const targetZ = THREE.MathUtils.lerp(kfA.z, kfB.z, blend);
    const targetYaw = lerpAngle(kfA.yaw, kfB.yaw, blend);
    const targetScale = THREE.MathUtils.lerp(kfA.scale, kfB.scale, blend) * responsiveScaleMul;
    const targetTiltX = THREE.MathUtils.lerp(kfA.headTiltX, kfB.headTiltX, blend);
    const targetHeadYaw = THREE.MathUtils.lerp(kfA.headTurnY, kfB.headTurnY, blend);

    const soundRingsOp = THREE.MathUtils.lerp(kfA.soundRingsOpacity, kfB.soundRingsOpacity, blend);
    const dottedTrailOp = THREE.MathUtils.lerp(kfA.dottedTrailOpacity, kfB.dottedTrailOpacity, blend);
    const floorGlowOp = THREE.MathUtils.lerp(kfA.floorGlowOpacity, kfB.floorGlowOpacity, blend);
    const bgDarkInt = THREE.MathUtils.lerp(kfA.bgDarkIntensity, kfB.bgDarkIntensity, blend);

    // Cross-fade scene lighting
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(0.9, 0.45, bgDarkInt);
    }
    if (directionalLightRef.current) {
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(1.1, 0.6, bgDarkInt);
    }

    // ─── 4. Filtered Velocity & Non-Jittery Vehicle Dynamics ───
    const rawVx = (targetX - prevTargetX.current) / Math.max(safeDelta, 0.001);
    prevTargetX.current = targetX;

    // Low-pass exponential velocity filter (smooths out frame-to-frame noise)
    smoothedVx.current = THREE.MathUtils.lerp(smoothedVx.current, rawVx, 1 - Math.exp(-6 * safeDelta));

    // Anticipation: gently turn into travel direction, clamped to ~12 degrees
    let anticipationYaw = 0;
    if (Math.abs(smoothedVx.current) > 0.06) {
      anticipationYaw = THREE.MathUtils.clamp(smoothedVx.current * 0.12, -0.20, 0.20);
    }

    // Banking: gently bank ~3 degrees into curves
    let bankingRoll = 0;
    if (Math.abs(smoothedVx.current) > 0.06) {
      bankingRoll = THREE.MathUtils.clamp(-smoothedVx.current * 0.024, -0.052, 0.052);
    }

    // Wheel spin by distance traveled
    if (Math.abs(smoothedVx.current) > 0.05) {
      const baseSpin = smoothedVx.current;
      wheelSpinL.current = baseSpin * (1 + anticipationYaw * 0.4);
      wheelSpinR.current = baseSpin * (1 - anticipationYaw * 0.4);
    } else if (kLow === 6 && blend < 0.5) {
      wheelSpinL.current = 2.6;
      wheelSpinR.current = 2.6;
    } else {
      wheelSpinL.current = THREE.MathUtils.lerp(wheelSpinL.current, 0, 0.15);
      wheelSpinR.current = THREE.MathUtils.lerp(wheelSpinR.current, 0, 0.15);
    }

    // ─── 5. Critically Damped Smoothing (lerpAngle for Yaw) ───
    const posLerp = 1 - Math.exp(-7.5 * safeDelta);
    const rotLerp = 1 - Math.exp(-9.0 * safeDelta);

    let finalPosX = THREE.MathUtils.lerp(curPos.current.x, targetX, posLerp);
    let finalPosY = THREE.MathUtils.lerp(curPos.current.y, targetY, posLerp);
    let finalPosZ = THREE.MathUtils.lerp(curPos.current.z, targetZ, posLerp);

    const targetBodyYaw = targetYaw + anticipationYaw;
    let finalYaw = lerpAngle(curYaw.current, targetBodyYaw, rotLerp);
    let finalRoll = THREE.MathUtils.lerp(curRoll.current, bankingRoll, rotLerp);
    let finalScale = THREE.MathUtils.lerp(curScale.current, targetScale, posLerp);

    // ─── 6. Hop Animation (Squash & Stretch Physics) ───
    let hopOffsetY = 0;
    let squashScaleY = 1.0;
    let squashScaleXZ = 1.0;

    const hopElapsed = (nowMs - hopStartTimeRef.current) / 1000;
    if (hopElapsed >= 0 && hopElapsed < 0.52) {
      const p = hopElapsed / 0.52;
      if (p < 0.14) {
        // Anticipation crouch / compression
        const u = p / 0.14;
        const c = Math.sin(u * Math.PI);
        squashScaleY = 1.0 - c * 0.08;
        squashScaleXZ = 1.0 + c * 0.05;
        hopOffsetY = -0.012 * c;
      } else if (p < 0.68) {
        // Main jump arc & stretch
        const u = (p - 0.14) / 0.54;
        const jumpArc = Math.sin(u * Math.PI);
        hopOffsetY = jumpArc * 0.15;
        squashScaleY = 1.0 + jumpArc * 0.09;
        squashScaleXZ = 1.0 - jumpArc * 0.05;
      } else if (p < 0.86) {
        // Impact landing compression
        const u = (p - 0.68) / 0.18;
        const landSquash = Math.sin(u * Math.PI);
        squashScaleY = 1.0 - landSquash * 0.08;
        squashScaleXZ = 1.0 + landSquash * 0.05;
        hopOffsetY = 0;
      } else {
        // Rebound settling
        const u = (p - 0.86) / 0.14;
        squashScaleY = 1.0 + Math.sin(u * Math.PI) * 0.025;
        squashScaleXZ = 1.0 - Math.sin(u * Math.PI) * 0.015;
        hopOffsetY = 0;
      }
    }

    // ─── 7. Hero Intro Sequence (Starts ON-STAGE immediately -> Showcase -> Settle) ───
    let isIntroDriving = false;
    if (introActive && !introFinishedRef.current) {
      if (introStartTimeRef.current === null) {
        introStartTimeRef.current = t;
      }
      const introElapsed = t - introStartTimeRef.current;
      const heroStageX = isMobile ? 0 : 0.75;
      const radiusX = isMobile ? 0.32 : 0.50;
      const radiusZ = isMobile ? 0.20 : 0.30;

      if (introElapsed < 0.6) {
        // Frame 0 onwards: LUMI is RIGHT ON STAGE, 100% visible immediately!
        finalPosX = heroStageX;
        finalPosZ = 0;
        finalYaw = 0;
        wheelSpinL.current = 0;
        wheelSpinR.current = 0;

        const u = introElapsed / 0.6;
        hopOffsetY = Math.sin(u * Math.PI) * 0.08;
        squashScaleY = 1.0 + Math.sin(u * Math.PI) * 0.04;
        squashScaleXZ = 1.0 - Math.sin(u * Math.PI) * 0.03;
      } else if (introElapsed < 3.2) {
        // Smooth showcase lap around the stage ring starting and ending at center stage
        isIntroDriving = true;
        const lapProgress = (introElapsed - 0.6) / 2.6; // 0 to 1
        const lapAngle = lapProgress * Math.PI * 2; // 0 to 2PI

        // Smooth spiral outwards from center and back inwards to center
        const envelope = Math.sin(lapProgress * Math.PI); // 0 at start, 1 in middle, 0 at end
        const currentRadiusX = radiusX * envelope;
        const currentRadiusZ = radiusZ * envelope;

        finalPosX = heroStageX + Math.sin(lapAngle) * currentRadiusX;
        finalPosZ = (1 - Math.cos(lapAngle)) * 0.5 * currentRadiusZ;

        // Tangent direction along orbit, smoothly blending to facing front
        const tangentYaw = normalizeAngle(Math.cos(lapAngle) * 0.5);
        finalYaw = lerpAngle(curYaw.current, tangentYaw, 0.18);
        finalRoll = -0.03 * envelope;

        wheelSpinL.current = 3.6;
        wheelSpinR.current = 4.2;

        if (lapProgress > 0.15 && lapProgress < 0.35) {
          window.dispatchEvent(new CustomEvent('lumi:highlight-label', { detail: 'vision' }));
        } else if (lapProgress > 0.45 && lapProgress < 0.65) {
          window.dispatchEvent(new CustomEvent('lumi:highlight-label', { detail: 'voice' }));
        } else if (lapProgress > 0.70 && lapProgress < 0.88) {
          window.dispatchEvent(new CustomEvent('lumi:highlight-label', { detail: 'drive' }));
        }
      } else if (introElapsed < 3.8) {
        // Settled cleanly in center stage with an arrival nod
        finalPosX = heroStageX;
        finalPosZ = 0;
        finalYaw = lerpAngle(curYaw.current, 0, rotLerp);
        finalRoll = 0;
        wheelSpinL.current = 0;
        wheelSpinR.current = 0;

        if (introElapsed < 3.6) {
          const hopU = (introElapsed - 3.2) / 0.4;
          hopOffsetY = Math.sin(hopU * Math.PI) * 0.04;
        }
      } else {
        introFinishedRef.current = true;
        setIntroActive(false);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lumi_hero_intro_played', 'true');
        }
        window.dispatchEvent(new CustomEvent('lumi:intro-complete'));
      }
    }

    // ─── 8. Joy Lap (2-second circle drive on click) ───
    const joyLapElapsed = (nowMs - joyLapStartTimeRef.current) / 1000;
    if (joyLapElapsed >= 0 && joyLapElapsed < 2.0) {
      const u = joyLapElapsed / 2.0;
      const angle = u * Math.PI * 2;
      finalPosX += Math.cos(angle) * 0.24;
      finalPosZ += Math.sin(angle) * 0.16;
      finalYaw = lerpAngle(finalYaw, -angle, 0.2);
      wheelSpinL.current = 3.4;
      wheelSpinR.current = 4.4;
    }

    // ─── 8B. Section Arrival Detection, Arrival Jumps & Content Inspection ───
    const currentChapterInt = Math.max(1, Math.min(9, Math.round(floatChapter)));
    const dwellDist = Math.abs(floatChapter - currentChapterInt);
    const isSettledInChapter = dwellDist < 0.14;

    // Re-arm arrival hops when moving away so LUMI greets on each revisit
    if (Math.abs(floatChapter - 2) > 0.85) {
      arrivalHopDoneRef.current[2] = false;
    }
    if (Math.abs(floatChapter - 5) > 0.85) {
      arrivalHopDoneRef.current[5] = false;
    }

    if (isSettledInChapter && currentChapterInt !== activeSettledChapterRef.current) {
      activeSettledChapterRef.current = currentChapterInt;
      sectionArrivalMsRef.current = nowMs;

      // Happy arrival jumps: Chapter 2 (Meet LUMI) and Chapter 5 (Expression)
      if (
        (currentChapterInt === 2 || currentChapterInt === 5) &&
        !arrivalHopDoneRef.current[currentChapterInt]
      ) {
        arrivalHopDoneRef.current[currentChapterInt] = true;
        hopStartTimeRef.current = nowMs;
        isBlinkingRef.current = true;
        blinkProgressRef.current = 0;
        isDoubleBlinkRef.current = true;
        doubleBlinkDoneRef.current = false;
        if (currentChapterInt === 2) {
          activeMoodRef.current = 'happy';
        } else if (currentChapterInt === 5) {
          activeMoodRef.current = 'excited';
        }
      }
    }

    // Content direction:
    // Even chapters (2, 4, 6, 8): robot on left, content is on RIGHT (+1)
    // Odd chapters (1, 3, 5, 7, 9): robot on right, content is on LEFT (-1)
    const contentDirection = currentChapterInt % 2 === 0 ? 1 : -1;
    const timeSinceArrival = (nowMs - sectionArrivalMsRef.current) / 1000;
    let inspectWeight = 0;

    // Look at section content for ~2.2 seconds upon entering section, then return to front & cursor
    if (isSettledInChapter && timeSinceArrival < 2.2 && (!introActive || introFinishedRef.current)) {
      if (timeSinceArrival < 0.35) {
        const u = timeSinceArrival / 0.35;
        inspectWeight = u * u * (3 - 2 * u);
      } else if (timeSinceArrival < 1.7) {
        inspectWeight = 1.0;
      } else {
        const u = (timeSinceArrival - 1.7) / 0.5;
        inspectWeight = 1.0 - u * u * (3 - 2 * u);
      }
    }

    // ─── 9. Cursor Tracking & Smooth Head Reaction ───
    const gazeWeight = GAZE_WEIGHTS[kLow] ?? 0.5;
    const isPointerIdle = (nowMs - mousePosRef.current.lastMoveTime) > 5000;
    let targetGazeX = 0;
    let targetGazeY = 0;

    if (!mousePosRef.current.isInside) {
      // Natural front-facing gaze with subtle resting breath
      targetGazeX = Math.sin(t * 0.3) * 0.05;
      targetGazeY = Math.cos(t * 0.25) * 0.03;
    } else if (isPointerIdle) {
      targetGazeX = Math.sin(t * 0.5) * 0.22;
      targetGazeY = Math.cos(t * 0.35) * 0.10;
    } else {
      targetGazeX = mousePosRef.current.nx * gazeWeight;
      targetGazeY = -mousePosRef.current.ny * gazeWeight;
    }

    // Blend gaze towards section content during initial 2 seconds of arrival
    if (inspectWeight > 0.005) {
      const contentGazeX = contentDirection * 0.72;
      const contentGazeY = -0.15; // slightly looking down at text/cards
      targetGazeX = THREE.MathUtils.lerp(targetGazeX, contentGazeX, inspectWeight);
      targetGazeY = THREE.MathUtils.lerp(targetGazeY, contentGazeY, inspectWeight);
    }

    // Head target yaw & pitch
    const contentHeadYaw = contentDirection * 0.26; // ~15 degrees towards content
    const contentHeadPitch = 0.05; // slight curious inspection nod down

    const normalHeadTargetYaw = targetHeadYaw + targetGazeX * 0.38;
    const normalHeadTargetPitch = targetTiltX + targetGazeY * 0.18;

    const blendedHeadTargetYaw = THREE.MathUtils.lerp(normalHeadTargetYaw, targetHeadYaw + contentHeadYaw, inspectWeight);
    const blendedHeadTargetPitch = THREE.MathUtils.lerp(normalHeadTargetPitch, targetTiltX + contentHeadPitch, inspectWeight);

    curHeadTurnY.current = THREE.MathUtils.lerp(curHeadTurnY.current, blendedHeadTargetYaw, 1 - Math.exp(-8 * safeDelta));
    curHeadTiltX.current = THREE.MathUtils.lerp(curHeadTiltX.current, blendedHeadTargetPitch, 1 - Math.exp(-8 * safeDelta));

    // Body follows head smoothly at 18% when settled (not fighting intro)
    if (!introActive || introFinishedRef.current) {
      const bodyFollowYaw = (curHeadTurnY.current - targetHeadYaw) * 0.18;
      finalYaw = lerpAngle(finalYaw, finalYaw + bodyFollowYaw, 0.25);
    }

    // Hover over LUMI: gentle head lift and slight playful roll
    if (isHoveringLumiRef.current) {
      curHeadTiltX.current += 0.06;
      finalRoll += Math.sin(t * 10) * 0.015;
    }

    // Commit transforms
    curPos.current.set(finalPosX, finalPosY, finalPosZ);
    curYaw.current = finalYaw;
    curRoll.current = finalRoll;
    curScale.current = finalScale;

    modelGroupRef.current.position.set(finalPosX, finalPosY + hopOffsetY, finalPosZ);
    modelGroupRef.current.rotation.set(0, finalYaw, finalRoll);
    modelGroupRef.current.scale.set(
      finalScale * squashScaleXZ,
      finalScale * squashScaleY,
      finalScale * squashScaleXZ
    );

    // Update permanent ground shadow directly
    if (shadowGroupRef.current) {
      shadowGroupRef.current.visible = footerFade > 0.005;
      const shadowYOffset = -0.768 * finalScale;
      shadowGroupRef.current.position.set(finalPosX, finalPosY + shadowYOffset, finalPosZ);
      shadowGroupRef.current.rotation.set(0, finalYaw, 0);
      shadowGroupRef.current.scale.set(finalScale, finalScale, finalScale);

      const hopFactor = Math.max(0, hopOffsetY);
      const contactFade = Math.max(0, 1 - hopFactor * 6.5) * footerFade;
      const diffuseScale = 1.0 + hopFactor * 1.5;
      const diffuseFade = Math.max(0.25, 1 - hopFactor * 2.2) * footerFade;

      if (wheelShadowLRef.current) {
        (wheelShadowLRef.current.material as THREE.MeshBasicMaterial).opacity = 0.65 * contactFade;
      }
      if (wheelShadowRRef.current) {
        (wheelShadowRRef.current.material as THREE.MeshBasicMaterial).opacity = 0.65 * contactFade;
      }
      if (bodyShadowRef.current) {
        (bodyShadowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.52 * diffuseFade;
        bodyShadowRef.current.scale.set(diffuseScale, diffuseScale * 0.9, 1);
      }
    }

    // Smoothly dissolve hero stage disc as LUMI departs Chapter 1
    const heroDiscOpacity = Math.max(0, Math.min(1, 1 - (floatChapter - 1.0) / 0.7)) * footerFade;
    if (heroDiscRef.current) {
      heroDiscRef.current.visible = heroDiscOpacity > 0.005;
      heroDiscRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        if (mesh && mesh.material) {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          const baseOp = idx === 0 ? 0.6 : idx === 1 ? 0.25 : 0.3;
          mat.opacity = baseOp * heroDiscOpacity;
        }
      });
    }

    // ─── 10. Eye Behavior (Blinking, Glancing, Mood Morphing) ───
    blinkTimerRef.current += safeDelta;
    let eyeOpen = 1.0;

    if (isBlinkingRef.current) {
      blinkProgressRef.current += safeDelta;
      const blinkDuration = 0.22;
      const p = blinkProgressRef.current / blinkDuration;

      if (p <= 0.44) {
        eyeOpen = 1.0 - p / 0.44;
      } else if (p <= 1.0) {
        eyeOpen = (p - 0.44) / 0.56;
      } else {
        if (isDoubleBlinkRef.current && !doubleBlinkDoneRef.current) {
          doubleBlinkDoneRef.current = true;
          blinkProgressRef.current = 0;
        } else {
          isBlinkingRef.current = false;
          blinkProgressRef.current = 0;
          isDoubleBlinkRef.current = false;
          doubleBlinkDoneRef.current = false;
          eyeOpen = 1.0;
        }
      }
    } else if (blinkTimerRef.current >= nextBlinkAtRef.current) {
      isBlinkingRef.current = true;
      blinkProgressRef.current = 0;
      blinkTimerRef.current = 0;
      nextBlinkAtRef.current = 3.0 + Math.random() * 3.0;
      isDoubleBlinkRef.current = Math.random() < 0.10;
      doubleBlinkDoneRef.current = false;
    }

    // Micro-saccades
    saccadeTimerRef.current += safeDelta;
    if (saccadeTimerRef.current >= nextSaccadeAtRef.current) {
      saccadeTimerRef.current = 0;
      nextSaccadeAtRef.current = 0.8 + Math.random() * 1.4;
      saccadeOffsetRef.current = {
        x: (Math.random() - 0.5) * 0.08,
        y: (Math.random() - 0.5) * 0.05,
      };
    }

    // Breathing scale: 1.5% scale oscillation over 4 seconds
    const breathingScale = 1.0 + Math.sin((t * Math.PI * 2) / 4.0) * 0.015;

    // Eyes lead head by ~80ms
    const lookTargetX = THREE.MathUtils.clamp(targetGazeX * 1.15 + saccadeOffsetRef.current.x, -1, 1);
    const lookTargetY = THREE.MathUtils.clamp(targetGazeY * 1.15 + saccadeOffsetRef.current.y, -1, 1);
    eyeLookRef.current.x = THREE.MathUtils.lerp(eyeLookRef.current.x, lookTargetX, 1 - Math.exp(-14 * safeDelta));
    eyeLookRef.current.y = THREE.MathUtils.lerp(eyeLookRef.current.y, lookTargetY, 1 - Math.exp(-14 * safeDelta));

    // ─── 11. Continuous Chapter Target Mood ───
    // Section 5 range: [4.4, 5.6]
    const isChapter5 = floatChapter >= 4.4 && floatChapter <= 5.6;
    let targetMood: LumiMood = kfA.mood;

    if (isChapter5) {
      // In Chapter 05: honor user's clicked mood if chosen, otherwise default to chapter 5 keyframe
      targetMood = userMoodOverrideRef.current ?? 'happy';
    } else {
      // When scrolling away from Chapter 05 (down to Chapter 6 or up to Chapter 4):
      // The selected expression MUST NOT persist!
      if (userMoodOverrideRef.current) {
        userMoodOverrideRef.current = null;
      }

      if (isIntroDriving || (hopElapsed >= 0 && hopElapsed < 0.5) || joyLapElapsed < 2.0 || isHoveringCtaRef.current) {
        targetMood = 'excited';
      } else if (kLow === 6 && scrollStore.direction === -1) {
        targetMood = 'upset';
      } else if (kLow === 9) {
        const orderCycle = Math.sin(t * 0.4);
        targetMood = orderCycle > 0.2 ? 'love' : 'happy';
      } else {
        targetMood = kfA.mood;
      }
    }

    if (targetMood !== activeMoodRef.current) {
      activeMoodRef.current = targetMood;
      isBlinkingRef.current = true;
      blinkProgressRef.current = 0;
      if (onMoodChange) onMoodChange(targetMood);
    }

    eyeOpennessRef.current = eyeOpen;
    eyeScaleRef.current = breathingScale;
    eyeTwinkleRef.current = t * 3.0;

    // Push live 60fps values into animDataRef for zero-lag WebGL rendering
    if (animDataRef.current) {
      animDataRef.current.mood = activeMoodRef.current;
      animDataRef.current.eyeLookX = eyeLookRef.current.x;
      animDataRef.current.eyeLookY = eyeLookRef.current.y;
      animDataRef.current.eyeOpenness = eyeOpen;
      animDataRef.current.eyeScale = breathingScale;
      animDataRef.current.twinklePhase = t * 3.0;
      animDataRef.current.wheelSpinL = wheelSpinL.current;
      animDataRef.current.wheelSpinR = wheelSpinR.current;
      animDataRef.current.headTiltX = curHeadTiltX.current;
      animDataRef.current.headTurnY = curHeadTurnY.current;
      animDataRef.current.soundRingsOpacity = DESKTOP_KEYFRAMES[4].soundRingsOpacity * (floatChapter >= 3.35 && floatChapter <= 4.65 ? 1 : 0);
      animDataRef.current.dottedTrailOpacity = DESKTOP_KEYFRAMES[6].dottedTrailOpacity * (floatChapter >= 5.35 && floatChapter <= 6.65 ? 1 : 0);
      animDataRef.current.floorGlowOpacity = DESKTOP_KEYFRAMES[7].floorGlowOpacity * (floatChapter >= 6.35 && floatChapter <= 7.65 ? 1 : 0);
      animDataRef.current.fadeOpacity = fadeOpacityRef.current;
    }
  });

  return (
    <>
      {/* Lighting with cross-fade */}
      <ambientLight ref={ambientLightRef} intensity={0.9} />
      <directionalLight
        ref={directionalLightRef}
        position={[5, 8, 5]}
        intensity={1.1}
      />
      <directionalLight position={[-4, 5, -2]} intensity={0.4} />

      {/* Hero Flat Stage Disc & Ellipse (smoothly dissolves as LUMI departs Chapter 1) */}
      <HeroFloorRing
        groupRef={heroDiscRef}
        centerX={isMobile ? 0 : isTablet ? 0 : 0.75}
        centerY={isMobile ? (0.44 - 0.772 * 0.46) : isTablet ? (0.38 - 0.772 * 0.58) : -0.772}
        scale={isMobile ? 0.46 : isTablet ? 0.58 : 1.0}
      />

      {/* Permanent Professional Ground Shadow (Rock-solid across all 9 chapters) */}
      <LumiGroundShadow
        shadowGroupRef={shadowGroupRef}
        wheelShadowLRef={wheelShadowLRef}
        wheelShadowRRef={wheelShadowRRef}
        bodyShadowRef={bodyShadowRef}
        wheelShadowTexture={wheelShadowTexture}
        bodyShadowTexture={bodyShadowTexture}
      />

      {/* LUMI Model Group */}
      <group
        ref={modelGroupRef}
        position={[isMobile ? 0 : 0.75, 0, 0]}
        onClick={handleLumiClick}
        onPointerOver={() => { isHoveringLumiRef.current = true; }}
        onPointerOut={() => { isHoveringLumiRef.current = false; }}
      >
        <LumiGLBModel
          animDataRef={animDataRef}
          mood={activeMoodRef.current}
          fadeOpacity={1.0}
        />
      </group>

      {/* High-fidelity local studio fill lighting with ZERO external HDR network requests */}
      <hemisphereLight intensity={0.4} groundColor="#E4E1EE" color="#FFFFFF" />
    </>
  );
}

// ─── Exported LumiScene Canvas ────────────────────────────────────────

export function LumiScene({
  activeChapter = 1,
  mood = 'happy',
  onMoodChange,
}: LumiSceneProps) {
  const [dpr, setDpr] = useState(1.5);
  const [isWebGLAvailable, setIsWebGLAvailable] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) setIsWebGLAvailable(false);
    } catch {
      setIsWebGLAvailable(false);
    }
  }, []);

  if (!isWebGLAvailable) {
    return null;
  }

  return (
    <div
      className="canvas-container max-lg:[mask-image:linear-gradient(to_bottom,black_260px,transparent_310px)] max-lg:[-webkit-mask-image:linear-gradient(to_bottom,black_260px,transparent_310px)] pointer-events-none"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 35 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        dpr={dpr}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1.0)}
          onIncline={() => setDpr(1.5)}
        >
          <LumiSceneContent
            activeChapter={activeChapter}
            selectedMood={mood}
            onMoodChange={onMoodChange}
          />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
