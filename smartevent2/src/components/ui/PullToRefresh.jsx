import React, { useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Native-style Pull-to-Refresh wrapper.
 * Wrap any scrollable page content with this component.
 * onRefresh must return a Promise.
 */
export default function PullToRefresh({ children, onRefresh, threshold = 72 }) {
  const startYRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startYRef.current === null || refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) { startYRef.current = null; return; }
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 8) {
      e.preventDefault();
      setPullDistance(Math.min(delta * 0.5, threshold + 20));
    }
  }, [refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(threshold);
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    startYRef.current = null;
  }, [pullDistance, threshold, refreshing, onRefresh]);

  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const spin = refreshing || pullDistance >= threshold;

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto min-h-screen"
      style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center transition-all duration-200 overflow-hidden"
        style={{ height: pullDistance, opacity: indicatorOpacity }}
      >
        <div className={`w-8 h-8 rounded-full bg-[#001E44] flex items-center justify-center shadow-md transition-transform ${spin ? 'scale-100' : 'scale-75'}`}>
          <Loader2 className={`w-4 h-4 text-white ${spin ? 'animate-spin' : ''}`} />
        </div>
      </div>
      {children}
    </div>
  );
}
