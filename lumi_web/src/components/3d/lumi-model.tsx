'use client';

/**
 * Procedural LUMI 3D Model
 *
 * Telepresence robot featuring:
 * - Dark rounded-rectangle screen with crisp OLED eye rendering
 * - 7 distinct eye shapes (happy, neutral, sleep, angry, upset, sad, love)
 * - Visible camera lens module with metallic bezel and optical aperture
 * - Sound wave rings (04 Talk)
 * - Wheel rotation and ground path trail (06 Drive)
 * - Cutaway mode showing two 18650 cells & USB-C port (07 Power)
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type LumiMood = 'happy' | 'neutral' | 'sleep' | 'angry' | 'upset' | 'sad' | 'love';

// ─── Face Texture Generator ──────────────────────────────────────────

function drawFaceMood(ctx: CanvasRenderingContext2D, mood: LumiMood, width: number, height: number) {
  ctx.save();

  // Full OLED dark screen plate
  ctx.fillStyle = '#141220';
  ctx.fillRect(0, 0, width, height);

  // Subtle glass reflection highlight across top half
  const grad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height * 0.45);

  // Eye centers
  const eyeLeftX = width * 0.33;
  const eyeRightX = width * 0.67;
  const eyeY = height * 0.50;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
  ctx.shadowBlur = 12;

  switch (mood) {
    case 'happy': {
      // Gentle upward smiling eye arches (^ ^)
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeLeftX, eyeY + 14, 34, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(eyeRightX, eyeY + 14, 34, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();

      // Cheerful subtle smile
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(width * 0.5, eyeY + 44, 22, Math.PI * 0.2, Math.PI * 0.8, false);
      ctx.stroke();
      break;
    }

    case 'neutral': {
      // Clean, bright open round oval eyes (● ●)
      ctx.beginPath();
      ctx.ellipse(eyeLeftX, eyeY, 26, 34, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eyeRightX, eyeY, 26, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'sleep': {
      // Relaxed closed eye horizontal curved slits (- -)
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eyeLeftX - 30, eyeY + 4);
      ctx.quadraticCurveTo(eyeLeftX, eyeY + 16, eyeLeftX + 30, eyeY + 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(eyeRightX - 30, eyeY + 4);
      ctx.quadraticCurveTo(eyeRightX, eyeY + 16, eyeRightX + 30, eyeY + 4);
      ctx.stroke();
      break;
    }

    case 'angry': {
      // Angled furrowed brow wedge eyes (> <)
      ctx.beginPath();
      ctx.moveTo(eyeLeftX - 30, eyeY - 18);
      ctx.lineTo(eyeLeftX + 28, eyeY + 4);
      ctx.lineTo(eyeLeftX + 24, eyeY + 24);
      ctx.lineTo(eyeLeftX - 30, eyeY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(eyeRightX + 30, eyeY - 18);
      ctx.lineTo(eyeRightX - 28, eyeY + 4);
      ctx.lineTo(eyeRightX - 24, eyeY + 24);
      ctx.lineTo(eyeRightX + 30, eyeY + 6);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'upset': {
      // Asymmetric distressed eyes (one high squint, one perturbed)
      ctx.beginPath();
      ctx.ellipse(eyeLeftX, eyeY - 6, 26, 30, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eyeRightX - 28, eyeY + 14);
      ctx.quadraticCurveTo(eyeRightX, eyeY - 8, eyeRightX + 28, eyeY + 6);
      ctx.stroke();
      break;
    }

    case 'sad': {
      // Downward drooping sorrowful curves (∩ ∩)
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(eyeLeftX, eyeY + 22, 34, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(eyeRightX, eyeY + 22, 34, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();

      // Drooping mouth
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(width * 0.5, eyeY + 54, 20, Math.PI * 1.2, Math.PI * 1.8, false);
      ctx.stroke();
      break;
    }

    case 'love': {
      // Cute heart shaped eyes (♥ ♥)
      const drawHeart = (cx: number, cy: number, size: number) => {
        ctx.beginPath();
        const topCurveHeight = size * 0.3;
        ctx.moveTo(cx, cy + size * 0.35);
        ctx.bezierCurveTo(cx, cy + topCurveHeight * 0.3, cx - size * 0.5, cy - topCurveHeight * 0.8, cx - size * 0.5, cy - topCurveHeight * 0.2);
        ctx.bezierCurveTo(cx - size * 0.5, cy + topCurveHeight * 0.6, cx, cy + size * 0.8, cx, cy + size);
        ctx.bezierCurveTo(cx, cy + size * 0.8, cx + size * 0.5, cy + topCurveHeight * 0.6, cx + size * 0.5, cy - topCurveHeight * 0.2);
        ctx.bezierCurveTo(cx + size * 0.5, cy - topCurveHeight * 0.8, cx, cy + topCurveHeight * 0.3, cx, cy + size * 0.35);
        ctx.closePath();
        ctx.fill();
      };

      drawHeart(eyeLeftX, eyeY - 26, 46);
      drawHeart(eyeRightX, eyeY - 26, 46);
      break;
    }
  }

  ctx.restore();
}

// ─── Sound Waves for 04 Talk ────────────────────────────────────────

function SoundRings({ active }: { active: boolean }) {
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const ring3 = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!active) return;
    const t = state.clock.elapsedTime * 1.5;

    const updateRing = (mesh: THREE.Mesh, offset: number) => {
      if (!mesh) return;
      const progress = (t + offset) % 1;
      const scale = 0.5 + progress * 1.6;
      mesh.scale.set(scale, scale, scale);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, (1 - progress) * 0.65);
      }
    };

    updateRing(ring1.current, 0);
    updateRing(ring2.current, 0.33);
    updateRing(ring3.current, 0.66);
  });

  if (!active) return null;

  return (
    <group position={[0, 0.45, 0.3]}>
      <mesh ref={ring1} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.3, 0.33, 32]} />
        <meshBasicMaterial color="#6D4AE0" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.3, 0.33, 32]} />
        <meshBasicMaterial color="#6D4AE0" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring3} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.3, 0.33, 32]} />
        <meshBasicMaterial color="#6D4AE0" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Path Trail for 06 Drive ────────────────────────────────────────

function PathTrail({ active }: { active: boolean }) {
  const trailRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!active || !trailRef.current) return;
    const mat = trailRef.current.material as THREE.MeshBasicMaterial;
    if (mat) {
      mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    }
  });

  if (!active) return null;

  return (
    <group position={[0, -0.66, -0.6]}>
      {/* Illuminated path on the ground behind wheels */}
      <mesh ref={trailRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 1.8]} />
        <meshBasicMaterial color="#6D4AE0" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Left wheel track */}
      <mesh position={[-0.48, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, 1.8]} />
        <meshBasicMaterial color="#A78BFA" transparent opacity={0.7} />
      </mesh>
      {/* Right wheel track */}
      <mesh position={[0.48, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, 1.8]} />
        <meshBasicMaterial color="#A78BFA" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// ─── Main LUMI Model ────────────────────────────────────────────────

