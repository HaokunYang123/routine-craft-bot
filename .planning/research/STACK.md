# Technology Stack — Performance Optimization

**Project:** Routine Craft Bot
**Researched:** 2026-01-26
**Research Mode:** Stack dimension for React Query migration, pagination, and memo optimization
**Overall Confidence:** HIGH

---

## Executive Summary

The project already has React Query v5 installed (`@tanstack/react-query: ^5.83.0`) with `QueryClientProvider` configured in App.tsx, but hooks still use manual `useState`/`useEffect` patterns. **No new libraries are needed** — the migration is about replacing existing patterns with React Query's `useQuery`/`useMutation` hooks, adding cursor-based pagination via Supabase's existing API, and applying selective `React.memo`/`useMemo`/`useCallback` where profiling shows benefit.

**Key insight:** This is a refactoring milestone, not a dependency-adding milestone. The stack is complete.

---

## Current Stack (Already Installed)

| Technology | Installed Version | Purpose | Status |
|------------|------------------|---------|--------|
| `@tanstack/react-query` | ^5.83.0 | Server state management | **Installed, underutilized** |
| `react` | ^18.3.1 | UI framework | Active |
| `@supabase/supabase-js` | ^2.90.1 | Database client | Active |
| `vitest` | ^4.0.18 | Test runner | Active |
| `@testing-library/react` | ^16.3.2 | Component testing | Active |

**No new production dependencies required.**

---

## Recommended Stack Additions

### Development Tools (Optional but Recommended)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@tanstack/react-query-devtools** | ^5.x | Debug/inspect query cache | Essential for migration debugging — see cache state, query timing, refetch triggers. Already compatible with installed React Query. | HIGH |

**Rationale:** DevTools are invaluable during migration to verify queries are behaving as expected. They show cache hits/misses, stale times, and help identify unnecessary refetches.

```bash
npm install -D @tanstack/react-query-devtools
```

### No Other Dependencies Needed

The following are **not required** because they're already handled:

| Would-be Dependency | Why Not Needed |
|---------------------|----------------|
| `@tanstack/react-query` | Already installed at v5.83.0 |
| `supabase-cache-helpers` | Overkill — standard React Query patterns work fine with Supabase |
| `react-virtual` / `@tanstack/react-virtual` | Defer — only add if lists exceed 1000+ items |
| `use-debounce` | Not needed — React Query handles request deduplication natively |

---

## React Query v5 Migration Guide

### Changes from useState/useEffect Pattern

**Current pattern (useGroups.ts):**
```typescript
const [groups, setGroups] = useState<Group[]>([]);
const [loading, setLoading] = useState(true);

const fetchGroups = useCallback(async () => {
  setLoading(true);
  const { data, error } = await supabase.from("groups").select("*");
  if (error) throw error;
  setGroups(data);
  setLoading(false);
}, []);

useEffect(() => {
  if (user) fetchGroups();
}, [user, fetchGroups]);
```

**Target pattern with React Query:**
```typescript
const { data: groups = [], isLoading, error, refetch } = useQuery({
  queryKey: ['groups', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("coach_id", user!.id);
    if (error) throw error;
    return data;
  },
  enabled: !!user,
});
```

### Key v5 API Notes (Verified)

| v5 Change | Impact |
|-----------|--------|
| `isLoading` renamed to `isPending` | Use `isPending` for "no cached data + fetching" state |
| `isLoading` is now `isPending && isFetching` | This is the "first load" state |
| `cacheTime` renamed to `gcTime` | Garbage collection time, not "cache time" |
| `keepPreviousData` merged into `placeholderData` | Use `placeholderData: (previousData) => previousData` |
| `onSuccess`/`onError` callbacks removed from useQuery | Use `useEffect` or mutation's `onSuccess` instead |
| Suspense hooks are separate | Use `useSuspenseQuery` for Suspense, not `suspense: true` option |

### QueryClient Configuration (Recommended Update)

