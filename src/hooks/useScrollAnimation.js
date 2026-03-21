'use client';

import { useScroll } from '@/context/ScrollContext';
import { useEffect, useRef, useState } from 'react';

export function useScrollAnimation() {
  const scrollData = useScroll();
  const [sectionProgress, setSectionProgress] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);

        if (entry.isIntersecting) {
          // Calculate progress of element within viewport (0-1)
          const rect = entry.boundingClientRect;
          const viewportHeight = window.innerHeight;

          // When element is at bottom of viewport (0), when at top (1)
          const progress = 1 - (rect.top / viewportHeight);
          setSectionProgress(Math.max(0, Math.min(1, progress)));
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  return {
    scrollData,
    sectionProgress,
    isInView,
    elementRef,
    scrollPercentage: scrollData.scrollPercentage,
    scrollVelocity: scrollData.scrollVelocity,
    isScrolling: scrollData.isScrolling,
  };
}

export function useScrollPercentage(targetElement) {
  const [progress, setProgress] = useState(0);
  const scrollData = useScroll();

  useEffect(() => {
    if (!targetElement) return;

    const updateProgress = () => {
      const rect = targetElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate progress: 0 when element is at bottom, 1 when at top
      const elementProgress = 1 - (rect.top / viewportHeight);
      const clampedProgress = Math.max(0, Math.min(1, elementProgress));

      setProgress(clampedProgress);
    };

    updateProgress();

    // Update on scroll (already throttled in ScrollContext)
    const handleScroll = () => {
      requestAnimationFrame(updateProgress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [targetElement, scrollData.scrollY]);

  return progress;
}

// Hook to track if user is actively scrolling
export function useIsScrolling() {
  return useScroll().isScrolling;
}

// Hook to get scroll velocity
export function useScrollVelocity() {
  return useScroll().scrollVelocity;
}
