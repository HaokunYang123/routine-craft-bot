# Phase 16: Realtime Subscriptions - Research

**Researched:** 2026-01-28
**Domain:** Supabase Realtime + React Query Cache Integration
**Confidence:** HIGH

## Summary

This phase implements realtime data synchronization between coach and student views using Supabase Realtime's `postgres_changes` feature, integrated with the existing React Query cache infrastructure. The project already has a partial implementation in `CoachDashboard.tsx` that subscribes to `task_instances` changes, providing a foundation to build upon.

The standard approach combines Supabase Realtime subscriptions with React Query's `invalidateQueries` for cache updates. This "invalidate and refetch" pattern is recommended by TkDodo (React Query maintainer) for most use cases because it's simpler, type-safe, and leverages existing query logic. For optimistic UI (task completion checkbox), the project already implements `setQueryData` in `onMutate` with rollback on error.

The primary challenge is handling silent disconnections in backgrounded applications. Supabase recommends a dual-layer approach: enable `worker: true` for heartbeat stability and implement `heartbeatCallback` for reconnection detection. On reconnect, data must be refetched since WebSocket messages during disconnection are lost.

**Primary recommendation:** Use `invalidateQueries` on realtime events to update React Query cache, organize subscriptions by role (coach vs student), implement visibility-based reconnection, and clean up channels immediately on navigation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.90.1 | Supabase client with Realtime | Already installed; includes postgres_changes |
| @tanstack/react-query | ^5.83.0 | Cache management | Already installed; v5 with queryClient |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lodash/throttle | (if needed) | Debounce rapid updates | Only if batch flicker becomes an issue |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual invalidation | @supabase-cache-helpers | Auto-cache updates but adds dependency; manual is clearer for this scope |
| invalidateQueries | setQueryData | Direct updates are complex with filtered queries; invalidation is simpler |

**Installation:**
```bash
# No new dependencies required - stack already complete
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── useRealtimeSubscription.ts     # Reusable subscription hook
├── lib/
│   └── realtime/
│       ├── channels.ts                # Channel name constants
│       ├── handlers.ts                # Event handler factories
│       └── types.ts                   # Realtime payload types
```

### Pattern 1: Centralized Subscription Hook
**What:** A custom hook that manages Supabase Realtime subscriptions with automatic cleanup and React Query integration
**When to use:** All components needing realtime updates

