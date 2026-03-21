'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useEffect, memo } from 'react';
import { useScroll } from '@/context/ScrollContext';
import * as THREE from 'three';

function RotatingBoxMesh({ scrollVelocity, index }) {
  const meshRef = useRef(null);
  const initialRotation = useRef([
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  ]);

  useFrame(() => {
    if (!meshRef.current) return;

    // Base rotation
    meshRef.current.rotation.x += 0.01 + scrollVelocity * 0.5;
    meshRef.current.rotation.y += 0.012 + scrollVelocity * 0.4;
    meshRef.current.rotation.z += 0.008 + scrollVelocity * 0.3;

    // Subtle floating animation
    meshRef.current.position.y = Math.sin(Date.now() * 0.001 + index) * 0.3;
  });

  return (
    <mesh ref={meshRef} scale={1}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhongMaterial
        color={new THREE.Color().setHSL(0.6 + index * 0.05, 0.7, 0.5)}
        emissive={new THREE.Color().setHSL(0.6 + index * 0.05, 0.7, 0.3)}
        wireframe={true}
        wireframeLinewidth={2}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

const RotatingBoxContent = memo(function RotatingBoxContent({ scrollVelocity }) {
  return (
    <>
      <perspectiveCamera position={[0, 0, 2.5]} fov={50} />
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.6} />
      <pointLight position={[-5, -5, 5]} intensity={0.3} color="#a78bfa" />
      <RotatingBoxMesh scrollVelocity={scrollVelocity} index={0} />
      <color attach="background" args={['#f3f4f6']} />
    </>
  );
}, (prevProps, nextProps) => {
  return prevProps.scrollVelocity === nextProps.scrollVelocity;
});

export const RotatingBox = memo(function RotatingBox() {
  const { scrollVelocity } = useScroll();

  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        precision: 'lowp',
      }}
      dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '16px',
      }}
      camera={{ position: [0, 0, 2.5], fov: 50 }}
    >
      <RotatingBoxContent scrollVelocity={scrollVelocity} />
    </Canvas>
  );
});

RotatingBox.displayName = 'RotatingBox';
