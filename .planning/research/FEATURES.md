# Feature Landscape: React Query + Pagination + Memo Optimization

**Domain:** Performance optimization for React/Supabase data fetching
**Researched:** 2026-01-26
**Confidence:** HIGH (Context7-verified, official docs)

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

### React Query Migration

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Automatic caching | Users expect fast navigation; re-fetching data they just saw feels broken | Low | React Query default: 5min gcTime, 0s staleTime |
| Loading states via `isPending` | Users expect clear feedback during data fetches | Low | Replaces manual `useState(loading)` |
| Error states via `isError` | Users expect to see errors, not silent failures | Low | Integrate with existing `handleError` utility |
| Background refetch on window focus | Users expect fresh data when returning to app | Low | React Query default behavior |
| Query deduplication | Multiple components requesting same data = 1 network call | Low | Automatic with matching queryKeys |
| Mutation success/error feedback | Users expect confirmation that actions worked | Low | Use `onSuccess`/`onError` callbacks |
| Query invalidation after mutations | Users expect lists to update after create/edit/delete | Medium | Call `queryClient.invalidateQueries()` in mutation `onSuccess` |

### Pagination

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Page size control | Users expect to control how much data they see | Low | Default: 20-50 items per page |
| Loading indicator for page changes | Users expect feedback when changing pages | Low | Use `isFetching` from useQuery |
| Consistent data during navigation | Users expect stable results while paginating | Medium | Cursor pagination handles this better than offset |
| Clear "end of list" indicator | Users expect to know when there's no more data | Low | `hasNextPage` from useInfiniteQuery |

### Render Optimization

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| No blank screens during data load | Users expect skeleton or spinner, not emptiness | Low | Already have `DashboardSkeleton`, `TaskListSkeleton` |
| Responsive UI during mutations | Users expect button to respond immediately | Low | Loading states on mutation buttons |

---

## Differentiators

Features that set product apart. Not expected, but provide competitive advantage.

### React Query Advanced Features

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Optimistic updates for task completion | Task checkboxes respond instantly (feels snappy) | Medium | Use `useMutation` with `onMutate` for immediate UI update, rollback on error |
| Stale-while-revalidate pattern | Users see cached data immediately while fresh data loads in background | Low | Configure `staleTime` (e.g., 3-5 minutes for coach data) |
| Prefetching on hover | Data loads before user clicks (near-instant navigation) | Medium | `queryClient.prefetchQuery()` on link hover |
| Parallel queries | Fetch groups, assignments, templates simultaneously on dashboard | Low | Multiple `useQuery` calls auto-parallelize |
| Suspense integration | Cleaner loading state management | Medium | `useSuspenseQuery` with React Error Boundaries |

### Pagination Advanced Features

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Infinite scroll for lists | Modern UX, no page buttons to click | Medium | `useInfiniteQuery` + IntersectionObserver |
| Cursor-based pagination | 17x faster than offset for large datasets | Medium | Use `gt()`/`lt()` filters instead of `.range()` |
| Page prefetching | Next page loads in background while viewing current | Medium | Prefetch page N+1 when on page N |
| Virtualized long lists | Render only visible items for 1000+ item lists | High | react-window or @tanstack/react-virtual |

### Render Optimization Advanced Features

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Selective memoization of expensive components | Reduce re-renders on large calendar (1,661 lines) | Medium | Profile first, then `React.memo` + `useMemo` |
| Callback stability for child components | Prevent unnecessary child re-renders | Low | `useCallback` for handlers passed as props |
| Component splitting for code-splitting | Faster initial load by lazy-loading heavy components | Medium | `React.lazy()` for calendar, charts |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Global staleTime: 0 for everything | Causes excessive network requests, poor UX | Configure per-query: 0 for real-time, 5min for static data |
| Memoize every component | Adds memory overhead, slows down simple components | Profile first, memoize only expensive components that re-render with same props |
| useMemo for cheap calculations | Memory cost > computation cost for simple ops | Only memoize if calculation takes >1ms |
| Optimistic updates for everything | Rollback UX is jarring for frequent failures | Only for low-failure-rate operations (task completion, not network-dependent ops) |
| Offset pagination for large datasets | Performance degrades at high offsets (scanning all previous rows) | Use cursor-based pagination (17x faster) |
| Deep equality comparison in memo | `JSON.stringify` comparisons freeze the app | Compare specific props, accept new references are OK |
| Cache everything forever | Memory bloat, stale data | Set appropriate gcTime (5-30 min based on data type) |
| Manual cache manipulation everywhere | Error-prone, hard to maintain | Prefer invalidation over manual cache updates |
| Infinite scroll without load-more button fallback | Poor accessibility, can't jump to specific items | Include "Load more" button as fallback |
| Suspense without Error Boundaries | Suspense errors propagate up without boundaries | Always pair Suspense with ErrorBoundary |

