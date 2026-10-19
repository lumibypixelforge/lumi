'use client';

/**
 * LUMI 3D Scene Choreographer — Mobile Robot Dock & Desktop Stage
 *
 * Implements:
 * 1. Mobile Robot Dock (under 768px): fixed under header, height clamp(180px, 28svh, 260px).
 *    In the dock, x: 0 (no sideways travel), robot scale chosen from dock height with >8px margin,
 *    never cropped, complete wheels & floor shadow visible.
 * 2. Hero exception: 46svh above headline at scrollY = 0, smoothly damping into the dock as user scrolls.
 * 3. Dock background follows chapter color: dynamic cross-fade to dark #0E0B1A for Chapter 07.
 * 4. Touch behavior: no cursor tracking. Autonomous glances every 5-8s. Tap on robot makes it excited and hop.
 * 5. Performance: DPR capped at 1.5 on mobile, debounced resize ignoring height changes under 100px (iOS Safari address bar), loop paused when tab hidden.
 * 6. Desktop layout & choreography completely preserved for >=768px and landscape phones <500px.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LumiGLBModel, type LumiSceneAnimationData } from './lumi-custom-model';
import { type LumiMood } from './eye-engine';
import { scrollStore } from '@/components/providers/smooth-scroll';

// Eagerly preload GLTF model to prevent render latency
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

// ─── Mathematical Angle Utilities ────────────────────────────────────

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

function smootherstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

// ─── Keyframes per Chapter (1 to 9) ──────────────────────────────────

// Desktop (768px+ & landscape <500px): alternating 12-column stage choreography
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

// Mobile Robot Dock (<768px): No sideways travel (x: 0), centered in dock (y: 0.0), scale fills ~80% of dock height
const MOBILE_KEYFRAMES: Record<number, ChapterKeyframe> = {
  1: { ...DESKTOP_KEYFRAMES[1], x: 0, y: 0.0, z: 0, scale: 1.18 },
  2: { ...DESKTOP_KEYFRAMES[2], x: 0, y: 0.0, z: 0, scale: 1.18, yaw: 0.20, headTurnY: 0.10 },
  3: { ...DESKTOP_KEYFRAMES[3], x: 0, y: 0.0, z: 0, scale: 1.18, yaw: -0.20, headTurnY: -0.10 },
  4: { ...DESKTOP_KEYFRAMES[4], x: 0, y: 0.0, z: 0, scale: 1.18, headTiltX: 0.06 },
  5: { ...DESKTOP_KEYFRAMES[5], x: 0, y: 0.0, z: 0, scale: 1.20, headTiltX: -0.02 },
  6: { ...DESKTOP_KEYFRAMES[6], x: 0, y: 0.0, z: 0, scale: 1.18, yaw: 0.15 },
  7: { ...DESKTOP_KEYFRAMES[7], x: 0, y: 0.0, z: 0, scale: 1.18, yaw: -0.25, headTurnY: -0.08 },
  8: { ...DESKTOP_KEYFRAMES[8], x: 0, y: 0.0, z: 0, scale: 1.16 },
  9: { ...DESKTOP_KEYFRAMES[9], x: 0, y: 0.0, z: 0, scale: 1.16 },
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
  1: 1.0,
  2: 0.5,
  3: 0.5,
  4: 0.5,
  5: 0.2,
  6: 0.3,
  7: 0.5,
  8: 0.4,
  9: 0.6,
};

const CHAPTER_DEFAULT_MOODS: Record<number, LumiMood> = {
  1: 'happy',
  2: 'happy',
  3: 'neutral',
  4: 'happy',
  5: 'happy',
  6: 'excited',
  7: 'happy',
  8: 'neutral',
  9: 'love',
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

// ─── Ground Shadow Component ──────────────────────────────────────────

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
  const isMobile = size.width < 768 && !(size.height < 500);
  const isTablet = size.width >= 768 && size.width < 1024;
  const responsiveScaleMul = isMobile ? 1.0 : isTablet ? 0.88 : 1.0;

  const modelGroupRef = useRef<THREE.Group>(null!);
  const ambientLightRef = useRef<THREE.AmbientLight>(null!);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null!);
  const mobileStageStateRef = useRef<Record<number, { x: number; yaw: number; wheelSpin: number; vx?: number; roll?: number; pitch?: number }>>({});
  const stageElementsMapRef = useRef<Record<number, HTMLElement>>({});

  const initialKeyframe = isMobile ? MOBILE_KEYFRAMES[1] : isTablet ? TABLET_KEYFRAMES[1] : DESKTOP_KEYFRAMES[1];
  const initialStageX = initialKeyframe.x;
  const initialStageY = initialKeyframe.y;
  const initialStageScale = initialKeyframe.scale * responsiveScaleMul;

  // Smooth transform states initialized to exact chapter 1 position
  const curPos = useRef(new THREE.Vector3(initialStageX, initialStageY, 0));
  const curYaw = useRef(0);
  const curRoll = useRef(0);
  const curScale = useRef(initialStageScale);
  const curHeadTiltX = useRef(0);
  const curHeadTurnY = useRef(0);

  // Velocity tracking
  const prevTargetX = useRef(initialStageX);
  const smoothedVx = useRef(0);
  const isFirstFrameRef = useRef(true);

  // Wheel velocities
  const wheelSpinL = useRef(0);
  const wheelSpinR = useRef(0);

  // Cached Section Offsets
  const sectionOffsetsRef = useRef<number[]>([0, 900, 1800, 2700, 3600, 4500, 5400, 6300, 7200]);

  // Tab hidden pause state
  const isTabHiddenRef = useRef(false);

  // Dynamic Mood & Eye State
  const currentChapterFloat = useRef(1.0);
  const activeMoodRef = useRef<LumiMood>('happy');
  const userMoodOverrideRef = useRef<LumiMood | null>(null);

  // Live Animation Data container shared with LumiGLBModel
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

  // Autonomous Glance System (5 to 8s interval)
  const glanceTimerRef = useRef(0);
  const nextGlanceAtRef = useRef(5.5);
  const isGlancingRef = useRef(false);
  const glanceProgressRef = useRef(0);
  const glanceTargetRef = useRef({ x: 0, y: 0 });

  // Micro-saccades
  const saccadeTimerRef = useRef(0);
  const nextSaccadeAtRef = useRef(1.4);
  const saccadeOffsetRef = useRef({ x: 0, y: 0 });

  // Desktop cursor tracking (disabled on touch mobile)
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

  // Check tab visibility
  useEffect(() => {
    const handleVis = () => {
      isTabHiddenRef.current = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

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

  // Cache section anchors with debounce, ignoring iOS Safari address bar jitter (<100px height changes)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const chapterIds = ['hero', 'meet', 'see', 'talk', 'express', 'drive', 'power', 'specs', 'preorder'];
    let lastW = window.innerWidth;
    let lastH = window.innerHeight;
    let debounceTimer: NodeJS.Timeout | null = null;

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

    const handleResize = () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      // Ignore mobile address bar expansion/collapse
      if (newW === lastW && Math.abs(newH - lastH) < 100) {
        return;
      }
      lastW = newW;
      lastH = newH;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateAnchors, 200);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  // Pointer tracking: Mouse ONLY on desktop; touch cursor tracking disabled on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onMouseMove = (e: MouseEvent) => {
      // Ignore simulated mouse events on touch devices
      if ('ontouchstart' in window && window.innerWidth < 768) return;

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

    // Tap on robot event
    const onTapRobot = () => {
      hopStartTimeRef.current = performance.now();
      userMoodOverrideRef.current = 'excited';
      activeMoodRef.current = 'excited';
      if (animDataRef.current) {
        animDataRef.current.mood = 'excited';
      }
      isBlinkingRef.current = true;
      blinkProgressRef.current = 0;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('lumi:hover-cta', onHoverCTA);
    window.addEventListener('lumi:unhover-cta', onUnhoverCTA);
    window.addEventListener('lumi:tap-robot', onTapRobot);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('lumi:hover-cta', onHoverCTA);
      window.removeEventListener('lumi:unhover-cta', onUnhoverCTA);
      window.removeEventListener('lumi:tap-robot', onTapRobot);
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
        hopStartTimeRef.current = performance.now();
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

  // ─── Main Animation Loop (Single R3F loop with priority 1) ──────────
  useFrame((state, delta) => {
    if (isTabHiddenRef.current || !modelGroupRef.current) return;

    const t = state.clock.elapsedTime;
    const safeDelta = isFirstFrameRef.current ? Math.min(delta, 1 / 60) : Math.min(delta, 1 / 30);
    const nowMs = performance.now();

    // ─── Mobile Multi-Stage Scissor Test Rendering (<768px portrait) ───
    const isMobileNow = (typeof window !== 'undefined' ? window.innerWidth < 768 : state.size.width < 768) && !(state.size.height < 500);

    if (isMobileNow) {
      if (typeof document === 'undefined') return;

      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const travelRange = 1.85;
      const wheelRadius = 0.12;

      // Tap Hop with squash & stretch (Disney 12 animation principles)
      let hopY = 0;
      let hopSquashY = 1.0;
      let hopSquashXZ = 1.0;
      let isHopping = false;
      if (hopStartTimeRef.current > 0) {
        const hopElapsed = (nowMs - hopStartTimeRef.current) / 500;
        if (hopElapsed >= 0 && hopElapsed < 1.0) {
          isHopping = true;
          if (hopElapsed < 0.15) {
            // Anticipation crouch / squash
            const u = hopElapsed / 0.15;
            const c = Math.sin(u * Math.PI);
            hopSquashY = 1.0 - c * 0.07;
            hopSquashXZ = 1.0 + c * 0.04;
            hopY = -0.01 * c;
          } else if (hopElapsed < 0.70) {
            // Jump arc & stretch in air
            const u = (hopElapsed - 0.15) / 0.55;
            const arc = Math.sin(u * Math.PI);
            hopY = arc * 0.16;
            hopSquashY = 1.0 + arc * 0.08;
            hopSquashXZ = 1.0 - arc * 0.04;
          } else if (hopElapsed < 0.88) {
            // Landing impact squash
            const u = (hopElapsed - 0.70) / 0.18;
            const land = Math.sin(u * Math.PI);
            hopSquashY = 1.0 - land * 0.06;
            hopSquashXZ = 1.0 + land * 0.04;
            hopY = 0;
          } else {
            // Settle bounce
            const u = (hopElapsed - 0.88) / 0.12;
            hopSquashY = 1.0 + Math.sin(u * Math.PI) * 0.02;
            hopSquashXZ = 1.0 - Math.sin(u * Math.PI) * 0.01;
            hopY = 0;
          }
        }
      }

      // Autonomous glance update (every 5-8s)
      glanceTimerRef.current += safeDelta;
      if (glanceTimerRef.current >= nextGlanceAtRef.current) {
        glanceTimerRef.current = 0;
        nextGlanceAtRef.current = 5.0 + Math.random() * 3.0;
        isGlancingRef.current = true;
        glanceProgressRef.current = 0;
        glanceTargetRef.current = {
          x: (Math.random() - 0.5) * 0.6,
          y: (Math.random() - 0.5) * 0.4,
        };
      }

      let eyeLookX = 0;
      let eyeLookY = 0;
      if (isGlancingRef.current) {
        glanceProgressRef.current += safeDelta * 1.4;
        if (glanceProgressRef.current >= 1.0) {
          isGlancingRef.current = false;
        } else {
          // Smooth bell curve with cubic ease
          const p = glanceProgressRef.current;
          const bell = Math.sin(p * Math.PI);
          const smoothBell = bell * bell * (3 - 2 * bell);
          eyeLookX = glanceTargetRef.current.x * smoothBell;
          eyeLookY = glanceTargetRef.current.y * smoothBell;
        }
      }

      // Natural biological blink (swift 35% close, soft 65% quadratic ease-out open)
      blinkTimerRef.current += safeDelta;
      if (blinkTimerRef.current >= nextBlinkAtRef.current) {
        blinkTimerRef.current = 0;
        nextBlinkAtRef.current = 2.8 + Math.random() * 3.2;
        isBlinkingRef.current = true;
        blinkProgressRef.current = 0;
      }
      let eyeOpen = 1.0;
      if (isBlinkingRef.current) {
        blinkProgressRef.current += safeDelta * 6.5;
        if (blinkProgressRef.current >= 1.0) {
          isBlinkingRef.current = false;
          eyeOpen = 1.0;
        } else {
          const bp = blinkProgressRef.current;
          if (bp < 0.35) {
            const u = bp / 0.35;
            eyeOpen = Math.max(0, 1.0 - u * u);
          } else {
            const u = (bp - 0.35) / 0.65;
            eyeOpen = Math.min(1.0, u * (2 - u));
          }
        }
      }
      if (isHopping) {
        eyeOpen = 1.25;
      }

      // Fast cached stage retrieval: zero querySelectorAll layout thrashing
      // On mobile, if scrollY < 80, force chapter 1 (Hero) so page load is 100% reliable
      let chapter = (typeof window !== 'undefined' && window.scrollY < 80) ? 1 : activeChapter;
      let activeStageEl = stageElementsMapRef.current[chapter];
      if (!activeStageEl || !activeStageEl.isConnected) {
        const el = document.querySelector<HTMLElement>(`.robot-stage[data-chapter="${chapter}"]`);
        if (el) {
          stageElementsMapRef.current[chapter] = el;
          activeStageEl = el;
        }
      }

      if (!activeStageEl) {
        state.gl.autoClear = true;
        state.gl.clear();
        state.gl.setScissorTest(false);
        return;
      }

      let rect = activeStageEl.getBoundingClientRect();

      // If activeChapter stage has scrolled off screen, check adjacent chapter without looping all 9
      if (rect.bottom < 0 && chapter < 9) {
        const nextCh = chapter + 1;
        let nextEl = stageElementsMapRef.current[nextCh];
        if (!nextEl || !nextEl.isConnected) {
          const el = document.querySelector<HTMLElement>(`.robot-stage[data-chapter="${nextCh}"]`);
          if (el) {
            stageElementsMapRef.current[nextCh] = el;
            nextEl = el;
          }
        }
        if (nextEl) {
          const nextRect = nextEl.getBoundingClientRect();
          if (nextRect.top < winH && nextRect.bottom > 0) {
            chapter = nextCh;
            activeStageEl = nextEl;
            rect = nextRect;
          }
        }
      } else if (rect.top > winH && chapter > 1) {
        const prevCh = chapter - 1;
        let prevEl = stageElementsMapRef.current[prevCh];
        if (!prevEl || !prevEl.isConnected) {
          const el = document.querySelector<HTMLElement>(`.robot-stage[data-chapter="${prevCh}"]`);
          if (el) {
            stageElementsMapRef.current[prevCh] = el;
            prevEl = el;
          }
        }
        if (prevEl) {
          const prevRect = prevEl.getBoundingClientRect();
          if (prevRect.top < winH && prevRect.bottom > 0) {
            chapter = prevCh;
            activeStageEl = prevEl;
            rect = prevRect;
          }
        }
      }

      // Only render if the active stage is partially or fully on screen
      if (rect.bottom < 0 || rect.top > winH) {
        state.gl.autoClear = true;
        state.gl.clear();
        state.gl.setScissorTest(false);
        return;
      }

      state.gl.autoClear = false;
      state.gl.clear();

      const focusedChapter = chapter;
      const currentStageMood: LumiMood = isHopping
        ? 'excited'
        : focusedChapter === 5
        ? (userMoodOverrideRef.current || selectedMood || 'happy')
        : (CHAPTER_DEFAULT_MOODS[focusedChapter] || 'happy');

      if (animDataRef.current) {
        animDataRef.current.mood = currentStageMood;
      }

      // t = stage center vertical position as fraction of viewport height (0 at top, 1 at bottom)
      const stageCenterY = rect.top + rect.height * 0.5;
      const tVal = stageCenterY / winH;

      let targetX = 0;
      let targetYaw = 0;
      let targetWheelSpin = 0;
      let inHold = false;

      if (chapter === 1) {
        // Hero Section: Model is ALWAYS visible, centered, and facing user on page load
        if (tVal >= 0.05) {
          inHold = true;
          targetX = 0;
          targetYaw = 0;
          targetWheelSpin = 0;
        } else if (tVal >= -0.15) {
          // Exit when hero stage scrolls off the top of the viewport
          const v = smootherstep((0.05 - tVal) / 0.20);
          targetX = travelRange * v;
          targetYaw = 0.26 * v;
          targetWheelSpin = (travelRange * v) / wheelRadius;
        } else {
          targetX = travelRange;
          targetYaw = 0.26;
          targetWheelSpin = travelRange / wheelRadius;
        }
      } else {
        // Chapters 2 to 9: Enter from left (0.92 -> 0.72), dwell centered, exit to right
        if (tVal > 0.92) {
          targetX = -travelRange;
          targetYaw = 0.26;
          targetWheelSpin = 0;
        } else if (tVal >= 0.72) {
          // Enter: 0.92 -> 0.72 with zero-jerk quintic smootherstep
          const u = smootherstep((0.92 - tVal) / 0.20);
          targetX = -travelRange * (1 - u);
          targetYaw = 0.26 * (1 - u);
          targetWheelSpin = (travelRange * u) / wheelRadius;
        } else if (tVal > 0.16) {
          // Hold: 0.72 -> 0.16 (centered, faces reader during whole chapter reading dwell)
          inHold = true;
          targetX = 0;
          targetYaw = 0;
          let extraSpin = 0;
          if (chapter === 6) {
            extraSpin = t * 2.2;
          }
          targetWheelSpin = (travelRange / wheelRadius) + extraSpin;
        } else if (tVal >= -0.05) {
          // Exit: 0.16 -> -0.05 with zero-jerk quintic smootherstep
          const v = smootherstep((0.16 - tVal) / 0.21);
          targetX = travelRange * v;
          targetYaw = 0.26 * v;
          targetWheelSpin = (travelRange / wheelRadius) + (travelRange * v) / wheelRadius;
        } else {
          targetX = travelRange;
          targetYaw = 0.26;
          targetWheelSpin = (2 * travelRange) / wheelRadius;
        }
      }

      // Critically damped, organic smoothing (snappy touch tracking with zero jitter)
      if (!mobileStageStateRef.current[chapter]) {
        mobileStageStateRef.current[chapter] = { x: targetX, yaw: targetYaw, wheelSpin: targetWheelSpin, vx: 0, roll: 0, pitch: 0 };
      }
      const st = mobileStageStateRef.current[chapter];
      const prevX = st.x;
      st.x = THREE.MathUtils.lerp(st.x, targetX, 1 - Math.exp(-14 * safeDelta));
      st.yaw = lerpAngle(st.yaw, targetYaw, 1 - Math.exp(-14 * safeDelta));
      st.wheelSpin = THREE.MathUtils.lerp(st.wheelSpin, targetWheelSpin, 1 - Math.exp(-15 * safeDelta));

      // Calculate smooth velocity for organic banking roll and acceleration pitch
      const rawVx = (st.x - prevX) / Math.max(safeDelta, 0.001);
      st.vx = THREE.MathUtils.lerp(st.vx || 0, rawVx, 1 - Math.exp(-12 * safeDelta));
      st.roll = THREE.MathUtils.lerp(st.roll || 0, THREE.MathUtils.clamp(-st.vx * 0.022, -0.045, 0.045), 1 - Math.exp(-12 * safeDelta));
      st.pitch = THREE.MathUtils.lerp(st.pitch || 0, THREE.MathUtils.clamp(st.vx * 0.012, -0.025, 0.025), 1 - Math.exp(-12 * safeDelta));

      // Idle float & hop
      const idleY = Math.sin(t * 1.8) * 0.02;
      const currentY = idleY + hopY;

      // Props for chapters (inside stage only, no particles)
      const soundOp = chapter === 4 && inHold ? 1.0 : 0.0;
      const trailOp = chapter === 6 && inHold ? 1.0 : 0.0;
      const glowOp = chapter === 7 && inHold ? 1.0 : 0.0;

      // Lighting for Ch 07 dark background
      if (chapter === 7) {
        if (ambientLightRef.current) ambientLightRef.current.intensity = 0.55;
        if (directionalLightRef.current) directionalLightRef.current.intensity = 0.65;
      } else {
        if (ambientLightRef.current) ambientLightRef.current.intensity = 0.9;
        if (directionalLightRef.current) directionalLightRef.current.intensity = 1.1;
      }

      // Position model and shadow with safe scale (fits ~75% stage height, whole robot + shadow visible)
      // stageScale = 0.78 fits comfortably in stage height with clean margins
      // stageCenterYOffset = 0.22 centers LUMI's visual bounding box (head to wheels) exactly at y=0 (middle of the stage)
      const stageScale = 0.78;
      const stageCenterYOffset = 0.22;
      modelGroupRef.current.position.set(st.x, currentY + stageCenterYOffset, 0);
      modelGroupRef.current.rotation.set(st.pitch, st.yaw, st.roll);
      modelGroupRef.current.scale.set(stageScale * hopSquashXZ, stageScale * hopSquashY, stageScale * hopSquashXZ);
      modelGroupRef.current.visible = true;

      if (shadowGroupRef.current) {
        shadowGroupRef.current.position.set(st.x, currentY + stageCenterYOffset - 0.772 * stageScale, 0);
        shadowGroupRef.current.rotation.set(0, st.yaw, 0);
        shadowGroupRef.current.scale.set(stageScale * hopSquashXZ, stageScale, stageScale * hopSquashXZ);
      }

      if (heroDiscRef.current) {
        heroDiscRef.current.visible = chapter === 1;
        if (chapter === 1) {
          heroDiscRef.current.position.set(st.x, currentY + stageCenterYOffset - 0.772 * stageScale, 0);
          heroDiscRef.current.scale.setScalar(0.42);
        }
      }

      // Update animData for this stage render pass
      if (animDataRef.current) {
        animDataRef.current.eyeLookX = eyeLookX;
        animDataRef.current.eyeLookY = eyeLookY;
        animDataRef.current.eyeOpenness = eyeOpen;
        animDataRef.current.eyeScale = isHopping ? 1.15 : 1.0;
        animDataRef.current.wheelSpinL = st.wheelSpin;
        animDataRef.current.wheelSpinR = st.wheelSpin;
        animDataRef.current.soundRingsOpacity = soundOp;
        animDataRef.current.dottedTrailOpacity = trailOp;
        animDataRef.current.floorGlowOpacity = glowOp;
        animDataRef.current.fadeOpacity = 1.0;
      }

      // Scissor & Viewport setup (0,0 is bottom-left in WebGL)
      // Three.js setScissor and setViewport accept CSS pixels and multiply by _pixelRatio internally.
      const sx = Math.round(rect.left);
      const sy = Math.round(winH - rect.bottom);
      const sw = Math.round(rect.width);
      const sh = Math.round(rect.height);

      // Clamp tightly within viewport bounds [0, winW] and [0, winH] to guarantee no bleed
      const clampedX = Math.max(0, sx);
      const clampedY = Math.max(0, sy);
      const clampedW = Math.max(0, Math.min(winW - clampedX, sw));
      const clampedH = Math.max(0, Math.min(winH - clampedY, sh));

      if (clampedW > 0 && clampedH > 0) {
        state.gl.setScissorTest(true);
        state.gl.setScissor(clampedX, clampedY, clampedW, clampedH);
        state.gl.setViewport(sx, sy, sw, sh);

        if ('aspect' in state.camera) {
          (state.camera as THREE.PerspectiveCamera).aspect = rect.width / rect.height;
          state.camera.updateProjectionMatrix();
        }

        state.gl.render(state.scene, state.camera);
      }

      state.gl.setScissorTest(false);
      return;
    }

    // ─── Desktop 12-Column Stage Choreography (min-width: 768px & landscape <500px) ───
    // ─── 1. Footer Clearance Fade ───
    let footerFade = 1.0;
    if (typeof window !== 'undefined') {
      const scrollY = scrollStore.y;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const distToBottom = docHeight - (scrollY + winHeight);

      if (distToBottom < 700) {
        footerFade = Math.max(0, (distToBottom - 300) / 400);
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
    const keyframes = isTablet ? TABLET_KEYFRAMES : DESKTOP_KEYFRAMES;
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

    // ─── 4. Filtered Velocity & Non-Jittery Dynamics ───
    const rawVx = (targetX - prevTargetX.current) / Math.max(safeDelta, 0.001);
    prevTargetX.current = targetX;

    smoothedVx.current = THREE.MathUtils.lerp(smoothedVx.current, rawVx, 1 - Math.exp(-6 * safeDelta));

    let anticipationYaw = 0;
    if (Math.abs(smoothedVx.current) > 0.06) {
      anticipationYaw = THREE.MathUtils.clamp(smoothedVx.current * 0.12, -0.20, 0.20);
    }

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

    // ─── 5. Critically Damped Smoothing ───
    const posLerp = 1 - Math.exp(-7.5 * safeDelta);
    const rotLerp = 1 - Math.exp(-9.0 * safeDelta);

    if (isFirstFrameRef.current) {
      isFirstFrameRef.current = false;
      curPos.current.set(targetX, targetY, targetZ);
      curYaw.current = targetYaw;
      curScale.current = targetScale;
      prevTargetX.current = targetX;
    }

    let finalPosX = THREE.MathUtils.lerp(curPos.current.x, targetX, posLerp);
    let finalPosY = THREE.MathUtils.lerp(curPos.current.y, targetY, posLerp);
    let finalPosZ = THREE.MathUtils.lerp(curPos.current.z, targetZ, posLerp);

    const targetBodyYaw = targetYaw + anticipationYaw;
    let finalYaw = lerpAngle(curYaw.current, targetBodyYaw, rotLerp);
    let finalRoll = THREE.MathUtils.lerp(curRoll.current, bankingRoll, rotLerp);
    let finalScale = THREE.MathUtils.lerp(curScale.current, targetScale, posLerp);

    // ─── 6. Hop Animation (Squash & Stretch) ───
    let hopOffsetY = 0;
    let squashScaleY = 1.0;
    let squashScaleXZ = 1.0;

    const hopElapsed = (nowMs - hopStartTimeRef.current) / 1000;
    if (hopElapsed >= 0 && hopElapsed < 0.52) {
      const p = hopElapsed / 0.52;
      if (p < 0.14) {
        const u = p / 0.14;
        const c = Math.sin(u * Math.PI);
        squashScaleY = 1.0 - c * 0.08;
        squashScaleXZ = 1.0 + c * 0.05;
        hopOffsetY = -0.012 * c;
      } else if (p < 0.68) {
        const u = (p - 0.14) / 0.54;
        const jumpArc = Math.sin(u * Math.PI);
        hopOffsetY = jumpArc * 0.15;
        squashScaleY = 1.0 + jumpArc * 0.09;
        squashScaleXZ = 1.0 - jumpArc * 0.05;
      } else if (p < 0.86) {
        const u = (p - 0.68) / 0.18;
        const landSquash = Math.sin(u * Math.PI);
        squashScaleY = 1.0 - landSquash * 0.08;
        squashScaleXZ = 1.0 + landSquash * 0.05;
        hopOffsetY = 0;
      } else {
        const u = (p - 0.86) / 0.14;
        squashScaleY = 1.0 + Math.sin(u * Math.PI) * 0.025;
        squashScaleXZ = 1.0 - Math.sin(u * Math.PI) * 0.015;
        hopOffsetY = 0;
      }
    }

    // ─── 7. Hero Intro Sequence (Starts ON-STAGE immediately) ───
    let isIntroDriving = false;
    if (introActive && !introFinishedRef.current) {
      // If user has started scrolling down, dismiss intro immediately and blend with scroll
      if (scrollY > 20) {
        introFinishedRef.current = true;
        setIntroActive(false);
      } else {
        if (introStartTimeRef.current === null) {
          introStartTimeRef.current = t;
        }
        const introElapsed = t - introStartTimeRef.current;
        const heroStageX = isMobile ? 0 : 0.75;

        if (introElapsed < 0.6) {
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
          if (!isMobile) {
            // Desktop: smooth circular lap around stage with zero-jerk envelope
            isIntroDriving = true;
            const lapProgress = (introElapsed - 0.6) / 2.6;
            const lapAngle = lapProgress * Math.PI * 2;
            const envelope = Math.sin(lapProgress * Math.PI);
            const currentRadiusX = 0.45 * envelope;
            const currentRadiusZ = 0.25 * envelope;

            finalPosX = heroStageX + Math.sin(lapAngle) * currentRadiusX;
            finalPosZ = (1 - Math.cos(lapAngle)) * 0.5 * currentRadiusZ;

            // Modulate tangentYaw with envelope so it smoothly eases in and eases out to 0
            const tangentYaw = normalizeAngle(Math.cos(lapAngle) * 0.35 * envelope);
            finalYaw = lerpAngle(curYaw.current, tangentYaw, 0.18);
            finalRoll = -0.02 * envelope;

            wheelSpinL.current = 3.6;
            wheelSpinR.current = 4.2;

            if (lapProgress > 0.15 && lapProgress < 0.35) {
              window.dispatchEvent(new CustomEvent('lumi:highlight-label', { detail: 'vision' }));
            } else if (lapProgress > 0.45 && lapProgress < 0.65) {
              window.dispatchEvent(new CustomEvent('lumi:highlight-label', { detail: 'voice' }));
            } else if (lapProgress > 0.70 && lapProgress < 0.88) {
              window.dispatchEvent(new CustomEvent('lumi:highlight-label', { detail: 'drive' }));
            }
          } else {
            // Mobile: dock is compact, keep robot rock-solid centered (x=0, z=0) with subtle eye wake-up
            finalPosX = 0;
            finalPosZ = 0;
            finalYaw = 0;
            wheelSpinL.current = 0;
            wheelSpinR.current = 0;
          }
        } else if (introElapsed < 3.8) {
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
    }

    // ─── 8. Joy Lap (2-second drive on click) ───
    const joyLapElapsed = (nowMs - joyLapStartTimeRef.current) / 1000;
    if (joyLapElapsed >= 0 && joyLapElapsed < 2.0) {
      const u = joyLapElapsed / 2.0;
      const angle = u * Math.PI * 2;
      const joyRadX = isMobile ? 0.12 : 0.24;
      const joyRadZ = isMobile ? 0.08 : 0.16;
      finalPosX += Math.cos(angle) * joyRadX;
      finalPosZ += Math.sin(angle) * joyRadZ;
      finalYaw = lerpAngle(finalYaw, -angle, 0.2);
      wheelSpinL.current = 3.4;
      wheelSpinR.current = 4.4;
    }

    // ─── 8B. Section Arrival Detection & Wheel Rolls ───
    const currentChapterInt = Math.max(1, Math.min(9, Math.round(floatChapter)));
    const dwellDist = Math.abs(floatChapter - currentChapterInt);
    const isSettledInChapter = dwellDist < 0.14;

    if (Math.abs(floatChapter - 2) > 0.85) {
      arrivalHopDoneRef.current[2] = false;
    }
    if (Math.abs(floatChapter - 5) > 0.85) {
      arrivalHopDoneRef.current[5] = false;
    }

    if (isSettledInChapter && currentChapterInt !== activeSettledChapterRef.current) {
      activeSettledChapterRef.current = currentChapterInt;
      sectionArrivalMsRef.current = nowMs;

      // Small greeting wheel roll / hop on entering chapter
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
      }
    }

    // Content direction: desktop 2-col inspection
    const contentDirection = currentChapterInt % 2 === 0 ? 1 : -1;
    const timeSinceArrival = (nowMs - sectionArrivalMsRef.current) / 1000;
    let inspectWeight = 0;

    if (!isMobile && isSettledInChapter && timeSinceArrival < 2.2 && (!introActive || introFinishedRef.current)) {
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

    // ─── 9. Autonomous Glances & Desktop Cursor Tracking ───
    let targetGazeX = 0;
    let targetGazeY = 0;

    if (isMobile) {
      // Mobile: NO cursor tracking; autonomous glancing every 5 to 8 seconds
      glanceTimerRef.current += safeDelta;
      if (!isGlancingRef.current && glanceTimerRef.current >= nextGlanceAtRef.current) {
        isGlancingRef.current = true;
        glanceProgressRef.current = 0;
        glanceTimerRef.current = 0;
        nextGlanceAtRef.current = 5.0 + Math.random() * 3.0; // 5 to 8s
        const dir = Math.random() > 0.5 ? 1 : -1;
        glanceTargetRef.current = {
          x: dir * (0.18 + Math.random() * 0.22),
          y: (Math.random() - 0.5) * 0.10,
        };
      }

      if (isGlancingRef.current) {
        glanceProgressRef.current += safeDelta;
        const glanceDuration = 1.6;
        const p = glanceProgressRef.current / glanceDuration;
        if (p < 0.25) {
          const u = p / 0.25;
          const w = u * u * (3 - 2 * u);
          targetGazeX = glanceTargetRef.current.x * w;
          targetGazeY = glanceTargetRef.current.y * w;
        } else if (p < 0.75) {
          targetGazeX = glanceTargetRef.current.x;
          targetGazeY = glanceTargetRef.current.y;
        } else if (p < 1.0) {
          const u = (p - 0.75) / 0.25;
          const w = 1 - u * u * (3 - 2 * u);
          targetGazeX = glanceTargetRef.current.x * w;
          targetGazeY = glanceTargetRef.current.y * w;
        } else {
          isGlancingRef.current = false;
          glanceProgressRef.current = 0;
        }
      } else {
        // Resting natural breathing gaze
        targetGazeX = Math.sin(t * 0.4) * 0.04;
        targetGazeY = Math.cos(t * 0.3) * 0.02;
      }
    } else {
      // Desktop: Interactive Cursor Tracking
      const gazeWeight = GAZE_WEIGHTS[kLow] ?? 0.5;
      const isPointerIdle = (nowMs - mousePosRef.current.lastMoveTime) > 5000;

      if (!mousePosRef.current.isInside) {
        targetGazeX = Math.sin(t * 0.3) * 0.05;
        targetGazeY = Math.cos(t * 0.25) * 0.03;
      } else if (isPointerIdle) {
        targetGazeX = Math.sin(t * 0.5) * 0.22;
        targetGazeY = Math.cos(t * 0.35) * 0.10;
      } else {
        targetGazeX = mousePosRef.current.nx * gazeWeight;
        targetGazeY = -mousePosRef.current.ny * gazeWeight;
      }

      if (inspectWeight > 0.005) {
        const contentGazeX = contentDirection * 0.72;
        const contentGazeY = -0.15;
        targetGazeX = THREE.MathUtils.lerp(targetGazeX, contentGazeX, inspectWeight);
        targetGazeY = THREE.MathUtils.lerp(targetGazeY, contentGazeY, inspectWeight);
      }
    }

    // Head target yaw & pitch
    const contentHeadYaw = contentDirection * 0.26;
    const contentHeadPitch = 0.05;

    const normalHeadTargetYaw = targetHeadYaw + targetGazeX * 0.38;
    const normalHeadTargetPitch = targetTiltX + targetGazeY * 0.18;

    const blendedHeadTargetYaw = isMobile
      ? normalHeadTargetYaw
      : THREE.MathUtils.lerp(normalHeadTargetYaw, targetHeadYaw + contentHeadYaw, inspectWeight);
    const blendedHeadTargetPitch = isMobile
      ? normalHeadTargetPitch
      : THREE.MathUtils.lerp(normalHeadTargetPitch, targetTiltX + contentHeadPitch, inspectWeight);

    curHeadTurnY.current = THREE.MathUtils.lerp(curHeadTurnY.current, blendedHeadTargetYaw, 1 - Math.exp(-8 * safeDelta));
    curHeadTiltX.current = THREE.MathUtils.lerp(curHeadTiltX.current, blendedHeadTargetPitch, 1 - Math.exp(-8 * safeDelta));

    // Body follows head smoothly at 18% when settled
    if (!introActive || introFinishedRef.current) {
      const bodyFollowYaw = (curHeadTurnY.current - targetHeadYaw) * 0.18;
      finalYaw = lerpAngle(finalYaw, finalYaw + bodyFollowYaw, 0.25);
    }

    // Hover over LUMI
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

    // Dissolve hero stage disc
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

    // ─── 10. Eye Behavior ───
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

    // Breathing scale: 1.5% scale oscillation
    const breathingScale = 1.0 + Math.sin((t * Math.PI * 2) / 4.0) * 0.015;

    const lookTargetX = THREE.MathUtils.clamp(targetGazeX * 1.15 + saccadeOffsetRef.current.x, -1, 1);
    const lookTargetY = THREE.MathUtils.clamp(targetGazeY * 1.15 + saccadeOffsetRef.current.y, -1, 1);
    eyeLookRef.current.x = THREE.MathUtils.lerp(eyeLookRef.current.x, lookTargetX, 1 - Math.exp(-14 * safeDelta));
    eyeLookRef.current.y = THREE.MathUtils.lerp(eyeLookRef.current.y, lookTargetY, 1 - Math.exp(-14 * safeDelta));

    // ─── 11. Continuous Chapter Target Mood ───
    const isChapter5 = floatChapter >= 4.4 && floatChapter <= 5.6;
    let targetMood: LumiMood = kfA.mood;

    if (isChapter5) {
      targetMood = userMoodOverrideRef.current ?? 'happy';
    } else {
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

    // Push live 60fps values into animDataRef
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

    // Desktop render pass
    state.gl.autoClear = true;
    state.gl.setScissorTest(false);
    state.gl.setViewport(0, 0, state.size.width, state.size.height);
    if ('aspect' in state.camera) {
      (state.camera as THREE.PerspectiveCamera).aspect = state.size.width / state.size.height;
      state.camera.updateProjectionMatrix();
    }
    state.gl.render(state.scene, state.camera);
  }, 1);

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

      {/* Hero Flat Stage Disc & Ellipse */}
      <HeroFloorRing
        groupRef={heroDiscRef}
        centerX={isMobile ? 0 : isTablet ? 0 : 0.75}
        centerY={isMobile ? -0.72 : isTablet ? (0.38 - 0.772 * 0.58) : -0.772}
        scale={isMobile ? 0.46 : isTablet ? 0.58 : 1.0}
      />

      {/* Permanent Ground Shadow */}
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

  const isLowEnd = useIsLowEndDevice();
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  // On desktop, never disable WebGL. On mobile, fall back only if WebGL is unsupported or extreme low-end
  if (!isWebGLAvailable || (isMobile && isLowEnd)) {
    return null;
  }

  const handleTap = () => {
    window.dispatchEvent(new CustomEvent('lumi:tap-robot'));
  };

  return (
    <div
      className="canvas-container pointer-events-auto cursor-pointer"
      aria-hidden="true"
      onClick={handleTap}
      style={{ touchAction: 'pan-y' }}
    >
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 35 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)}
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

export function useIsLowEndDevice(): boolean {
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Desktop devices (>= 768px) should never be treated as low-end
    if (window.innerWidth >= 768) {
      setIsLowEnd(false);
      return;
    }
    const nav = navigator as any;
    const isLite =
      (nav.deviceMemory && nav.deviceMemory <= 2) ||
      (nav.connection && nav.connection.saveData);
    if (isLite) {
      setIsLowEnd(true);
    }
  }, []);

  return isLowEnd;
}


