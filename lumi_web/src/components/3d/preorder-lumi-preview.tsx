'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { LumiGLBModel } from '@/components/3d/lumi-custom-model';
import * as THREE from 'three';

function PreorderLumiStage() {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      const targetYaw = hovered ? Math.sin(t * 1.5) * 0.25 : Math.sin(t * 0.8) * 0.12;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetYaw, delta * 3);
      groupRef.current.position.y = 0.28 + Math.sin(t * 1.6) * 0.008;
    }
  });

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 4]} intensity={1.3} />
      <directionalLight position={[-4, 4, -2]} intensity={0.4} />
      <hemisphereLight intensity={0.4} groundColor="#E7E4F0" color="#FFFFFF" />

      {/* Soft circular ground contact disc directly beneath wheels */}
      <mesh position={[0, -0.40, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#DDD9E8" transparent opacity={0.5} />
      </mesh>

      <group
        ref={groupRef}
        position={[0, 0.28, 0]}
        scale={[0.88, 0.88, 0.88]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <LumiGLBModel mood="happy" />
      </group>
    </>
  );
}

export function PreorderLumiPreview({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full h-full relative cursor-pointer select-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0.0, 2.35], fov: 28 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <PreorderLumiStage />
      </Canvas>
    </div>
  );
}