---

## Feature Dependencies

```
React Query Foundation
    |
    +-- useQuery (read operations)
    |       |
    |       +-- Query invalidation (depends on mutations)
    |       +-- Stale-while-revalidate (depends on staleTime config)
    |       +-- Prefetching (depends on queryClient setup)
    |
    +-- useMutation (write operations)
    |       |
    |       +-- Optimistic updates (depends on onMutate pattern)
    |       +-- Cache invalidation (depends on queryClient)
    |
    +-- useInfiniteQuery (pagination)
            |
            +-- Infinite scroll (depends on IntersectionObserver)
            +-- Cursor pagination (depends on Supabase query changes)

Memo Optimization
    |
    +-- React.memo (component-level)
    |       |
    |       +-- useCallback (prevents function prop changes)
    |       +-- useMemo (prevents object/array prop changes)
    |
    +-- Independent of React Query (can do in parallel)
```

---

## MVP Recommendation

### Phase 1: Core Migration (Table Stakes)

Prioritize:

1. **useQuery for all data fetching** - Table stakes, replaces useState/useEffect pattern
2. **useMutation with invalidation** - Table stakes, ensures data consistency
3. **Loading/error states** - Table stakes, user feedback
4. **Basic staleTime configuration** - Low effort, immediate UX improvement

### Phase 2: Pagination (High-Value Lists)

Prioritize:

1. **Cursor-based pagination for large lists** - High impact for clients/check-ins
2. **useInfiniteQuery for infinite scroll** - Better UX than page buttons
3. **Load-more button fallback** - Accessibility

### Phase 3: Optimization (Measured)

Prioritize:

1. **Profile before memoizing** - Don't optimize blindly
2. **React.memo for CoachCalendar** - Known large component (1,661 lines)
3. **useCallback for event handlers** - Only where causing re-render issues
4. **Code-splitting heavy components** - Measurable initial load improvement

### Defer to Later

- **Suspense integration**: Requires React 18 Suspense patterns, more invasive
- **Virtualization**: Only if lists exceed 500+ visible items
- **Prefetching on hover**: Nice-to-have, not critical

---

## Expected User Experience

### Before (Current State)

| User Action | What Happens |
|-------------|--------------|
| Navigate to Dashboard | Spinner, fetch all data, render |
| Navigate away and back | Spinner again, re-fetch all data |
| Complete a task | Button shows loading, wait for server, update UI |
| Scroll through 500 clients | All 500 load at once, slow initial render |
| Switch tabs quickly | Each tab triggers new fetch |

### After (With Features)

| User Action | What Happens |
|-------------|--------------|
| Navigate to Dashboard | Show cached data immediately, background refresh |
| Navigate away and back | Instant render from cache (if < 5min) |
| Complete a task | Checkbox updates instantly (optimistic), syncs in background |
| Scroll through 500 clients | First 20 load fast, more load as you scroll |
| Switch tabs quickly | Only one fetch happens (deduplication) |

---

## Developer Experience Expectations

### React Query Hooks Pattern

```typescript
// useGroups.ts - Expected pattern after migration
export function useGroups() {
  const { user } = useAuth();

  const groupsQuery = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('coach_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    groups: groupsQuery.data ?? [],
    isLoading: groupsQuery.isPending,
    isError: groupsQuery.isError,
    error: groupsQuery.error,
  };
}
```

### Mutation with Invalidation Pattern

```typescript
// Expected mutation pattern
const createGroupMutation = useMutation({
  mutationFn: async (input: CreateGroupInput) => {
    const { data, error } = await supabase
      .from('groups')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    toast({ title: 'Group created' });
  },
  onError: (error) => {
    handleError(error, { component: 'useGroups', action: 'create' });
  },
});
```

### Infinite Query Pattern

```typescript
// Expected infinite scroll pattern
const tasksQuery = useInfiniteQuery({
  queryKey: ['tasks', assigneeId],
  queryFn: async ({ pageParam = null }) => {
    let query = supabase
      .from('task_instances')
      .select('*')
      .eq('assignee_id', assigneeId)
      .order('scheduled_date', { ascending: false })
      .limit(20);

    if (pageParam) {
      query = query.lt('scheduled_date', pageParam);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  getNextPageParam: (lastPage) =>
    lastPage.length === 20 ? lastPage[lastPage.length - 1].scheduled_date : undefined,
  initialPageParam: null,
});
```

### Optimistic Update Pattern