**Current (App.tsx):**
```typescript
const queryClient = new QueryClient();
```

**Recommended:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute - data considered fresh
      gcTime: 1000 * 60 * 5, // 5 minutes - cache garbage collection
      retry: 1, // Retry once on failure
      refetchOnWindowFocus: false, // Disable for coach dashboard stability
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});
```

**Rationale:**
- `staleTime: 60s` prevents excessive refetches for data that doesn't change frequently (groups, templates)
- `refetchOnWindowFocus: false` prevents jarring refetches when switching tabs (coach may have multiple tabs)
- `retry: 1` balances resilience with fast failure feedback

---

## Pagination Strategy

### Recommended: Cursor-Based Pagination

**Use cursor-based pagination** via Supabase's `.gt()` filter, not offset-based `.range()`.

**Why:**
- Offset pagination degrades at large offsets (O(n) to skip rows)
- Cursor pagination is O(1) — always fast regardless of page
- Real-time safe — new/deleted rows don't cause duplicates or skips
- Supabase supports it natively with `.gt('id', cursor)` or `.gt('created_at', cursor)`

**Implementation pattern:**
```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['task_instances', assigneeId],
  queryFn: async ({ pageParam }) => {
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
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) =>
    lastPage.length === 20 ? lastPage[lastPage.length - 1].scheduled_date : undefined,
});
```

**Index requirement:** Ensure `scheduled_date` is indexed on `task_instances` table for performance.

### When to Use Offset (Simple Cases)

For small, bounded lists where total count is known and useful:
- Template list (typically <50 items)
- Group list (typically <20 items)

```typescript
const { data } = useQuery({
  queryKey: ['templates', page],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*', { count: 'exact' })
      .range(page * 10, (page + 1) * 10 - 1);
    if (error) throw error;
    return data;
  },
});
```

---

## Memo Optimization Strategy

### Philosophy: Measure Before Memoizing

**Do NOT preemptively add `React.memo`/`useMemo`/`useCallback` everywhere.**

From Kent C. Dodds (verified pattern): "Every abstraction (and performance optimization) comes at a cost. Apply the AHA Programming principle and wait until the abstraction/optimization is screaming at you."

React Compiler (React 19+) will auto-memoize, making manual memoization less necessary over time.

### When to Memoize (Apply Only When Needed)

| Pattern | When to Apply | Example |
|---------|---------------|---------|
| `React.memo(Component)` | Component receives same props but parent re-renders frequently | List items, table rows |
| `useMemo(() => computation, [deps])` | Computation is expensive (>10ms) AND deps rarely change | Filtering/sorting large arrays |
| `useCallback(fn, [deps])` | Function is passed to `React.memo`'d child OR used in dependency array | Event handlers passed to list items |

### High-Priority Candidates in This Codebase

Based on code review, these are likely candidates for memo optimization:

1. **StudentSchedule task list items** — Many items, parent re-renders on status changes
2. **CoachCalendar day cells** — 30+ cells, expensive to re-render all on any change
3. **GroupProgress member cards** — List that re-renders when any member's stats change
4. **Filtered/sorted lists** — Any `.filter().sort()` on arrays with >50 items

### Profiling-First Approach

**Step 1:** Add React DevTools Profiler measurements before optimization
**Step 2:** Identify components with >16ms render time or >3 re-renders per interaction
**Step 3:** Apply targeted memoization
**Step 4:** Re-measure to verify improvement

**Do NOT skip profiling.** Memoization without measurement often adds overhead without benefit.

---

## Hooks Migration Priority

Based on code review, migrate hooks in this order:

| Priority | Hook | Why | Complexity |
|----------|------|-----|------------|
| 1 | `useGroups` | Most straightforward, clear data fetching pattern | Low |
| 2 | `useTemplates` | Similar pattern to useGroups | Low |
| 3 | `useAssignments` | Multiple queries + mutations, good test case | Medium |
| 4 | `useProfile` | Simple single-record fetch | Low |
| 5 | `useStickers` | Simple CRUD | Low |
| 6 | `useRecurringSchedules` | More complex queries | Medium |

### Hooks to NOT Migrate to React Query

| Hook | Why Keep As-Is |
|------|----------------|
| `useAuth` | Subscription-based (onAuthStateChange), not request-response |
| `useAIAssistant` | One-off mutations with custom retry logic, no caching benefit |
| `use-toast` | UI state, not server state |
| `use-mobile` | Device detection, not data fetching |

---

## Integration Points

### With Existing Error Handling

React Query provides its own error states. Integrate with existing `handleError`:

```typescript
const { data, error, isError } = useQuery({...});

