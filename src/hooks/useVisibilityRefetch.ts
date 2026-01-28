import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Refetches specified queries when tab becomes visible again.
 *
 * Handles silent WebSocket disconnections that occur when browser backgrounds the tab.
 * This is a fallback mechanism - don't rely on realtime being 100% reliable.
 *
 * @param queryKeys - Array of React Query keys to invalidate on visibility change
 *
 * @example
 * // In a coach dashboard component
 * useVisibilityRefetch([
 *   queryKeys.assignments.all,
 *   queryKeys.groups.all,
 * ]);
 */
export function useVisibilityRefetch(queryKeys: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Visibility] Tab visible, refetching queries');
        // Refetch on tab focus to catch missed updates
        queryKeys.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, queryKeys]);
}
