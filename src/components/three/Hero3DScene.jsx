'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import { useScroll } from '@/context/ScrollContext';
import * as THREE from 'three';

function RotatingGeometry({ index, scrollPercentage }) {
  const meshRef = useRef(null);

  useFrame(() => {
    if (!meshRef.current) return;

    // Rotate based on time
    meshRef.current.rotation.x += 0.003 + index * 0.001;
    meshRef.current.rotation.y += 0.002 + index * 0.0015;
    meshRef.current.rotation.z += 0.001;

    // Scale pulsing effect
    const pulse = 1 + Math.sin(Date.now() * 0.0005) * 0.1;
    meshRef.current.scale.set(pulse, pulse, pulse);

    // Fade based on scroll percentage
    meshRef.current.material.opacity = Math.max(0, 1 - scrollPercentage * 1.5);
  });

  return (
    <mesh ref={meshRef} position={[-3 + index * 2, 0, 0]}>
      <icosahedronGeometry args={[1, 3]} />
      <meshPhongMaterial
        color={new THREE.Color().setHSL(0.5 + index * 0.1, 0.7, 0.5)}
        emissive={new THREE.Color().setHSL(0.5 + index * 0.1, 0.7, 0.3)}
        transparent
        opacity={0.8}
        wireframe={false}
      />
    </mesh>
  );
}

function Hero3DSceneContent() {
  const { scrollPercentage } = useScroll();
  const containerRef = useRef(null);

  return (
    <>
      <perspectiveCamera position={[0, 0, 8]} fov={75} />

      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, 10]} intensity={0.4} color="#6366f1" />

      {/* Render multiple rotating geometries */}
      {[0, 1, 2, 3].map((index) => (
        <RotatingGeometry
          key={index}
          index={index}
          scrollPercentage={scrollPercentage}
        />
      ))}

      {/* Background gradient */}
      <color attach="background" args={['#0f172a']} />
    </>
  );
}

export default function Hero3DScene() {
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      dpr={typeof window !== 'undefined' ? window.devicePixelRatio : 1}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <Hero3DSceneContent />
    </Canvas>
  );
}
