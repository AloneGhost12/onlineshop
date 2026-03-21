'use client';

import { useEffect } from 'react';
import { useDebug } from '@/context/DebugContext';

export function usePerformanceMonitor() {
  const { updatePerformanceMetrics } = useDebug();

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;
    let animationFrameId;

    const measureFPS = (currentTime) => {
      frameCount++;
      const deltaTime = currentTime - lastTime;

      // Update FPS every 1000ms
      if (deltaTime >= 1000) {
        fps = Math.round((frameCount * 1000) / deltaTime);
        frameCount = 0;
        lastTime = currentTime;

        // Get memory usage if available
        let memory = 0;
        if (performance.memory) {
          memory = Math.round(performance.memory.usedJSHeapSize / 1048576); // Convert to MB
        }

        updatePerformanceMetrics({
          fps,
          memory,
          lastFpsUpdate: currentTime,
        });
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [updatePerformanceMetrics]);
}
