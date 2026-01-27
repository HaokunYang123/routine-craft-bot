# Phase 11: Complex Hook Migration - Research

**Researched:** 2026-01-26
**Domain:** React Query v5 migration for complex hooks with nested queries and utility functions
**Confidence:** HIGH

## Summary

This phase migrates three complex hooks (useAssignments, useRecurringSchedules, useStickers) from useState/useEffect patterns to React Query. Unlike Phase 10's simple hooks, these hooks have distinct complexity characteristics:

1. **useAssignments** - Primarily a utility hook (not auto-fetching). Contains `createAssignment` (complex multi-step mutation), `getTaskInstances` (parameterized query), `updateTaskStatus` (mutation), and `getGroupProgress` (waterfall query with 5 nested fetches). The complexity lies in multi-step mutations and parameterized on-demand queries.

2. **useRecurringSchedules** - Auto-fetching hook with nested data enrichment (fetches template names, student names, class names after main query). Handles PGRST205 gracefully. CRUD operations with cache invalidation.

3. **useStickers** - Auto-fetching hook with parallel queries (stickers, userStickers, completedTasks) and client-side derived state (streak calculation). Contains `rollForSticker` mutation with randomized logic.

The migration pattern established in Phase 10 applies for auto-fetching hooks (useRecurringSchedules, useStickers), but useAssignments requires a different approach: keep utility functions as-is, only migrate operations that benefit from caching.

**Primary recommendation:** Migrate useRecurringSchedules fully to useQuery. Migrate useStickers to useQueries (parallel fetching) with combine option. For useAssignments, migrate only `getTaskInstances` and `getGroupProgress` to on-demand queries with parameterized keys; keep mutations as regular async functions with invalidateQueries.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.83.0 | Data fetching, caching, sync | Already installed; industry standard |
| vitest | ^4.0.18 | Test runner | Already configured |
| @testing-library/react | ^16.3.2 | Hook/component testing | renderHook + waitFor |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^3.6.0 | Date manipulation | Used in useAssignments for scheduling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useQueries for useStickers | Multiple useQuery | useQueries with combine is cleaner for related parallel data |
| useMutation for createAssignment | Keep async function | useMutation adds overhead for complex multi-step mutations; invalidateQueries is sufficient |

**Installation:**
```bash
# No new packages needed - all already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useAssignments.ts      # Mixed: utility functions + selective React Query
│   ├── useRecurringSchedules.ts  # Full migration to useQuery
│   └── useStickers.ts         # Migration to useQueries with combine
├── lib/
│   └── queries/
│       └── keys.ts            # Query key factory (already has assignments, stickers, recurringSchedules)
```

### Pattern 1: Nested Data Enrichment (useRecurringSchedules)

**What:** Main query + parallel enrichment queries combined into single result
**When to use:** When base data needs to be enriched with related names/details

```typescript
// Source: TanStack Query parallel queries + combine pattern
async function fetchSchedulesWithEnrichment(userId: string): Promise<RecurringSchedule[]> {
  const { data: schedules, error } = await supabase
    .from("recurring_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    // Handle PGRST205 gracefully per D-1003-01
    if (error.code === "PGRST205" || error.message?.includes("not find")) {
      return [];
    }
    throw error;
  }

  if (!schedules?.length) return [];

  // Collect IDs for batch fetching
  const templateIds = [...new Set(schedules.filter(s => s.template_id).map(s => s.template_id!))];
  const studentIds = [...new Set(schedules.filter(s => s.assigned_student_id).map(s => s.assigned_student_id!))];
  const classIds = [...new Set(schedules.filter(s => s.class_session_id).map(s => s.class_session_id!))];

  // Parallel fetch enrichment data
  const [templates, profiles, classes] = await Promise.all([
    templateIds.length > 0
      ? supabase.from("templates").select("id, name").in("id", templateIds)
      : { data: [] },
    studentIds.length > 0
      ? supabase.from("profiles").select("user_id, display_name").in("user_id", studentIds)
      : { data: [] },
    classIds.length > 0
      ? supabase.from("class_sessions").select("id, name").in("id", classIds)
      : { data: [] },
  ]);

  // Build lookup maps
  const templateMap = Object.fromEntries((templates.data || []).map(t => [t.id, t.name]));
  const studentMap = Object.fromEntries((profiles.data || []).map(p => [p.user_id, p.display_name || "Student"]));
  const classMap = Object.fromEntries((classes.data || []).map(c => [c.id, c.name]));

  // Enrich schedules
  return schedules.map(s => ({
    ...s,
    template_name: s.template_id ? templateMap[s.template_id] : undefined,
    student_name: s.assigned_student_id ? studentMap[s.assigned_student_id] : undefined,
    class_name: s.class_session_id ? classMap[s.class_session_id] : undefined,
  }));
}

export function useRecurringSchedules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: schedules,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.recurringSchedules.list(user?.id ?? ''),
    queryFn: () => fetchSchedulesWithEnrichment(user!.id),
    enabled: !!user,
  });

  return {
    schedules: schedules ?? [],
    loading: isPending,          // Backward compatible
    isFetching,
    isError,
    error,
    fetchSchedules: refetch,
    // CRUD methods with invalidateQueries...
  };
}
```

