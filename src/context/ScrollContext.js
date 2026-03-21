'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ScrollContext = createContext();

export function ScrollProvider({ children }) {
  const [scrollY, setScrollY] = useState(0);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [lastScrollTime, setLastScrollTime] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Calculate scroll percentage (0-1)
    const maxScroll = documentHeight - windowHeight;
    const currentPercentage = maxScroll > 0 ? currentScrollY / maxScroll : 0;

    // Calculate scroll velocity
    const now = Date.now();
    const timeDiff = now - lastScrollTime;
    if (timeDiff > 0) {
      const yDiff = currentScrollY - lastScrollY;
      setScrollVelocity(yDiff / timeDiff); // pixels per millisecond
    }

    setScrollY(currentScrollY);
    setScrollPercentage(currentPercentage);
    setIsScrolling(true);
    setLastScrollY(currentScrollY);
    setLastScrollTime(now);

    // Reset isScrolling flag after user stops scrolling
    if (window.scrollTimeout) {
      clearTimeout(window.scrollTimeout);
    }
    window.scrollTimeout = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [lastScrollY, lastScrollTime]);

  useEffect(() => {
    // Throttle scroll events to roughly 60fps (16ms)
    let ticking = false;

    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
        setTimeout(() => {
          ticking = false;
        }, 16);
      }
    };

    window.addEventListener('scroll', throttledScroll);
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (window.scrollTimeout) {
        clearTimeout(window.scrollTimeout);
      }
    };
  }, [handleScroll]);

  const value = {
    scrollY,
    scrollPercentage,
    isScrolling,
    scrollVelocity,
  };

  return (
    <ScrollContext.Provider value={value}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll() {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within ScrollProvider');
  }
  return context;
}
