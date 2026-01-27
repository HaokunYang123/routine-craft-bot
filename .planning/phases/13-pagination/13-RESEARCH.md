# Phase 13: Pagination - Research

**Researched:** 2026-01-27
**Domain:** Cursor-based pagination, infinite scroll, React Query v5
**Confidence:** HIGH

## Summary

This phase adds cursor-based pagination and infinite scroll to the client list (People page). The current implementation fetches all class_sessions and instructor_students in a single query without pagination. The standard approach uses React Query's `useInfiniteQuery` hook combined with Supabase's keyset/cursor pagination using `gt()`/`lt()` filters and `range()` for efficient data fetching.

The project already uses @tanstack/react-query ^5.83.0 and Supabase, so no new dependencies are required. The main work involves:
1. Creating a `useInfiniteClients` hook using `useInfiniteQuery`
2. Implementing cursor-based Supabase queries with `created_at` as the cursor
3. Adding Intersection Observer for infinite scroll trigger
4. Building a page size selector with localStorage persistence
5. Displaying loading/end states

**Primary recommendation:** Use `useInfiniteQuery` with Supabase cursor pagination (`.lt('created_at', lastCursor)`) and the native Intersection Observer API (or `react-intersection-observer` package) for scroll detection.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.83.0 | Data fetching, caching, infinite queries | Already in project; `useInfiniteQuery` is purpose-built for this |
| @supabase/supabase-js | ^2.90.1 | Database client with cursor filtering | Already in project; supports `gt()`, `lt()`, `range()` |
| Intersection Observer API | Native | Scroll position detection | Built into browsers, no dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-intersection-observer | ^9.x | Simplified `useInView` hook | If native API feels verbose; provides cleaner React bindings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Intersection Observer | Scroll event listener | IO is more performant, async, doesn't block main thread |
| Cursor pagination | Offset pagination (`.range()`) | Offset degrades on large datasets; cursor is O(1) |
| localStorage | User preferences table | localStorage is simpler; DB preferred for cross-device sync |

**Installation:**
```bash
# Optional - only if native Intersection Observer API feels verbose
npm install react-intersection-observer
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── useInfiniteClients.ts    # New infinite query hook
├── lib/
│   └── queries/
│       └── keys.ts              # Add clients.infinite key
├── components/
│   └── pagination/
│       ├── InfiniteScrollSentinel.tsx  # Observer trigger component
│       ├── LoadingIndicator.tsx        # Bottom spinner
│       ├── EndOfList.tsx               # "That's everything" indicator
│       └── PageSizeSelector.tsx        # 10/25/50 dropdown
└── pages/
    └── People.tsx               # Refactor to use infinite query
```

### Pattern 1: useInfiniteQuery with Cursor Pagination

**What:** React Query v5's dedicated hook for paginated/infinite data
**When to use:** Any list that needs "load more" or infinite scroll behavior
**Example:**
```typescript
// Source: TanStack Query v5 docs
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queries/keys';

interface ClientsPage {
  data: Client[];
  nextCursor: string | null;
  totalCount: number;
}

async function fetchClientsPage({
  pageParam,
  userId,
  pageSize
}: {
  pageParam: string | null;
  userId: string;
  pageSize: number;
}): Promise<ClientsPage> {
  let query = supabase
    .from('class_sessions')
    .select('*, instructor_students(count)', { count: 'exact' })
    .eq('coach_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  // Cursor: fetch items OLDER than the cursor
  if (pageParam) {
    query = query.lt('created_at', pageParam);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const lastItem = data?.[data.length - 1];
  return {
    data: data ?? [],
    nextCursor: data && data.length === pageSize ? lastItem?.created_at : null,
    totalCount: count ?? 0,
  };
}

export function useInfiniteClients(pageSize: number = 25) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.clients.infinite(user?.id ?? '', pageSize),
    queryFn: ({ pageParam }) => fetchClientsPage({
      pageParam,
      userId: user!.id,
      pageSize
    }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user,
  });
}
```

### Pattern 2: Intersection Observer Sentinel

**What:** A trigger element that fires when scrolled into view
**When to use:** For infinite scroll detection at list bottom
**Example:**
```typescript
// Native Intersection Observer API
import { useRef, useEffect, useCallback } from 'react';

interface UseIntersectionObserverProps {
  onIntersect: () => void;
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function useIntersectionObserver({
  onIntersect,
  enabled = true,
  threshold = 0,
  rootMargin = '100px', // Preload before reaching bottom
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

// Usage in component:
function ClientList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteClients();

  const sentinelRef = useIntersectionObserver({
    onIntersect: fetchNextPage,
    enabled: hasNextPage && !isFetchingNextPage,
  });

  // Flatten pages into single array
  const clients = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <div>
      {clients.map(client => <ClientCard key={client.id} client={client} />)}

      {/* Sentinel element */}
      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && <LoadingIndicator />}
      {!hasNextPage && clients.length > 0 && <EndOfList />}
    </div>
  );
}
```