### Pattern 2: Parallel Queries with useQueries and combine (useStickers)

**What:** Multiple related queries executed in parallel with combined result
**When to use:** When component needs multiple independent data sources that belong together

```typescript
// Source: TanStack Query useQueries with combine option
export function useStickers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: ['stickers', 'all'],
        queryFn: async () => {
          const { data, error } = await supabase.from("stickers").select("*");
          if (error) throw error;
          return data || [];
        },
        enabled: !!user,
      },
      {
        queryKey: queryKeys.stickers.byUser(user?.id ?? ''),
        queryFn: async () => {
          const { data, error } = await supabase
            .from("user_stickers")
            .select("*, sticker:stickers(*)")
            .eq("user_id", user!.id)
            .order("earned_at", { ascending: false });
          if (error) throw error;
          return data || [];
        },
        enabled: !!user,
      },
      {
        queryKey: ['tasks', 'completed', user?.id ?? ''],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("tasks")
            .select("completed_at")
            .eq("user_id", user!.id)
            .eq("is_completed", true)
            .order("completed_at", { ascending: false });
          if (error) throw error;
          return data || [];
        },
        enabled: !!user,
      },
    ],
    combine: (results) => {
      const [stickersResult, userStickersResult, tasksResult] = results;

      // Calculate streak from completed tasks (moved from useEffect)
      const streak = calculateStreak(tasksResult.data || []);

      return {
        stickers: stickersResult.data || [],
        userStickers: (userStickersResult.data || []) as UserSticker[],
        streak,
        isPending: results.some(r => r.isPending),
        isFetching: results.some(r => r.isFetching),
        isError: results.some(r => r.isError),
        error: results.find(r => r.error)?.error,
      };
    },
  });

  // rollForSticker mutation stays as async function
  // ...

  return {
    stickers: results.stickers,
    userStickers: results.userStickers,
    streak: results.streak,
    loading: results.isPending,
    isFetching: results.isFetching,
    isError: results.isError,
    error: results.error,
    rollForSticker,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.stickers.byUser(user?.id ?? '') }),
  };
}

function calculateStreak(completedTasks: { completed_at: string | null }[]): number {
  const dates = completedTasks
    .filter(t => t.completed_at !== null)
    .map(t => new Date(t.completed_at!).toDateString());
  const uniqueDates = [...new Set(dates)];

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let currentStreak = 0;
  if (uniqueDates.includes(today)) {
    currentStreak = 1;
    let checkDate = new Date(Date.now() - 86400000);
    while (uniqueDates.includes(checkDate.toDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else if (uniqueDates.includes(yesterday)) {
    let checkDate = new Date(Date.now() - 86400000);
    while (uniqueDates.includes(checkDate.toDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  return currentStreak;
}
```

### Pattern 3: Utility Hook with On-Demand Queries (useAssignments)

**What:** Hook provides utility functions that can leverage React Query caching when beneficial
**When to use:** When hook is primarily imperative (mutations, on-demand fetches) not declarative

**Key insight:** useAssignments doesn't auto-fetch. It provides:
- `createAssignment` - Complex mutation, keep as async function with invalidateQueries
- `getTaskInstances` - On-demand parameterized query, can benefit from caching
- `updateTaskStatus` - Simple mutation, keep as async function
- `getGroupProgress` - On-demand parameterized query with waterfall, can benefit from caching

