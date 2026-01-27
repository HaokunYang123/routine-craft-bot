import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface InfiniteScrollSentinelProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

/**
 * Invisible sentinel element that triggers pagination when scrolled into view.
 * Place at the bottom of a scrollable list.
 */
export function InfiniteScrollSentinel({
  onLoadMore,
  hasMore,
  isLoading,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useIntersectionObserver({
    onIntersect: onLoadMore,
    enabled: hasMore && !isLoading,
  });

  // 1px height so it's nearly invisible but still observable
  return <div ref={sentinelRef} className="h-px" aria-hidden="true" />;
}
