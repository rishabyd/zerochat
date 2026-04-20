'use client';

import { useEffect, useState } from 'react';

// Custom hook to detect mobile devices for responsive UI adjustments
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if window is available (client-side only)
    if (typeof window !== 'undefined') {
      // Define mobile breakpoint and check screen width
      const checkIsMobile = () => {
        setIsMobile(window.innerWidth < 768); // 768px is typical mobile breakpoint
      };

      // Check on mount
      checkIsMobile();

      // Add resize listener to update on screen size changes
      window.addEventListener('resize', checkIsMobile);

      // Cleanup listener on unmount
      return () => window.removeEventListener('resize', checkIsMobile);
    }
  }, []);

  // Return false during SSR and initial hydration to prevent mismatches
  return mounted ? isMobile : false;
}