```typescript
// Source: TanStack Query imperative fetching discussion
export function useAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Note: This hook does NOT auto-fetch. It provides utility functions.
  // We use queryClient.fetchQuery for on-demand fetches that benefit from caching.

  const getTaskInstances = useCallback(async (
    filters: {
      assigneeId?: string;
      groupId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      includeFullHistory?: boolean;
    }
  ): Promise<TaskInstance[]> => {
    try {
      // Use fetchQuery to leverage caching
      return await queryClient.fetchQuery({
        queryKey: queryKeys.assignments.instances({
          assigneeId: filters.assigneeId,
          date: filters.date,
          startDate: filters.startDate,
        }),
        queryFn: async () => {
          let query = supabase
            .from("task_instances")
            .select("*")
            .order("scheduled_date", { ascending: true })
            .order("scheduled_time", { ascending: true });

          // Apply filters...
          if (filters.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
          if (filters.date) query = query.eq("scheduled_date", filters.date);
          // ... other filters

          const { data, error } = await query;
          if (error) throw error;
          return data || [];
        },
        staleTime: 30 * 1000, // 30 seconds - task instances change frequently
      });
    } catch (error) {
      handleError(error, { component: 'useAssignments', action: 'fetch task instances', silent: true });
      return [];
    }
  }, [queryClient]);

  const getGroupProgress = useCallback(async (groupId: string, date?: string) => {
    const targetDate = date || format(new Date(), "yyyy-MM-dd");

    try {
      // Use fetchQuery for caching - progress data is frequently accessed
      return await queryClient.fetchQuery({
        queryKey: queryKeys.assignments.progress(groupId, targetDate),
        queryFn: async () => {
          // Waterfall queries - necessary for this data shape
          // ... existing implementation
        },
        staleTime: 60 * 1000, // 1 minute - progress updates matter
      });
    } catch (error) {
      handleError(error, { component: 'useAssignments', action: 'get group progress', silent: true });
      return { completed: 0, total: 0, members: [], overdueCount: 0 };
    }
  }, [queryClient]);

  // Mutations stay as async functions
  const createAssignment = useCallback(async (input: CreateAssignmentInput) => {
    // ... existing implementation
    // Add invalidateQueries at the end
    await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    return assignment;
  }, [user, toast, queryClient]);

  const updateTaskStatus = useCallback(async (taskId: string, status: string, note?: string) => {
    // ... existing implementation
    // Add invalidateQueries at the end
    await queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    return true;
  }, [toast, queryClient]);

  return {
    loading: false, // No auto-fetch, always ready
    createAssignment,
    getTaskInstances,
    updateTaskStatus,
    getGroupProgress,
  };
}
```

### Anti-Patterns to Avoid

- **Don't use useQuery for utility-only hooks:** If hook doesn't auto-fetch, don't force it into useQuery. Use queryClient.fetchQuery for on-demand caching.
- **Don't create waterfall queries where parallel is possible:** The enrichment pattern should batch IDs and fetch in parallel.
- **Don't duplicate cache keys:** Use the existing queryKeys factory - it already has assignments, stickers, recurringSchedules.
- **Don't break return interface:** Keep `loading` property name even though React Query uses `isPending`.
- **Don't add per-hook error toasts:** Global QueryCache.onError handles toasts (D-0901-03).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parallel data fetching | Promise.all in useEffect | useQueries with combine | Automatic loading/error state management |
| Cache invalidation | Manual state updates | queryClient.invalidateQueries | Handles all cache entries matching key |
| On-demand cached fetch | useState + fetch | queryClient.fetchQuery | Gets cached data if fresh, fetches if stale |
| Derived state from queries | useEffect + setState | useQueries combine option | Structurally stable, no sync issues |

**Key insight:** The complexity of these hooks comes from multiple data sources and nested queries. React Query's useQueries and fetchQuery handle the complexity; don't replicate it with useState/useEffect.

## Common Pitfalls

### Pitfall 1: Using useQuery for utility hooks
**What goes wrong:** Hook mounts and immediately fires query even when component just wants mutation functions
**Why it happens:** Defaulting to useQuery pattern from Phase 10
**How to avoid:** Analyze hook usage - if no auto-fetch needed, use queryClient.fetchQuery for on-demand queries
**Warning signs:** Unnecessary network requests on mount, loading state when component hasn't requested data

