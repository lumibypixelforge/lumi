'use client';

/**
 * Official LUMI GLB Model Component — Revision 3 (Refined)
 *
 * Implements:
 * - Direct node mapping: LUMI -> body, head, screen, wheel_L, wheel_R
 * - 1536x1371 CanvasTexture (flipY = false, sRGB, anisotropy 8, no mipmaps, LinearFilter)
 * - Anti-glare screen material: roughness 0.35, clearcoat 0, envMapIntensity 0 (eliminates grey blob)
 *   Emissive white with emissiveMap, intensity 1.6. Static 6% diagonal sheen in texture.
 * - Parametric eye engine with soft glow + crisp passes, eyelids, and 8 expressive moods.
 * - Canvas updates capped at 30 fps max for buttery performance.
 * - Props permanently mounted: Sound Rings (04), Floor Trail (06), Thin Floor Ring (07, 15% opacity).
 * - Smooth head pivot (X nod, Y turn) with damped spring smoothing.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  renderLumiFace,
  type EyeAnimationState,
  type EyeParams,
  MOOD_PRESETS,
  interpolateEyeParams,
} from './eye-engine';
import type { LumiMood } from './eye-engine';
import { scrollStore } from '../providers/smooth-scroll';

export interface LumiSceneAnimationData {
  mood: LumiMood;
  eyeLookX: number;
  eyeLookY: number;
  eyeOpenness: number;
  eyeScale: number;
  twinklePhase: number;
  wheelSpinL: number;
  wheelSpinR: number;
  headTiltX: number;
  headTurnY: number;
  soundRingsOpacity: number;
  dottedTrailOpacity: number;
  floorGlowOpacity: number;
  trailLength: number;
  fadeOpacity: number;
}

export interface LumiGLBProps {
  mood?: LumiMood;
  animDataRef?: React.RefObject<LumiSceneAnimationData>;
  eyeLookX?: number;
  eyeLookY?: number;
  eyeOpenness?: number;
  eyeScale?: number;
  twinklePhase?: number;
  wheelSpinL?: number;
  wheelSpinR?: number;
  soundRingsOpacity?: number;
  dottedTrailOpacity?: number;
  floorGlowOpacity?: number;
  trailLength?: number;
  fadeOpacity?: number;
  scale?: number;
  headTiltX?: number;
  headTurnY?: number;
}

// ─── 04 Voice: Permanently Mounted Sound Rings (faded via opacity) ───

function VoiceSoundRings({ opacity = 0 }: { opacity: number }) {
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const ring3 = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (opacity <= 0.005) return;
    const t = state.clock.elapsedTime * 1.8;
    [ring1, ring2, ring3].forEach((r, i) => {
      if (r.current) {
        const offset = (t + i * 0.33) % 1.0;
        const s = 0.6 + offset * 1.5;
        r.current.scale.set(s, s, s);
        const mat = r.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - offset) * 0.45 * opacity);
      }
    });
  });

  return (
    <group position={[0, 0.48, 0.38]} visible={opacity > 0.005}>
      <mesh ref={ring1}>
        <ringGeometry args={[0.22, 0.235, 48]} />
        <meshBasicMaterial color="#5FF3FF" transparent opacity={0.4 * opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ring2}>
        <ringGeometry args={[0.22, 0.235, 48]} />
        <meshBasicMaterial color="#5FF3FF" transparent opacity={0.4 * opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ring3}>
        <ringGeometry args={[0.22, 0.235, 48]} />
        <meshBasicMaterial color="#5FF3FF" transparent opacity={0.4 * opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── 06 Mobility: Permanently Mounted Floor Trail (faded via opacity) ─

function MobilityDottedTrail({ opacity = 0, length = 1 }: { opacity: number; length?: number }) {
  const dots = useMemo(() => {
    const list: Array<[number, number]> = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const z = -0.3 - i * 0.12;
      list.push([0, z]);
    }
    return list;
  }, []);

  return (
    <group position={[0, -0.221, 0]} visible={opacity > 0.005}>
      {dots.map(([x, z], i) => {
        const isLengthVisible = i < length * 16;
        if (!isLengthVisible) return null;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.024, 16]} />
            <meshBasicMaterial
              color="#6D4AE0"
              transparent
              opacity={Math.max(0, (0.65 - i * 0.035) * opacity)}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── 07 Power: Thin Floor Ring at 15% Opacity ───────────────────────

function PowerFloorGlow({ opacity = 0 }: { opacity: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (opacity <= 0.005 || !meshRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1.0 + Math.sin(t * 1.5) * 0.04;
    meshRef.current.scale.set(pulse, pulse, 1);
  });

  return (
    <group position={[0, -0.221, 0]} visible={opacity > 0.005}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.38, 64]} />
        <meshBasicMaterial
          color="#5FF3FF"
          transparent
          opacity={0.15 * opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Main LUMI GLB Model Component ───────────────────────────────────

export function LumiGLBModel({
  mood = 'happy',
  animDataRef,
  eyeLookX = 0,
  eyeLookY = 0,
  eyeOpenness = 1.0,
  eyeScale = 1.0,
  twinklePhase = 0,
  wheelSpinL = 0,
  wheelSpinR = 0,
  soundRingsOpacity = 0,
  dottedTrailOpacity = 0,
  floorGlowOpacity = 0,
  trailLength = 1,
  fadeOpacity = 1.0,
  scale = 1.0,
  headTiltX = 0,
  headTurnY = 0,
  ...props
}: LumiGLBProps) {
  // Load official GLB asset
  const { scene } = useGLTF('/models/lumi.glb');

  // Clone scene so local material and transform overrides don't conflict
  const modelScene = useMemo(() => scene.clone(true), [scene]);

  // Node references mapped from the GLTF tree
  const nodesRef = useRef<{
    head?: THREE.Object3D;
    screen?: THREE.Mesh;
    wheelL?: THREE.Object3D;
    wheelR?: THREE.Object3D;
    body?: THREE.Object3D;
  }>({});

  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Eye morphing state
  const currentParamsRef = useRef<EyeParams>({ ...MOOD_PRESETS['happy'] });
  const targetParamsRef = useRef<EyeParams>({ ...MOOD_PRESETS['happy'] });
  const morphProgressRef = useRef(1.0);
  const prevMoodRef = useRef<LumiMood>('happy');

  const lastDrawTimeRef = useRef(0);

  // Setup dynamic screen canvas texture with anti-glare material
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 686;
    screenCanvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderLumiFace(ctx, canvas.width, canvas.height, {
        mood,
        params: MOOD_PRESETS[mood] ?? MOOD_PRESETS['happy'],
        lookX: eyeLookX,
        lookY: eyeLookY,
        openness: eyeOpenness,
        scale: eyeScale,
        twinklePhase,
        time: 0,
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    screenTextureRef.current = tex;

    // Auto-scale to match LUMI's target height (0.88m) if model scale is small (e.g. 0.1m)
    const bbox = new THREE.Box3().setFromObject(modelScene);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    if (size.y < 0.5) {
      const scaleFactor = 0.882 / size.y;
      modelScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
      modelScene.updateMatrixWorld(true);
    }

    // Align model so wheels contact the stage floor (-0.222) and center X/Z at 0
    const finalBbox = new THREE.Box3().setFromObject(modelScene);
    const finalCenter = new THREE.Vector3();
    finalBbox.getCenter(finalCenter);

    const wheelL = modelScene.getObjectByName('wheel_L');
    const wheelR = modelScene.getObjectByName('wheel_R');
    let wheelAxleZ = finalCenter.z;
    let wheelBottomY = finalBbox.min.y;

    if (wheelL && wheelR) {
      const bL = new THREE.Box3().setFromObject(wheelL);
      const bR = new THREE.Box3().setFromObject(wheelR);
      const wheelCenter = new THREE.Vector3();
      bL.clone().union(bR).getCenter(wheelCenter);
      wheelAxleZ = wheelCenter.z;
      wheelBottomY = Math.min(bL.min.y, bR.min.y);
    }

    modelScene.position.x = -finalCenter.x;
    modelScene.position.z = -wheelAxleZ;
    modelScene.position.y = -0.222 - wheelBottomY;

    const mats: THREE.Material[] = [];

    // Traverse modelScene to cache nodes and apply materials
    modelScene.traverse((child) => {
      const name = child.name;

      if (name === 'head') nodesRef.current.head = child;
      if (name === 'wheel_L') nodesRef.current.wheelL = child;
      if (name === 'wheel_R') nodesRef.current.wheelR = child;
      if (name === 'body') nodesRef.current.body = child;

      if (child instanceof THREE.Mesh) {
        if (name === 'screen') {
          nodesRef.current.screen = child;

          // Anti-glare deep OLED black screen glass
          const mat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0x020202), // Pitch-black glossy OLED glass
            roughness: 0.12,
            clearcoat: 0.9,
            clearcoatRoughness: 0.08,
            metalness: 0.05,
            envMapIntensity: 0.12,
            emissive: new THREE.Color(0xffffff),
            emissiveMap: tex,
            emissiveIntensity: 2.3, // Glowing neon eyes
            transparent: true,
          });
          child.material = mat;
          mats.push(mat);
        } else {
          // Body, head, wheels: ensure standard PBR materials with transparency for fade
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => {
              const cloned = m.clone();
              cloned.transparent = true;
              mats.push(cloned);
              return cloned;
            });
          } else if (child.material) {
            const cloned = child.material.clone();
            cloned.transparent = true;
            mats.push(cloned);
            child.material = cloned;
          }
        }
      }
    });

    materialsRef.current = mats;
  }, [modelScene]);

  // Handle prop mood changes fallback
  useEffect(() => {
    if (mood !== prevMoodRef.current) {
      prevMoodRef.current = mood;
      targetParamsRef.current = { ...(MOOD_PRESETS[mood] ?? MOOD_PRESETS['happy']) };
      morphProgressRef.current = 0;
    }
  }, [mood]);

  // Handle real-time mood change events for instant reactivity
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onSetMood = (e: Event) => {
      const customEvent = e as CustomEvent<LumiMood>;
      const newMood = customEvent.detail;
      if (newMood && MOOD_PRESETS[newMood]) {
        prevMoodRef.current = newMood;
        targetParamsRef.current = { ...MOOD_PRESETS[newMood] };
        currentParamsRef.current = { ...MOOD_PRESETS[newMood] };
        morphProgressRef.current = 1.0;
        if (screenCanvasRef.current && screenTextureRef.current) {
          const ctx = screenCanvasRef.current.getContext('2d');
          if (ctx) {
            renderLumiFace(ctx, screenCanvasRef.current.width, screenCanvasRef.current.height, {
              mood: newMood,
              params: MOOD_PRESETS[newMood],
              lookX: 0,
              lookY: 0,
              openness: 1.0,
              scale: 1.0,
              twinklePhase: 0,
              time: performance.now() / 1000,
            });
            screenTextureRef.current.needsUpdate = true;
          }
        }
      }
    };

    window.addEventListener('lumi:set-mood', onSetMood);
    return () => {
      window.removeEventListener('lumi:set-mood', onSetMood);
    };
  }, []);

  // Cache and clone all materials so opacity fading works seamlessly before footer
  const materialsRef = useRef<THREE.Material[]>([]);

  useEffect(() => {
    materialsRef.current.forEach((mat) => {
      mat.opacity = fadeOpacity;
    });
  }, [fadeOpacity]);

  // Frame animations (Wheels, Head Nod, Head Turn, Eye Morphing)
  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 1 / 30);
    const now = state.clock.elapsedTime;

    // Read live animated properties from animDataRef if provided
    const anim = animDataRef?.current;
    const currentMood = anim ? anim.mood : mood;
    const currentWheelL = anim ? anim.wheelSpinL : wheelSpinL;
    const currentWheelR = anim ? anim.wheelSpinR : wheelSpinR;
    const currentHeadTiltX = anim ? anim.headTiltX : headTiltX;
    const currentHeadTurnY = anim ? anim.headTurnY : headTurnY;
    const currentLookX = anim ? anim.eyeLookX : eyeLookX;
    const currentLookY = anim ? anim.eyeLookY : eyeLookY;
    const currentOpenness = anim ? anim.eyeOpenness : eyeOpenness;
    const currentScale = anim ? anim.eyeScale : eyeScale;
    const currentTwinkle = anim ? anim.twinklePhase : twinklePhase;

    // Detect mood change on EVERY frame with zero frame delay!
    if (currentMood !== prevMoodRef.current) {
      prevMoodRef.current = currentMood;
      targetParamsRef.current = { ...(MOOD_PRESETS[currentMood] ?? MOOD_PRESETS['happy']) };
      morphProgressRef.current = 0;
    }

    // Live material opacity fading before footer
    if (anim && materialsRef.current.length > 0) {
      const targetOp = anim.fadeOpacity;
      if (materialsRef.current[0].opacity !== targetOp) {
        for (let i = 0; i < materialsRef.current.length; i++) {
          materialsRef.current[i].opacity = targetOp;
        }
      }
    }

    // 1. Wheel rotation around X-axis (radius = 0.22)
    if (currentWheelL !== 0 && nodesRef.current.wheelL) {
      nodesRef.current.wheelL.rotation.x += (currentWheelL / 0.22) * safeDelta;
    }
    if (currentWheelR !== 0 && nodesRef.current.wheelR) {
      nodesRef.current.wheelR.rotation.x += (currentWheelR / 0.22) * safeDelta;
    }

    // 2. Head pivot at neck: nod (X) and turn (Y) with spring damping
    if (nodesRef.current.head) {
      nodesRef.current.head.rotation.x = THREE.MathUtils.lerp(
        nodesRef.current.head.rotation.x,
        currentHeadTiltX,
        1 - Math.exp(-8 * safeDelta)
      );
      nodesRef.current.head.rotation.y = THREE.MathUtils.lerp(
        nodesRef.current.head.rotation.y,
        currentHeadTurnY,
        1 - Math.exp(-8 * safeDelta)
      );
    }

    // 3. Parametric eye morphing progress with smoothstep
    if (morphProgressRef.current < 1.0) {
      morphProgressRef.current = Math.min(1.0, morphProgressRef.current + safeDelta / 0.32);
      const p = morphProgressRef.current;
      const easeP = p * p * (3 - 2 * p); // smoothstep
      currentParamsRef.current = interpolateEyeParams(
        currentParamsRef.current,
        targetParamsRef.current,
        easeP
      );
    }

    // 4. Redraw face texture:
    // When actively scrolling, throttle face redraws so touch momentum and R3F have 100% frame budget.
    // During active facial animations (blinking, morphing), redraw at 30fps.
    // During static idle, throttle to 15fps.
    const isActivelyAnimating =
      morphProgressRef.current < 1.0 ||
      Math.abs(currentOpenness - 1.0) > 0.02 ||
      Math.abs(currentScale - 1.0) > 0.02;

    const isScrolling = scrollStore.isScrolling;
    const minRedrawInterval = isScrolling ? 0.05 : isActivelyAnimating ? 0.033 : 0.066;

    if (now - lastDrawTimeRef.current >= minRedrawInterval) {
      lastDrawTimeRef.current = now;
      if (screenCanvasRef.current && screenTextureRef.current) {
        const ctx = screenCanvasRef.current.getContext('2d');
        if (ctx) {
          const eyeState: EyeAnimationState = {
            mood: currentMood,
            params: currentParamsRef.current,
            lookX: currentLookX,
            lookY: currentLookY,
            openness: currentOpenness,
            scale: currentScale,
            twinklePhase: currentTwinkle,
            time: now,
          };
          renderLumiFace(ctx, screenCanvasRef.current.width, screenCanvasRef.current.height, eyeState);
          screenTextureRef.current.needsUpdate = true;
        }
      }
    }
  });

  const anim = animDataRef?.current;
  const liveSoundRings = anim ? anim.soundRingsOpacity : soundRingsOpacity;
  const liveDottedTrail = anim ? anim.dottedTrailOpacity : dottedTrailOpacity;
  const liveFloorGlow = anim ? anim.floorGlowOpacity : floorGlowOpacity;
  const liveTrailLength = anim ? anim.trailLength : trailLength;

  return (
    <group scale={[scale, scale, scale]} position={[0, -0.55, 0]} {...props}>
      <primitive object={modelScene} />
      <VoiceSoundRings opacity={liveSoundRings} />
      <MobilityDottedTrail opacity={liveDottedTrail} length={liveTrailLength} />
      <PowerFloorGlow opacity={liveFloorGlow} />
    </group>
  );
}

useGLTF.preload('/models/lumi.glb');