export interface LumiModelProps {
  mood?: LumiMood;
  showBattery?: boolean;
  wheelSpin?: number;
  idleAnimation?: boolean;
  showSoundRings?: boolean;
  showPathTrail?: boolean;
}

export function LumiModel({
  mood = 'happy',
  showBattery = false,
  wheelSpin = 0,
  idleAnimation = true,
  showSoundRings = false,
  showPathTrail = false,
}: LumiModelProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const wheelLRef = useRef<THREE.Mesh>(null!);
  const wheelRRef = useRef<THREE.Mesh>(null!);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Initialize canvas texture for face screen
  const screenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 340;
    screenCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawFaceMood(ctx, mood, canvas.width, canvas.height);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    screenTextureRef.current = texture;
    return texture;
  }, []);

  // Update canvas texture whenever mood changes
  useEffect(() => {
    if (screenCanvasRef.current && screenTextureRef.current) {
      const ctx = screenCanvasRef.current.getContext('2d');
      if (ctx) {
        drawFaceMood(ctx, mood, screenCanvasRef.current.width, screenCanvasRef.current.height);
        screenTextureRef.current.needsUpdate = true;
      }
    }
  }, [mood]);

  // Materials
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({
      color: '#F7F6FB',
      roughness: 0.28,
      metalness: 0.05,
      transparent: showBattery,
      opacity: showBattery ? 0.38 : 1.0,
      roughnessMap: null,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: '#6D4AE0',
      roughness: 0.35,
      metalness: 0.15,
    }),
    screenFrame: new THREE.MeshStandardMaterial({
      color: '#0E0C18',
      roughness: 0.2,
      metalness: 0.5,
    }),
    screenFace: new THREE.MeshStandardMaterial({
      map: screenTexture ?? undefined,
      roughness: 0.15,
      metalness: 0.05,
      emissive: '#100E1C',
      emissiveIntensity: 0.1,
    }),
    cameraBody: new THREE.MeshStandardMaterial({
      color: '#1A1826',
      roughness: 0.2,
      metalness: 0.6,
    }),
    cameraRing: new THREE.MeshStandardMaterial({
      color: '#9CA3AF',
      roughness: 0.2,
      metalness: 0.85,
    }),
    cameraLens: new THREE.MeshStandardMaterial({
      color: '#1D3B6A',
      roughness: 0.1,
      metalness: 0.7,
      emissive: '#2563EB',
      emissiveIntensity: 0.25,
    }),
    cameraLED: new THREE.MeshBasicMaterial({
      color: '#22C55E',
    }),
    wheel: new THREE.MeshStandardMaterial({
      color: '#2E2A42',
      roughness: 0.6,
      metalness: 0.2,
    }),
    batteryCell: new THREE.MeshStandardMaterial({
      color: '#16A34A',
      roughness: 0.35,
      metalness: 0.2,
    }),
    batteryCap: new THREE.MeshStandardMaterial({
      color: '#D1D5DB',
      roughness: 0.15,
      metalness: 0.9,
    }),
    usbc: new THREE.MeshStandardMaterial({
      color: '#A1A1AA',
      roughness: 0.25,
      metalness: 0.8,
      emissive: showBattery ? '#6D4AE0' : '#000000',
      emissiveIntensity: showBattery ? 0.4 : 0,
    }),
  }), [showBattery, screenTexture]);

  // Animation frame loop
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (groupRef.current && idleAnimation) {
      groupRef.current.position.y = Math.sin(t * 0.9) * 0.04;
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.02;
    }

    if (wheelSpin !== 0) {
      if (wheelLRef.current) wheelLRef.current.rotation.x += wheelSpin * 0.03;
      if (wheelRRef.current) wheelRRef.current.rotation.x += wheelSpin * 0.03;
    }
  });

  return (
    <group ref={groupRef} name="lumi-root">
      {/* ── Body: Rounded capsule ── */}
      <group name="body">
        <mesh material={materials.body} castShadow receiveShadow>
          <capsuleGeometry args={[0.45, 0.52, 16, 32]} />
        </mesh>

        {/* Accent mid-ring */}
        <mesh position={[0, -0.08, 0]} material={materials.accent}>
          <torusGeometry args={[0.46, 0.022, 12, 36]} />
        </mesh>
      </group>

      {/* ── Screen: Dark rounded-rectangle display plate ── */}
      <group name="screen" position={[0, 0.12, 0.46]}>
        {/* Screen Bezel Frame */}
        <mesh material={materials.screenFrame} position={[0, 0, 0]}>
          <boxGeometry args={[0.56, 0.38, 0.03]} />
        </mesh>

        {/* Real Product Face Screen with dynamic canvas texture */}
        <mesh material={materials.screenFace} position={[0, 0, 0.018]}>
          <planeGeometry args={[0.52, 0.34]} />
        </mesh>
      </group>

      {/* ── Camera: Distinct lens module above screen ── */}
      <group name="camera" position={[0, 0.38, 0.45]} rotation={[-0.08, 0, 0]}>
        {/* Camera outer housing */}
        <mesh material={materials.cameraBody}>
          <cylinderGeometry args={[0.055, 0.055, 0.035, 24]} />
        </mesh>
        {/* Metallic Bezel Ring */}
        <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={materials.cameraRing}>
          <torusGeometry args={[0.042, 0.007, 12, 24]} />
        </mesh>
        {/* Optical Glass Lens */}
        <mesh position={[0, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]} material={materials.cameraLens}>
          <circleGeometry args={[0.036, 24]} />
        </mesh>
        {/* Pinhole Aperture */}
        <mesh position={[0, 0, 0.024]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.012, 16]} />
          <meshBasicMaterial color="#0A0910" />
        </mesh>
        {/* Active Camera Status Micro-LED */}
        <mesh position={[0.068, 0, 0.018]}>
          <circleGeometry args={[0.006, 12]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
      </group>

      {/* ── Wheels ── */}
      <mesh
        ref={wheelLRef}
        name="wheel_L"
        position={[-0.50, -0.52, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={materials.wheel}
        castShadow
      >
        <cylinderGeometry args={[0.13, 0.13, 0.07, 24]} />
      </mesh>

      <mesh
        ref={wheelRRef}
        name="wheel_R"
        position={[0.50, -0.52, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={materials.wheel}
        castShadow
      >
        <cylinderGeometry args={[0.13, 0.13, 0.07, 24]} />
      </mesh>

      {/* ── 04 Talk: Sound Rings ── */}
      <SoundRings active={showSoundRings} />

      {/* ── 06 Drive: Path Trail ── */}
      <PathTrail active={showPathTrail} />

      {/* ── 07 Power: Cutaway showing two 18650 cells ── */}
      {showBattery && (
        <group name="battery-cutaway" position={[0, -0.12, 0]}>
          {/* Cell 1 (Left 18650) */}
          <group position={[-0.12, 0, 0]}>
            <mesh material={materials.batteryCell}>
              <cylinderGeometry args={[0.065, 0.065, 0.34, 20]} />
            </mesh>
            <mesh position={[0, 0.18, 0]} material={materials.batteryCap}>
              <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
            </mesh>
            <mesh position={[0, -0.175, 0]} material={materials.batteryCap}>
              <cylinderGeometry args={[0.055, 0.055, 0.01, 16]} />
            </mesh>
          </group>

          {/* Cell 2 (Right 18650) */}
          <group position={[0.12, 0, 0]}>
            <mesh material={materials.batteryCell}>
              <cylinderGeometry args={[0.065, 0.065, 0.34, 20]} />
            </mesh>
            <mesh position={[0, 0.18, 0]} material={materials.batteryCap}>
              <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
            </mesh>
            <mesh position={[0, -0.175, 0]} material={materials.batteryCap}>
              <cylinderGeometry args={[0.055, 0.055, 0.01, 16]} />
            </mesh>
          </group>
        </group>
      )}

      {/* ── USB-C Port (rear bottom) ── */}
      <group name="usbc" position={[0, -0.36, -0.44]}>
        <mesh material={materials.usbc}>
          <boxGeometry args={[0.09, 0.035, 0.025]} />
        </mesh>
        {/* Port interior slot */}
        <mesh position={[0, 0, -0.014]}>
          <boxGeometry args={[0.06, 0.018, 0.005]} />
          <meshBasicMaterial color="#111116" />
        </mesh>
      </group>
    </group>
  );
}

export default LumiModel;