### Pitfall 2: Waterfall in enrichment queries
**What goes wrong:** Fetch schedules, then fetch templates, then fetch profiles, then fetch classes (4 roundtrips)
**Why it happens:** Sequential await calls
**How to avoid:** Collect all IDs first, then Promise.all for parallel fetches
**Warning signs:** Slow initial load, network waterfall in DevTools

### Pitfall 3: Missing PGRST205 handling
**What goes wrong:** Hook throws error when table doesn't exist
**Why it happens:** Forgetting D-1003-01 decision
**How to avoid:** Always check for PGRST205 in complex hooks, return empty array
**Warning signs:** Error state when user has no data yet

### Pitfall 4: Breaking streak calculation with useQueries
**What goes wrong:** Streak shows 0 while queries are loading
**Why it happens:** Not handling isPending state in combine
**How to avoid:** Use combine option's structural sharing; streak derived from data, undefined when pending
**Warning signs:** Streak flickers between values during refetch

### Pitfall 5: Cache key conflicts with parameterized queries
**What goes wrong:** getTaskInstances returns wrong data for different filter combinations
**Why it happens:** Not including all filters in query key
**How to avoid:** Include all filter parameters in queryKeys.assignments.instances
**Warning signs:** Stale data when changing filters

### Pitfall 6: Over-invalidation
**What goes wrong:** Every mutation invalidates all assignments queries, causing excessive refetches
**Why it happens:** Using queryKeys.assignments.all for invalidation
**How to avoid:** Use more specific invalidation when possible (e.g., just instances for status update)
**Warning signs:** Multiple refetches on single mutation

## Code Examples

### Complete Migrated useRecurringSchedules Hook
```typescript
// src/hooks/useRecurringSchedules.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { handleError } from "@/lib/error";
import { queryKeys } from "@/lib/queries/keys";
import type { Tables } from "@/integrations/supabase/types";

type RecurringScheduleRow = Tables<"recurring_schedules">;

export interface RecurringSchedule extends RecurringScheduleRow {
  template_name?: string;
  student_name?: string;
  class_name?: string;
}

async function fetchSchedulesWithEnrichment(userId: string): Promise<RecurringSchedule[]> {
  const { data: schedules, error } = await supabase
    .from("recurring_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    // Handle PGRST205 gracefully per D-1003-01
    if (error.code === "PGRST205" || error.message?.includes("not find")) {
      return [];
    }
    throw error;
  }

  if (!schedules?.length) return [];

  // Collect IDs for batch fetching (avoid waterfall)
  const templateIds = [...new Set(schedules.filter(s => s.template_id).map(s => s.template_id!))];
  const studentIds = [...new Set(schedules.filter(s => s.assigned_student_id).map(s => s.assigned_student_id!))];
  const classIds = [...new Set(schedules.filter(s => s.class_session_id).map(s => s.class_session_id!))];

  // Parallel fetch enrichment data
  const [templates, profiles, classes] = await Promise.all([
    templateIds.length > 0
      ? supabase.from("templates").select("id, name").in("id", templateIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    studentIds.length > 0
      ? supabase.from("profiles").select("user_id, display_name").in("user_id", studentIds)
      : Promise.resolve({ data: [] as { user_id: string; display_name: string | null }[] }),
    classIds.length > 0
      ? supabase.from("class_sessions").select("id, name").in("id", classIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  // Build lookup maps
  const templateMap: Record<string, string> = {};
  (templates.data || []).forEach(t => { templateMap[t.id] = t.name; });

  const studentMap: Record<string, string> = {};
  (profiles.data || []).forEach(p => { studentMap[p.user_id] = p.display_name || "Student"; });

  const classMap: Record<string, string> = {};
  (classes.data || []).forEach(c => { classMap[c.id] = c.name; });

  // Enrich schedules
  return schedules.map(s => ({
    ...s,
    template_name: s.template_id ? templateMap[s.template_id] : undefined,
    student_name: s.assigned_student_id ? studentMap[s.assigned_student_id] : undefined,
    class_name: s.class_session_id ? classMap[s.class_session_id] : undefined,
  }));
}

export function useRecurringSchedules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: schedules,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.recurringSchedules.list(user?.id ?? ''),
    queryFn: () => fetchSchedulesWithEnrichment(user!.id),
    enabled: !!user,
  });

  // CRUD operations (keep as async functions with invalidateQueries)
  const createSchedule = async (input: CreateRecurringScheduleInput) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("recurring_schedules")
        .insert({ /* ... */ })
        .select()
        .single();
      if (error) throw error;

      toast({ title: "Schedule Created", description: `"${input.name}" recurring schedule has been created.` });
      await queryClient.invalidateQueries({ queryKey: queryKeys.recurringSchedules.list(user.id) });
      return data;
    } catch (error) {
      handleError(error, { component: 'useRecurringSchedules', action: 'create schedule' });
      return null;
    }
  };

  // ... other CRUD methods follow same pattern

  return {
    schedules: schedules ?? [],
    loading: isPending,           // Backward compatible
    isFetching,                   // NEW
    isError,                      // NEW
    error,                        // NEW
    fetchSchedules: refetch,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    generateTasks,
  };
}
```

