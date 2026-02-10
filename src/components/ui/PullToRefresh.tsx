import { type ReactNode, type TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PULL_THRESHOLD_PX = 60;
const MAX_PULL_PX = 100;

function getScrollableTop(target: EventTarget | null) {
  if (typeof window === "undefined") return 0;

  let node = target as HTMLElement | null;
  while (node) {
    const styles = window.getComputedStyle(node);
    const canScroll =
      (styles.overflowY === "auto" || styles.overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight;
    if (canScroll) {
      return node.scrollTop;
    }
    node = node.parentElement;
  }

  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const startYRef = useRef<number | null>(null);
  const canPullRef = useRef(false);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updateIsTouch = () => {
      setIsTouchDevice(mediaQuery.matches || navigator.maxTouchPoints > 0);
    };

    updateIsTouch();
    mediaQuery.addEventListener("change", updateIsTouch);
    return () => mediaQuery.removeEventListener("change", updateIsTouch);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, [onRefresh, refreshing]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (refreshing) return;

    const scrollTop = getScrollableTop(event.target);
    canPullRef.current = scrollTop <= 0;
    startYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (refreshing || !canPullRef.current || startYRef.current == null) return;

    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const delta = currentY - startYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      pullDistanceRef.current = 0;
      return;
    }

    const nextDistance = Math.min(delta * 0.5, MAX_PULL_PX);
    setPullDistance(nextDistance);
    pullDistanceRef.current = nextDistance;
  };

  const handleTouchEnd = () => {
    if (refreshing) return;

    if (canPullRef.current && pullDistanceRef.current >= PULL_THRESHOLD_PX) {
      void triggerRefresh();
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }

    canPullRef.current = false;
    startYRef.current = null;
  };

  const showPullIndicator = isTouchDevice && (pullDistance > 0 || refreshing);
  const shouldLiftContent = isTouchDevice && (pullDistance > 0 || refreshing);
  const translateY = refreshing ? 24 : pullDistance;

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showPullIndicator && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-sm">
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <ArrowDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  pullDistance >= PULL_THRESHOLD_PX && "rotate-180 text-foreground"
                )}
              />
            )}
          </div>
        </div>
      )}

      {!isTouchDevice && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Refresh page"
          disabled={refreshing}
          onClick={() => void triggerRefresh()}
          className="fixed right-5 top-20 z-30 h-9 w-9 rounded-full border-border/80 bg-card/90 shadow-sm backdrop-blur-sm"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      )}

      <div
        className={cn("transition-transform duration-150", shouldLiftContent && "will-change-transform")}
        style={shouldLiftContent ? { transform: `translateY(${translateY}px)` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
