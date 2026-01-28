import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  channelName: string;
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  queryKeysToInvalidate: readonly (readonly unknown[])[];
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime postgres_changes and invalidate React Query cache.
 *
 * This hook manages the full lifecycle of a Supabase Realtime channel:
 * - Creates channel subscription on mount (when enabled)
 * - Invalidates specified query keys when database changes occur
 * - Cleans up channel subscription on unmount
 *
 * @param options - Subscription configuration
 * @param options.channelName - Unique channel identifier (use REALTIME_CHANNELS)
 * @param options.table - Database table to subscribe to
 * @param options.filter - Optional postgres filter (e.g., "user_id=eq.abc123")
 * @param options.event - Event type: 'INSERT' | 'UPDATE' | 'DELETE' | '*' (default: '*')
 * @param options.queryKeysToInvalidate - React Query keys to invalidate on changes
 * @param options.enabled - Whether subscription is active (default: true)
 *
 * @example
 * useRealtimeSubscription({
 *   channelName: REALTIME_CHANNELS.COACH_TASK_UPDATES(userId),
 *   table: 'task_instances',
 *   filter: `coach_id=eq.${userId}`,
 *   queryKeysToInvalidate: [queryKeys.assignments.all],
 * });
 */
export function useRealtimeSubscription({
  channelName,
  table,
  filter,
  event = '*',
  queryKeysToInvalidate,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log(`[Realtime] ${channelName}:`, payload.eventType);

          // Invalidate all specified query keys (updates flow through React Query cache)
          queryKeysToInvalidate.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] ${channelName} error`);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount (immediate cleanup on navigation)
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, table, filter, event, enabled, queryClient, queryKeysToInvalidate]);

  return { channel: channelRef.current };
}
