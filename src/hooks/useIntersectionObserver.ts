import { useRef, useEffect, useCallback } from 'react';

interface UseIntersectionObserverProps {
  onIntersect: () => void;
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Hook for observing when an element enters the viewport.
 * Used for infinite scroll to trigger loading when sentinel is visible.
 *
 * @param onIntersect - Callback fired when element enters viewport
 * @param enabled - Whether to observe (default: true)
 * @param threshold - Visibility threshold 0-1 (default: 0)
 * @param rootMargin - Margin around root (default: '100px' for preloading)
 * @returns Ref to attach to the sentinel element
 */
export function useIntersectionObserver({
  onIntersect,
  enabled = true,
  threshold = 0,
  rootMargin = '100px',
}: UseIntersectionObserverProps) {
  const targetRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && enabled) {
        onIntersect();
      }
    },
    [onIntersect, enabled]
  );

  useEffect(() => {
    const target = targetRef.current;
    if (!target || !enabled) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [handleIntersect, threshold, rootMargin, enabled]);

  return targetRef;
}
