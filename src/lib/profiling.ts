/**
 * Performance profiling utilities for React DevTools workflow.
 * Use with React.Profiler to measure component render times.
 *
 * Usage:
 * ```tsx
 * import { Profiler } from 'react';
 * import { onRenderCallback, PERF_THRESHOLD_MS } from '@/lib/profiling';
 *
 * <Profiler id="MyComponent" onRender={onRenderCallback}>
 *   <MyComponent />
 * </Profiler>
 * ```
 */

// Performance threshold from user decision (14-CONTEXT.md)
export const PERF_THRESHOLD_MS = 50;

/**
 * Callback for React.Profiler that logs slow renders.
 * Only logs in development mode when render exceeds threshold.
 */
export function onRenderCallback(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
): void {
  // Only log in development
  if (process.env.NODE_ENV !== 'development') return;

  // Log all renders for profiling, warn on slow ones
  if (actualDuration > PERF_THRESHOLD_MS) {
    console.warn(
      `[Perf] SLOW: ${id} ${phase} took ${actualDuration.toFixed(2)}ms ` +
      `(base: ${baseDuration.toFixed(2)}ms)`
    );
  } else {
    console.log(
      `[Perf] ${id} ${phase}: ${actualDuration.toFixed(2)}ms`
    );
  }
}

/**
 * Helper to format profiling results for documentation.
 */
export function formatProfilingResult(
  componentId: string,
  phase: string,
  actualDuration: number,
  baseDuration: number
): string {
  const status = actualDuration > PERF_THRESHOLD_MS ? 'SLOW' : 'OK';
  return `| ${componentId} | ${phase} | ${actualDuration.toFixed(2)}ms | ${baseDuration.toFixed(2)}ms | ${status} |`;
}