### Pattern 3: localStorage Preference Persistence

**What:** Store page size preference per list
**When to use:** User preferences that should persist across sessions
**Example:**
```typescript
// Custom hook for sticky state
function useStickyState<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setSticky = useCallback((newValue: T) => {
    setValue(newValue);
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch {
      // localStorage full or unavailable
    }
  }, [key]);

  return [value, setSticky];
}

// Usage:
const [pageSize, setPageSize] = useStickyState('clients-page-size', 25);
```

### Anti-Patterns to Avoid
- **Offset pagination on large datasets:** Using `.range(offset, limit)` becomes slow as offset grows (O(n) vs cursor's O(1))
- **Scroll event listeners:** Block main thread; use Intersection Observer instead
- **Refetching all pages on mutation:** Invalidate specific pages or use optimistic updates
- **Missing loading state:** Always show spinner when `isFetchingNextPage` is true
- **Missing end indicator:** Users need feedback that list is complete

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Infinite query state | Custom pagination state machine | `useInfiniteQuery` | Handles pages array, cursor tracking, loading states, caching |
| Scroll detection | `window.addEventListener('scroll', ...)` | Intersection Observer | Async, performant, doesn't block main thread |
| Page flattening | Manual array concat | `data.pages.flatMap()` | React Query structures data as pages array by design |
| Duplicate fetch prevention | Manual `isFetching` flag | `isFetchingNextPage` from hook | Built-in to `useInfiniteQuery` |

**Key insight:** `useInfiniteQuery` manages all the complexity of multi-page data fetching, caching, and state. Building this manually leads to bugs around race conditions, duplicate fetches, and stale data.

## Common Pitfalls

### Pitfall 1: Duplicate Records with Non-Unique Cursors
**What goes wrong:** If multiple records have the same `created_at` value, some records may be skipped when paginating
**Why it happens:** Using `.lt('created_at', cursor)` skips ALL records with that exact timestamp
**How to avoid:**
1. Use a unique column as primary cursor (e.g., `id`)
2. Or use composite cursor: `(created_at, id)` with ordering on both
3. For this project: `created_at` has millisecond precision in Supabase, duplicates are rare for user-created data
**Warning signs:** Missing items in list, items appearing in multiple pages

### Pitfall 2: Stale Cursor After Mutations
**What goes wrong:** After creating/deleting items, cursors become invalid
**Why it happens:** Cursor points to a position that no longer exists or has shifted
**How to avoid:** Invalidate the entire infinite query on mutations that affect the list:
```typescript
queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
```
**Warning signs:** Missing newly created items, deleted items still showing

### Pitfall 3: Page Size Change Breaks Cache
**What goes wrong:** Changing page size mid-scroll shows inconsistent data
**Why it happens:** Cached pages have different sizes, cursor positions don't align
**How to avoid:** Include `pageSize` in queryKey so changing it fetches fresh data:
```typescript
queryKey: queryKeys.clients.infinite(userId, pageSize)
```
**Warning signs:** Duplicate items, gaps in list after changing page size

### Pitfall 4: Fast Scroll Skipping Pages
**What goes wrong:** User scrolls fast, pages load out of order
**Why it happens:** Multiple `fetchNextPage` calls fire before previous completes
**How to avoid:** Check `!isFetchingNextPage` before fetching:
```typescript
enabled: hasNextPage && !isFetchingNextPage
```
**Warning signs:** Console errors about concurrent fetches, pages out of order

### Pitfall 5: Memory Growth with Many Pages
**What goes wrong:** Loading hundreds of pages accumulates memory
**Why it happens:** All fetched pages stay in React Query cache
**How to avoid:** Use `maxPages` option to limit cached pages (optional for this phase):
```typescript
useInfiniteQuery({
  ...options,
  maxPages: 5, // Only keep 5 pages in memory
})
```
**Warning signs:** Slow scrolling, high memory usage in DevTools

## Code Examples

Verified patterns from official sources:

### Supabase Cursor Query (Descending Order)
```typescript
// Source: Supabase documentation for gt()/lt()
// For lists ordered by created_at DESC (newest first)
const { data, error } = await supabase
  .from('class_sessions')
  .select('*')
  .eq('coach_id', userId)
  .lt('created_at', cursor)  // Items OLDER than cursor
  .order('created_at', { ascending: false })
  .limit(pageSize);
```

### Supabase Count Query
```typescript
// Source: Supabase documentation - count option
// Get total count without fetching data
const { count, error } = await supabase
  .from('class_sessions')
  .select('*', { count: 'exact', head: true })
  .eq('coach_id', userId)
  .eq('is_active', true);
```

### React Query v5 useInfiniteQuery Structure
```typescript
// Source: TanStack Query v5 docs
const {
  data,                // { pages: Page[], pageParams: Cursor[] }
  error,
  fetchNextPage,       // () => Promise - load next page
  fetchPreviousPage,   // () => Promise - load previous (bi-directional)
  hasNextPage,         // boolean - getNextPageParam returned non-nullish
  hasPreviousPage,     // boolean - getPreviousPageParam returned non-nullish
  isFetching,          // boolean - any request in flight
  isFetchingNextPage,  // boolean - next page request in flight
  isFetchingPreviousPage,
  status,              // 'pending' | 'error' | 'success'
  refetch,
} = useInfiniteQuery({
  queryKey: ['clients', userId, pageSize],
  queryFn: ({ pageParam }) => fetchPage(pageParam),
  initialPageParam: null,
  getNextPageParam: (lastPage, allPages, lastPageParam, allPageParams) => {
    return lastPage.nextCursor;  // Return null/undefined when done
  },
});
```

### Flattening Pages for Rendering
```typescript
// Source: TanStack Query v5 docs
// data.pages is an array of page results
const allClients = data?.pages.flatMap(page => page.data) ?? [];
const totalCount = data?.pages[0]?.totalCount ?? 0;
```

### Query Key Factory Extension
```typescript
// Extend existing queryKeys pattern
export const queryKeys = {
  // ... existing keys
  clients: {
    all: ['clients'] as const,
    infinite: (userId: string, pageSize: number) =>
      [...queryKeys.clients.all, 'infinite', userId, pageSize] as const,
  },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Offset pagination (`.range()`) | Cursor/keyset pagination | Standard practice | O(1) vs O(n) performance on large datasets |
| Scroll event listeners | Intersection Observer API | Widely supported since 2019 | Better performance, doesn't block main thread |
| `useQuery` + manual pagination | `useInfiniteQuery` | React Query v3+ | Built-in page management, cursor tracking |
| Page numbers UI | Infinite scroll | UX trend | Better mobile experience, continuous browsing |

**Deprecated/outdated:**
- Using `getNextPageParam: (lastPage, pages) => ...` with only 2 args: v5 provides 4 args including `lastPageParam` and `allPageParams`
- Manual refetch all pages: `useInfiniteQuery` handles this automatically on invalidation

## Open Questions

Things that couldn't be fully resolved:

1. **Scroll Position Restoration**
   - What we know: User wants scroll position preserved when navigating away/back
   - What's unclear: Whether React Query's cache alone handles this, or if we need explicit scroll restoration
   - Recommendation: Test with existing React Query setup first; implement `scrollRestoration` if needed

2. **Total Count Performance**
   - What we know: User wants "Showing 25 of 142" display
   - What's unclear: Whether running `count: 'exact'` on every page fetch is acceptable
   - Recommendation: Fetch count once on first page only, pass to all pages via query function closure

3. **Students Within Groups**
   - What we know: Current People.tsx fetches students per group in waterfall pattern
   - What's unclear: Whether to paginate students within each group, or just the groups themselves
   - Recommendation: Per CONTEXT.md, focus on client list (groups) pagination only this phase

## Sources

### Primary (HIGH confidence)
- TanStack Query v5 docs - [Infinite Queries guide](https://tanstack.com/query/v5/docs/react/guides/infinite-queries)
- TanStack Query v5 docs - [useInfiniteQuery reference](https://tanstack.com/query/v5/docs/framework/react/reference/useInfiniteQuery)
- Supabase docs - [gt() filter](https://supabase.com/docs/reference/javascript/gt)
- Supabase docs - [range() method](https://supabase.com/docs/reference/javascript/range)
- Supabase docs - [select() with count option](https://supabase.com/docs/reference/javascript/select)
- MDN - [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

### Secondary (MEDIUM confidence)
- GitHub Discussion - [Cursor based pagination in Supabase](https://github.com/orgs/supabase/discussions/3938)
- npm - [react-intersection-observer](https://www.npmjs.com/package/react-intersection-observer)
- Josh W. Comeau - [Persisting React State in localStorage](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/)

### Tertiary (LOW confidence)
- Various blog posts on infinite scroll implementation patterns (cross-verified with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All required libraries already in project, official docs verified
- Architecture: HIGH - Patterns directly from TanStack Query v5 official docs
- Pitfalls: HIGH - Common issues documented in official guides and community discussions

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (stable APIs, 30-day validity)