```typescript
// Expected optimistic update for task completion
const updateTaskMutation = useMutation({
  mutationFn: async ({ taskId, status }) => {
    const { error } = await supabase
      .from('task_instances')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', taskId);
    if (error) throw error;
  },
  onMutate: async ({ taskId, status }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['tasks'] });

    // Snapshot previous value
    const previousTasks = queryClient.getQueryData(['tasks']);

    // Optimistically update
    queryClient.setQueryData(['tasks'], (old) =>
      old?.map((task) =>
        task.id === taskId ? { ...task, status } : task
      )
    );

    return { previousTasks };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['tasks'], context?.previousTasks);
    handleError(err, { component: 'useAssignments', action: 'update task' });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});
```

---

## Performance Benchmarks to Target

| Metric | Current (Estimated) | Target | How to Measure |
|--------|---------------------|--------|----------------|
| Dashboard load (cold) | 1-2s | < 500ms | React DevTools Profiler |
| Dashboard load (cached) | 1-2s | < 100ms | Should be instant from cache |
| Task completion feedback | 200-500ms | < 50ms | Optimistic update eliminates wait |
| Client list render (500 items) | Slow/janky | Smooth | Virtualization or pagination |
| Tab switch (with data) | Re-fetch every time | Instant | staleTime caching |

---

## Configuration Recommendations

### staleTime by Data Type

| Data Type | staleTime | Rationale |
|-----------|-----------|-----------|
| User profile | 10 minutes | Rarely changes |
| Groups | 5 minutes | Coach-controlled, occasional updates |
| Templates | 5 minutes | Coach creates, then uses repeatedly |
| Assignments | 3 minutes | Can be updated by coach |
| Task instances | 1 minute | Students complete frequently |
| Check-ins | 0 (always stale) | Real-time data, always fetch fresh |

### gcTime Recommendations

| Data Type | gcTime | Rationale |
|-----------|--------|-----------|
| All queries | 10-30 minutes | Keep in memory for quick navigation back |
| Heavy data (task history) | 5 minutes | Reduce memory footprint |

---

## Confidence Assessment

| Feature Area | Confidence | Reason |
|--------------|------------|--------|
| React Query useQuery/useMutation | HIGH | Official TanStack docs, well-established patterns |
| Query invalidation | HIGH | Core React Query feature, documented extensively |
| Optimistic updates | HIGH | Official docs, but note: only for low-failure ops |
| Cursor pagination | HIGH | PostgreSQL fundamentals, 17x perf verified |
| useInfiniteQuery | HIGH | Official TanStack docs |
| React.memo/useMemo | HIGH | React official docs, Kent C. Dodds guidance |
| Supabase + React Query integration | MEDIUM | Community patterns, supabase-cache-helpers exists |
| Performance benchmarks | MEDIUM | Targets are reasonable estimates, need profiling |

---

## Sources

### React Query / TanStack Query
- [TanStack Query Overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Queries Guide](https://tanstack.com/query/v5/docs/react/guides/queries)
- [Mutations Guide](https://tanstack.com/query/v5/docs/react/guides/mutations)
- [Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Infinite Queries](https://tanstack.com/query/v4/docs/framework/react/guides/infinite-queries)
- [useQuery Reference](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery)
- [useMutation Reference](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation)

### React Performance
- [React.memo Official Docs](https://react.dev/reference/react/memo)
- [useMemo Official Docs](https://react.dev/reference/react/useMemo)
- [When to useMemo and useCallback - Kent C. Dodds](https://kentcdodds.com/blog/usememo-and-usecallback)

### Supabase Integration
- [React Query + Next.js + Supabase](https://supabase.com/blog/react-query-nextjs-app-router-cache-helpers)
- [Supabase Cache Helpers](https://supabase-cache-helpers.vercel.app/postgrest/queries)
- [Pagination with Supabase](https://makerkit.dev/blog/tutorials/pagination-supabase-react)

### Pagination Performance
- [Cursor Pagination Deep Dive](https://www.milanjovanovic.tech/blog/understanding-cursor-pagination-and-why-its-so-fast-deep-dive)
- [Offset vs Cursor Pagination](https://medium.com/@maryam-bit/offset-vs-cursor-based-pagination-choosing-the-best-approach-2e93702a118b)

### Cache Configuration
- [staleTime vs gcTime Discussion](https://github.com/TanStack/query/discussions/1685)
- [Mastering staleTime and gcTime](https://asrulkadir.medium.com/mastering-staletime-and-gctime-in-react-query-the-secrets-to-smarter-data-caching-22499ce3010f)

---

*Feature landscape for v2 Performance milestone: 2026-01-26*
