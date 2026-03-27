'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, memo } from 'react';
import { useScroll } from '@/context/ScrollContext';
import * as THREE from 'three';

function seededUnit(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function ParticleSystem({ scrollVelocity, scrollPercentage }) {
  const pointsRef = useRef(null);
  const particleCount = 100;

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const baseSeed = i + 1;
      pos[i * 3] = (seededUnit(baseSeed * 11) - 0.5) * 10;
      pos[i * 3 + 1] = (seededUnit(baseSeed * 13) - 0.5) * 10;
      pos[i * 3 + 2] = (seededUnit(baseSeed * 17) - 0.5) * 5;

      // Color variation
      const hue = 0.6 + seededUnit(baseSeed * 19) * 0.2;
      const saturation = 0.6 + seededUnit(baseSeed * 23) * 0.2;
      const lightness = 0.5 + seededUnit(baseSeed * 29) * 0.2;
      const color = new THREE.Color().setHSL(hue, saturation, lightness);

      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }

    return { positions: pos, colors: col };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position.array;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] += scrollVelocity * 10; // Move up with scroll velocity

      // Reset particle position when it goes off-screen
      if (positions[i * 3 + 1] > 10) {
        positions[i * 3 + 1] = -10;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.6 + scrollPercentage * 0.2}
      />
    </points>
  );
}

const ScrollParticlesContent = memo(function ScrollParticlesContent({
  scrollVelocity,
  scrollPercentage,
}) {
  return (
    <>
      <perspectiveCamera position={[0, 0, 5]} fov={75} />
      <ambientLight intensity={0.5} />
      <ParticleSystem scrollVelocity={scrollVelocity} scrollPercentage={scrollPercentage} />
      <color attach="background" args={['#ffffff']} />
    </>
  );
});

export const ScrollParticles = memo(function ScrollParticles() {
  const { scrollVelocity, scrollPercentage } = useScroll();

  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
      style={{
        width: '100%',
        height: '200px',
        display: 'block',
      }}
    >
      <ScrollParticlesContent scrollVelocity={scrollVelocity} scrollPercentage={scrollPercentage} />
    </Canvas>
  );
});

ScrollParticles.displayName = 'ScrollParticles';