useEffect(() => {
  if (isError && error) {
    handleError(error, { component: 'useGroups', action: 'fetch groups' });
  }
}, [isError, error]);
```

Or use `onError` in QueryClient defaults (global handling).

### With Existing Tests

Test utilities already set up `QueryClientProvider`. Existing pattern:

```typescript
// src/test/test-utils.tsx already exports createTestQueryClient()
const { result } = renderHook(() => useGroups(), {
  wrapper: ({ children }) => (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  ),
});
```

### With Supabase Realtime (Future)

If realtime subscriptions are added later, combine with React Query:

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('groups')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' },
      () => queryClient.invalidateQueries({ queryKey: ['groups'] })
    )
    .subscribe();

  return () => { subscription.unsubscribe(); };
}, [queryClient]);
```

---

## What NOT to Add

| Technology | Reason |
|------------|--------|
| **supabase-cache-helpers** | Adds abstraction layer over standard React Query patterns. The standard patterns are simple enough for this codebase. |
| **swr** | Competing library. React Query already installed and more feature-rich. |
| **@tanstack/react-virtual** | Premature optimization. Only add if lists exceed 1000+ items with measured performance issues. |
| **react-query-kit** | Code generation abstraction. Manual query definitions are clearer for this codebase size. |
| **Zustand/Jotai** | Not needed — React Query handles server state, existing React state handles UI state. |
| **Redux** | Overkill. React Query + React state is sufficient. |

---

## Installation Summary

```bash
# DevTools only (optional but recommended for migration debugging)
npm install -D @tanstack/react-query-devtools
```

**That's it.** No production dependencies to add.

---

## DevTools Setup (Recommended)

```typescript
// App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add inside QueryClientProvider, only in development:
<QueryClientProvider client={queryClient}>
  {/* ... routes ... */}
  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider>
```

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| React Query v5 already installed | HIGH | Verified in package.json |
| No new prod dependencies needed | HIGH | Analyzed codebase, all patterns achievable with existing stack |
| Cursor pagination recommendation | HIGH | Supabase docs + WebSearch consensus |
| Memo optimization approach | HIGH | React official guidance + Kent C. Dodds patterns |
| DevTools version compatibility | HIGH | Same major version as react-query |
| Migration patterns | HIGH | TanStack official docs + WebSearch verification |

---

## Sources

**Official Documentation (HIGH confidence):**
- [TanStack Query v5 Overview](https://tanstack.com/query/v5/docs/framework/react/overview)
- [TanStack Query v5 Migration Guide](https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5)
- [Supabase Pagination Strategies](https://github.com/orgs/supabase/discussions/3938)

**Community Patterns (MEDIUM confidence):**
- [React Query + Supabase Integration](https://makerkit.dev/blog/saas/supabase-react-query)
- [React Memoization Best Practices](https://kentcdodds.com/blog/usememo-and-usecallback)
- [Beyond React.memo: Smarter Performance](https://cekrem.github.io/posts/beyond-react-memo-smarter-performance-optimization/)

**Codebase Analysis (HIGH confidence):**
- `package.json` — verified React Query v5.83.0 installed
- `App.tsx` — verified QueryClientProvider configured
- `src/hooks/*.ts` — verified current useState/useEffect patterns

---

*Stack research: 2026-01-26 — Performance milestone*