**Example:**
```typescript
// Source: TkDodo blog + Supabase docs
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  channelName: string;
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  queryKeysToInvalidate: readonly unknown[][];
  enabled?: boolean;
}

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

          // Invalidate all specified query keys
          queryKeysToInvalidate.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] ${channelName} error`);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount (per CONTEXT.md: immediate cleanup on navigation)
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, table, filter, event, enabled, queryClient, queryKeysToInvalidate]);

  return { channel: channelRef.current };
}
```

### Pattern 2: Role-Based Channel Organization
**What:** Separate channels for coach and student subscriptions to manage RLS filtering
**When to use:** Different users need different data scopes

**Example:**
```typescript
// src/lib/realtime/channels.ts
export const REALTIME_CHANNELS = {
  // Coach channels - see all student updates in their groups
  COACH_TASK_UPDATES: (coachId: string) => `coach-tasks-${coachId}`,
  COACH_CHECKINS: (coachId: string) => `coach-checkins-${coachId}`,

  // Student channels - only see own assignments
  STUDENT_ASSIGNMENTS: (studentId: string) => `student-assignments-${studentId}`,
} as const;
```

### Pattern 3: Visibility-Based Reconnection
**What:** Detect tab visibility changes and refetch on reconnect
**When to use:** Handle silent disconnections from backgrounded tabs

**Example:**
```typescript
// Source: Supabase troubleshooting docs
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useVisibilityRefetch(queryKeys: readonly unknown[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch on tab focus to catch missed updates
        queryKeys.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, queryKeys]);
}
```

### Anti-Patterns to Avoid
- **Global wildcard subscriptions:** Don't subscribe to `table: '*'` - creates unnecessary load and bypasses RLS optimization
- **Direct state updates from realtime:** Don't bypass React Query cache - causes DevTools invisibility and cache inconsistency
- **Polling fallback:** Per CONTEXT.md, no polling - just keep trying to reconnect
- **Toast notifications on sync:** Per CONTEXT.md, updates should be invisible to users

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection | Custom retry logic | Supabase client built-in + visibility handler | Handles exponential backoff, auth token refresh |
| Cache invalidation | Manual state merging | React Query invalidateQueries | Handles stale-while-revalidate, deduplication |
| Optimistic updates | Local state tracking | React Query onMutate/onError | Already implemented in useAssignments.ts |
| Subscription cleanup | Manual tracking | useEffect cleanup return | React handles component lifecycle |
| Message ordering | Sequence tracking | Supabase Realtime guarantee | Single-threaded processing maintains order |

**Key insight:** The existing codebase already has optimistic update patterns in `useAssignments.ts`. Realtime should complement this, not replace it. Use `invalidateQueries` on realtime events; the existing optimistic UI handles instant feedback for user actions.

## Common Pitfalls

### Pitfall 1: Silent Disconnections in Background Tabs
**What goes wrong:** Browser throttles JavaScript timers when tab is backgrounded, preventing WebSocket heartbeats. Connection silently drops, messages are lost.
**Why it happens:** Chrome/Edge pause timers after ~10 seconds of background. Mobile browsers are more aggressive.
**How to avoid:**
1. Enable `worker: true` in Supabase client config (uses Web Worker for heartbeat)
2. Implement visibility change handler to refetch on tab focus
3. Don't rely on realtime being 100% reliable - always have fresh data on visibility change
**Warning signs:** Console shows CHANNEL_ERROR or CLOSED status, data appears stale after tab switch

### Pitfall 2: Thundering Herd on Reconnect
**What goes wrong:** Many clients reconnect simultaneously after server update, all refetch same data
**Why it happens:** Invalidation triggers immediate refetch for all active queries
**How to avoid:**
1. Use specific query keys (not broad invalidation)
2. Consider staggered reconnection if needed
3. For this app scale, not a concern - addressed at larger scale only
**Warning signs:** Supabase dashboard shows request spikes after reconnect

### Pitfall 3: RLS Not Filtering Realtime Events
**What goes wrong:** Assuming RLS policies automatically filter realtime events
**Why it happens:** Realtime DOES respect RLS, but requires proper policy setup
**How to avoid:**
1. Verify RLS policies are enabled on tables (`task_instances`, `student_logs`, etc.)
2. Add explicit filters in subscription when possible (`filter: 'assignee_id=eq.${userId}'`)
3. Test with multiple users to verify isolation
**Warning signs:** User receives updates for other users' data

### Pitfall 4: Memory Leaks from Unclean Subscription Cleanup
**What goes wrong:** Subscriptions persist after component unmount, causing duplicate handlers
**Why it happens:** Missing cleanup in useEffect, or async operations completing after unmount
**How to avoid:**
1. Always return cleanup function from useEffect
2. Use `supabase.removeChannel(channel)` not just unsubscribe
3. Store channel reference in useRef for cleanup access
**Warning signs:** Console shows duplicate event logs, memory usage grows over time

### Pitfall 5: Flicker During Rapid Updates
**What goes wrong:** Multiple rapid realtime events cause visible UI flicker
**Why it happens:** Each event triggers invalidation + refetch cycle
**How to avoid:**
1. Per CONTEXT.md: "Batch updates apply all at once (no flicker)"
2. Use debounced invalidation (lodash/throttle) if needed
3. React Query's built-in deduplication helps
**Warning signs:** Checkbox state toggles rapidly, list items flash

## Code Examples

Verified patterns from official sources:

### Supabase Realtime Subscription
```typescript
// Source: Supabase docs - postgres_changes
const channel = supabase
  .channel('db-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'task_instances',
      filter: `assignee_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Change received:', payload);
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Realtime connected');
    }
  });

// Cleanup
supabase.removeChannel(channel);
```

### React Query Invalidation on Realtime Event
```typescript
// Source: TkDodo blog - Using WebSockets with React Query
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/keys';

// In realtime callback:
const handleRealtimeEvent = (payload) => {
  const queryClient = useQueryClient();

  // Invalidate specific queries based on event
  if (payload.table === 'task_instances') {
    queryClient.invalidateQueries({
      queryKey: queryKeys.assignments.all
    });
  }
};
```

### Client Configuration for Reconnection
```typescript
// Source: Supabase troubleshooting docs
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    // Enable Web Worker for heartbeat stability
    worker: true,
    // Callback for disconnect detection
    heartbeatCallback: (status) => {
      if (status === 'disconnected') {
        console.log('[Realtime] Disconnected, will auto-reconnect');
      }
    },
  },
});
```

### Optimistic UI with Rollback (Existing Pattern)
```typescript
// Source: src/hooks/useAssignments.ts (already implemented)
const updateTaskStatusMutation = useMutation({
  mutationFn: async ({ taskId, status }) => {
    // Server call
  },
  onMutate: async ({ taskId, status, assigneeId, date }) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.assignments.all });
    const instancesKey = queryKeys.assignments.instances({ assigneeId, date });
    const previousTasks = queryClient.getQueryData(instancesKey);

    // Optimistic update
    queryClient.setQueryData(instancesKey, (old) =>
      old?.map((t) => t.id === taskId ? { ...t, status } : t)
    );

    return { previousTasks, instancesKey };
  },
  onError: (_err, _vars, context) => {
    // Rollback on error
    queryClient.setQueryData(context.instancesKey, context.previousTasks);
    toast({ title: "Error", variant: "destructive" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for updates | WebSocket subscriptions | Supabase Realtime v2 (2023) | Instant updates, reduced load |
| Manual cache merging | React Query invalidation | TkDodo pattern (2022+) | Simpler, type-safe |
| Global subscriptions | Filtered subscriptions | Always best practice | Better performance, RLS alignment |
| No reconnection handling | Visibility + heartbeat | 2024-2025 mobile fixes | Handles background tab issues |

**Deprecated/outdated:**
- `supabase.from('table').on('*', callback)` - Old subscription API, now use `.channel().on('postgres_changes', ...)`
- Direct state manipulation from WebSocket - Bypass cache, causes inconsistency

## Open Questions

Things that couldn't be fully resolved:

1. **Web Worker Support in Vite/PWA**
   - What we know: `worker: true` option exists in Supabase client
   - What's unclear: Whether Vite PWA plugin handles the worker bundling automatically
   - Recommendation: Test during implementation; if issues, skip worker option and rely on visibility handler

2. **RLS Policy Coverage for Realtime**
   - What we know: RLS is enabled on tables, but policies need verification for realtime events
   - What's unclear: Whether current policies explicitly cover INSERT/UPDATE for coach-student relationships
   - Recommendation: Verify during implementation with multi-user testing; may need policy updates

3. **Infinite Query Integration**
   - What we know: `useInfiniteClients.ts` exists for paginated data
   - What's unclear: How realtime updates interact with infinite query pagination
   - Recommendation: Per CONTEXT.md "Paginated lists: only current page gets live updates" - may need specific handling

## Sources

### Primary (HIGH confidence)
- [Supabase Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) - Core subscription API
- [TkDodo: Using WebSockets with React Query](https://tkdodo.eu/blog/using-web-sockets-with-react-query) - Integration patterns
- [Supabase Silent Disconnections Guide](https://supabase.com/docs/guides/troubleshooting/realtime-handling-silent-disconnections-in-backgrounded-applications-592794) - Reconnection handling

### Secondary (MEDIUM confidence)
- [React Query Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) - Official TanStack docs
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - RLS + Realtime

### Tertiary (LOW confidence)
- [GitHub: supabase/realtime reconnection issues](https://github.com/orgs/supabase/discussions/27513) - Community patterns (needs validation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing installed libraries, well-documented patterns
- Architecture: HIGH - Based on TkDodo's authoritative patterns and existing codebase patterns
- Pitfalls: HIGH - Documented in official Supabase troubleshooting guides

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable patterns, Supabase Realtime is mature)