### Test Pattern for useQueries Hook
```typescript
// src/hooks/useStickers.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// ... mocks setup

describe('useStickers', () => {
  function createWrapper() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  it('loads all three data sources in parallel', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' } as any,
      // ...
    });

    // Mock all three queries
    const mock = getMockSupabase();
    mock.queryBuilder.then
      .mockImplementationOnce((resolve) => resolve({ data: [{ id: 's1', name: 'Star' }], error: null }))
      .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'us1', sticker: { id: 's1' } }], error: null }))
      .mockImplementationOnce((resolve) => resolve({ data: [{ completed_at: new Date().toISOString() }], error: null }));

    const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stickers).toHaveLength(1);
    expect(result.current.userStickers).toHaveLength(1);
    expect(result.current.streak).toBeGreaterThanOrEqual(0);
  });

  it('calculates streak correctly', async () => {
    // ... test streak calculation with specific dates
  });

  it('handles partial query failure gracefully', async () => {
    // One query fails, others succeed - isError should be true but data still available
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple useState + useEffect | useQueries with combine | v5 stable | Single source of truth, derived state handled |
| Sequential fetches | Promise.all in queryFn | Always recommended | Reduced latency |
| Manual refetch functions | queryClient.invalidateQueries | v3+ | Automatic cache management |
| isLoading for initial | isPending | v5 | Clearer semantics |

**Deprecated/outdated:**
- Using `onSuccess` callback in useQuery: Removed in v5, use useEffect or mutation callbacks
- `keepPreviousData`: Renamed to `placeholderData: keepPreviousData` import

## Open Questions

1. **Streak calculation timing**
   - What we know: Streak is derived from completedTasks query
   - What's unclear: Should streak update immediately on task completion or wait for refetch?
   - Recommendation: Calculate in combine, optimistic update in rollForSticker mutation

2. **getGroupProgress caching duration**
   - What we know: Progress data changes as students complete tasks
   - What's unclear: How long should progress be cached?
   - Recommendation: Short staleTime (60s) since it's frequently viewed

3. **Task instances filter combinations**
   - What we know: Many filter combinations possible
   - What's unclear: Will this create too many cache entries?
   - Recommendation: Use gcTime of 5 minutes to auto-clean; most uses are same-day views

## Sources

### Primary (HIGH confidence)
- [TanStack Query Parallel Queries](https://tanstack.com/query/v5/docs/framework/react/guides/parallel-queries) - useQueries, combine option
- [TanStack Query Dependent Queries](https://tanstack.com/query/v5/docs/framework/react/guides/dependent-queries) - enabled pattern
- [GitHub Discussion: Imperative Fetching Pattern](https://github.com/TanStack/query/discussions/3622) - fetchQuery vs refetch patterns
- [TkDodo: Thinking in React Query](https://tkdodo.eu/blog/thinking-in-react-query) - declarative vs imperative approaches
- Existing codebase: Phase 10 migrations (useProfile.ts, useGroups.ts), query keys factory

### Secondary (MEDIUM confidence)
- [Medium: Parallel Queries in React Query 5](https://medium.com/@bobjunior542/how-to-run-parallel-queries-in-react-query-5-for-better-performance-with-usequeries-73abbb593bcc) - useQueries patterns
- [TkDodo: Mastering Mutations](https://tkdodo.eu/blog/mastering-mutations-in-react-query) - mutation patterns

### Tertiary (LOW confidence)
- None - all critical patterns verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All already installed and proven in Phase 10
- Architecture: HIGH - Clear patterns from official docs, verified with Phase 10 migrations
- Pitfalls: HIGH - Based on complexity analysis of actual hook implementations

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (stable library, patterns unlikely to change)
