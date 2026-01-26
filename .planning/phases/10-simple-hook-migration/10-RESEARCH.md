# Phase 10: Simple Hook Migration - Research

**Researched:** 2026-01-26
**Domain:** React Query v5 hook migration patterns
**Confidence:** HIGH

## Summary

This phase migrates three data-fetching hooks (useProfile, useGroups, useTemplates) from manual useState/useEffect patterns to React Query's useQuery. The migration is constrained by decisions in CONTEXT.md: skeleton placeholders for initial loads, cached data shown instantly on navigation, toast notifications for errors with manual retry, and one hook per atomic commit.

The current codebase already has React Query v5.83.0 installed with a properly configured QueryClientProvider in App.tsx (5-minute staleTime, auth error retry skip, global error handling). The query key factory exists at `src/lib/queries/keys.ts`. Each hook migration involves replacing internal useState/useEffect with useQuery while preserving the exact same return interface.

**Primary recommendation:** Use useQuery with the existing query key factory. Leverage `isPending` for skeleton states, `isError` for error UI with manual refetch button, and `isFetching` for subtle background refresh indicators. Test by mocking the query function directly, not the Supabase client.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.83.0 | Data fetching, caching, sync | Already installed; industry standard for React server state |
| vitest | ^4.0.18 | Test runner | Already configured with jsdom |
| @testing-library/react | ^16.3.2 | Hook/component testing | renderHook + waitFor pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^1.7.4 | Toast notifications | Error toasts (already in use via use-toast) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MSW for testing | Direct query function mocks | MSW is more realistic but adds complexity; direct mocks are sufficient for these simple hooks |

**Installation:**
```bash
# No new packages needed - all already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useProfile.ts      # Migrated hook
│   ├── useGroups.ts       # Migrated hook
│   ├── useTemplates.ts    # Migrated hook
│   └── ...
├── lib/
│   └── queries/
│       └── keys.ts        # Query key factory (already exists)
└── test/
    └── test-utils.tsx     # createTestQueryClient helper (already exists)
```

### Pattern 1: useQuery Hook Migration

**What:** Replace useState + useEffect + fetch with useQuery
**When to use:** Any hook that fetches data on mount and needs loading/error states

**Before (current pattern):**
```typescript
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      handleError(error, { component: 'useProfile', action: 'fetch profile' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return { profile, loading, fetchProfile };
}
```

**After (React Query pattern):**
```typescript
// Source: TanStack Query v5 documentation
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/keys';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profile.current(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error) {
        // Handle profile creation for new users
        if (error.code === "PGRST116") {
          return createProfileForUser(user!);
        }
        throw error;
      }
      return data;
    },
    enabled: !!user, // Only fetch when user exists
    // staleTime/gcTime inherited from global QueryClient config
  });

  // Keep same return interface for backward compatibility
  return {
    profile: profile ?? null,
    loading: isPending,      // For skeleton placeholders
    isFetching,              // For background refresh indicator
    isError,                 // For error UI
    error,                   // For error message
    fetchProfile: refetch,   // Manual retry (returns Promise)
  };
}
```

### Pattern 2: Loading States with isPending vs isFetching

**What:** Differentiate initial load from background refresh
**When to use:** Show skeleton on first load, subtle indicator on refetch

```typescript
// Source: TanStack Query v5 docs & TkDodo blog
function ProfileDisplay() {
  const { profile, loading, isFetching } = useProfile();

  // Initial load: show skeleton
  if (loading) {
    return <ProfileSkeleton />;
  }

  // Data loaded, possibly refetching in background
  return (
    <div className="relative">
      {isFetching && (
        <div className="absolute top-2 right-2">
          <Spinner size="sm" />
        </div>
      )}
      <ProfileContent profile={profile} />
    </div>
  );
}
```

**State combinations (v5):**
| State | isPending | isFetching | Meaning |
|-------|-----------|------------|---------|
| Initial load | true | true | First fetch, no cache |
| Cached, fresh | false | false | Have data, not refetching |
| Cached, refetching | false | true | Showing stale data, fetching new |
| Error (no cache) | false | false | Failed, no previous data |

### Pattern 3: Error Handling with Manual Retry

**What:** Show error UI with retry button, toast for background errors
**When to use:** All data fetching errors (per CONTEXT.md decisions)

```typescript
// Source: TkDodo React Query Error Handling blog
function GroupsList() {
  const { groups, loading, isError, error, fetchGroups } = useGroups();
  const { toast } = useToast();

  // Background refetch errors handled globally via QueryCache onError
  // Local error UI for when there's no cached data to show
  if (isError && !groups?.length) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load groups</p>
        <Button onClick={() => fetchGroups()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (loading) {
    return <GroupsSkeleton />;
  }

  // Show data (even if stale) with error indicator if refetch failed
  return (
    <div className="relative">
      {isError && (
        <div className="mb-4 p-2 bg-destructive/10 rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm">Unable to refresh. Showing cached data.</span>
          <Button size="sm" variant="ghost" onClick={() => fetchGroups()}>
            Retry
          </Button>
        </div>
      )}
      <GroupsContent groups={groups} />
    </div>
  );
}
```

### Pattern 4: Cache Invalidation on Mutations

**What:** Invalidate queries when related data changes
**When to use:** After create/update/delete operations (per CONTEXT.md)

```typescript
// Source: TanStack Query Invalidations from Mutations docs
const updateProfile = useCallback(async (updates: Partial<Profile>) => {
  if (!user) return false;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) throw error;

    // Invalidate to trigger refetch with fresh data
    queryClient.invalidateQueries({
      queryKey: queryKeys.profile.current(user.id)
    });

    toast({ title: "Profile Updated", description: "Your changes have been saved." });
    return true;
  } catch (error) {
    handleError(error, { component: 'useProfile', action: 'update profile' });
    return false;
  }
}, [user, queryClient, toast]);
```

### Pattern 5: Slow Connection Indicator

**What:** Show "Taking longer than usual..." after ~2 seconds
**When to use:** Initial loads that exceed reasonable threshold (per CONTEXT.md)

```typescript
// Custom hook for slow connection detection
function useSlowConnection(isFetching: boolean, threshold = 2000) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isFetching) {
      setIsSlow(false);
      return;
    }

    const timer = setTimeout(() => setIsSlow(true), threshold);
    return () => clearTimeout(timer);
  }, [isFetching, threshold]);

  return isSlow;
}

// Usage in component
function GroupsList() {
  const { groups, loading, isFetching } = useGroups();
  const isSlow = useSlowConnection(loading && isFetching); // Only on initial load

  if (loading) {
    return (
      <>
        <GroupsSkeleton />
        {isSlow && (
          <p className="text-center text-muted-foreground mt-4">
            Taking longer than usual...
          </p>
        )}
      </>
    );
  }
  // ...
}
```

### Anti-Patterns to Avoid

- **Don't use `onError` callback on individual queries:** v5 removed these; use global QueryCache.onError (already configured in App.tsx)
- **Don't duplicate toast logic in hooks:** Global error handler already shows toasts; per-hook toasts would cause duplicates
- **Don't use `isLoading` when you mean `isPending`:** In v5, `isLoading = isPending && isFetching`; use `isPending` for "no data yet"
- **Don't set staleTime/gcTime per-query:** Already configured globally; per-query would be inconsistent
- **Don't mock Supabase client in React Query tests:** Mock the queryFn instead for cleaner tests

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading state management | useState + loading flags | `isPending`, `isFetching` | React Query handles all edge cases (race conditions, stale closures) |
| Background refresh | Manual refetch logic | QueryClient's automatic refetch on focus/reconnect | Already configured globally |
| Cache management | Custom cache with TTL | React Query's staleTime/gcTime | Battle-tested, handles memory properly |
| Retry logic | setTimeout + retry counter | QueryClient's retry configuration | Already configured with auth error exemption |
| Query deduplication | Request tracking | React Query's built-in dedup | Prevents duplicate requests automatically |

**Key insight:** The hooks already have complex logic (profile auto-creation in useProfile, member counts in useGroups, nested task fetching in useTemplates). React Query replaces only the data-fetching boilerplate; the business logic remains.

## Common Pitfalls

### Pitfall 1: Returning `undefined` instead of `null` for backward compatibility
**What goes wrong:** Components expect `profile: Profile | null` but useQuery returns `undefined` when no data
**Why it happens:** useQuery's `data` is `TData | undefined`, not `TData | null`
**How to avoid:** Explicitly coerce: `profile: profile ?? null`
**Warning signs:** TypeScript errors about `undefined` not assignable to `null`

### Pitfall 2: Breaking the return interface
**What goes wrong:** Components that use `const { loading } = useProfile()` break
**Why it happens:** Temptation to rename to `isPending` for "correctness"
**How to avoid:** Keep `loading` as the exported property name, map internally from `isPending`
**Warning signs:** Component compilation errors after migration

### Pitfall 3: Double toasts on error
**What goes wrong:** Error shows toast twice (once from global handler, once from component)
**Why it happens:** Adding error handling in component when global handler already exists
**How to avoid:** Let global QueryCache.onError handle toasts; components only show retry UI
**Warning signs:** Duplicate toast notifications

### Pitfall 4: Forgetting `enabled: !!user` guard
**What goes wrong:** Query runs with `null` user, causing Supabase errors
**Why it happens:** Old hooks had `if (!user) return` guards; easy to forget in queryFn
**How to avoid:** Always add `enabled: !!user` when query depends on auth
**Warning signs:** "Cannot read property 'id' of null" errors

### Pitfall 5: Tests timing out due to retries
**What goes wrong:** Error case tests take 30+ seconds
**Why it happens:** QueryClient defaults to 3 retries with exponential backoff
**How to avoid:** Test QueryClient must have `retry: false` (already in test-utils.tsx)
**Warning signs:** Tests passing but slow; CI timeouts

### Pitfall 6: Not awaiting invalidateQueries in mutations
**What goes wrong:** Mutation succeeds but UI doesn't update
**Why it happens:** `invalidateQueries` is async; not awaiting it means component unmounts before refetch
**How to avoid:** Return the Promise: `return queryClient.invalidateQueries(...)`
**Warning signs:** Data updates only after manual refresh

## Code Examples

### Complete Migrated useProfile Hook
```typescript
// src/hooks/useProfile.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { handleError } from "@/lib/error";
import { queryKeys } from "@/lib/queries/keys";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchOrCreateProfile(userId: string, userEmail: string | undefined, userMeta: any): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Profile doesn't exist, create one
      const newProfile = {
        user_id: userId,
        display_name: userMeta?.full_name || userEmail?.split("@")[0] || null,
        email: userEmail,
        role: "coach" as const,
      };

      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (createError) throw createError;
      return created;
    }
    throw error;
  }

  return data;
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profile.current(user?.id ?? ''),
    queryFn: () => fetchOrCreateProfile(user!.id, user!.email, user!.user_metadata),
    enabled: !!user,
  });

  const updateProfile = async (updates: Partial<Pick<Profile, "display_name" | "avatar_url">>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Invalidate cache to refetch
      await queryClient.invalidateQueries({
        queryKey: queryKeys.profile.current(user.id)
      });

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved.",
      });

      return true;
    } catch (err) {
      handleError(err, { component: 'useProfile', action: 'update profile' });
      return false;
    }
  };

  // Helper values (unchanged from original)
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Coach";
  const initials = displayName.substring(0, 2).toUpperCase();
  const avatarEmoji = profile?.avatar_url?.startsWith("emoji:")
    ? profile.avatar_url.replace("emoji:", "")
    : null;
  const avatarDisplay = avatarEmoji || initials;

  return {
    profile: profile ?? null,
    loading: isPending,         // Backward compatible
    isFetching,                 // New: for background refresh indicator
    isError,                    // New: for error UI
    error,                      // New: for error details
    displayName,
    initials,
    avatarEmoji,
    avatarDisplay,
    fetchProfile: refetch,      // Manual refetch
    updateProfile,
  };
}
```

### Test Pattern for Migrated Hooks
```typescript
// src/hooks/useProfile.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock dependencies
vi.mock('./useAuth');
vi.mock('./use-toast');
vi.mock('@/lib/error', () => ({ handleError: vi.fn() }));

// Mock the query function, not Supabase client
const mockFetchProfile = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockFetchProfile,
        }),
      }),
    }),
  },
}));

import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useProfile', () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast, toasts: [], dismiss: vi.fn() });
  });

  it('returns loading state initially', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' } as any,
      session: {} as any,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    mockFetchProfile.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
    expect(result.current.profile).toBeNull();
  });

  it('returns profile data on successful fetch', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' } as any,
      session: {} as any,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    const mockProfile = {
      id: 'profile-1',
      user_id: 'user-1',
      display_name: 'Test User',
      email: 'test@example.com',
    };
    mockFetchProfile.mockResolvedValue({ data: mockProfile, error: null });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.displayName).toBe('Test User');
  });

  it('handles fetch error', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' } as any,
      session: {} as any,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    mockFetchProfile.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: '500' }
    });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('does not fetch when user is null', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

    // Query is disabled, so it stays in pending but never fetches
    expect(mockFetchProfile).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `isLoading` | `isPending` | v5 | `isLoading` now = `isPending && isFetching` |
| `onError` callback | QueryCache.onError | v5 | Per-query callbacks removed |
| `useErrorBoundary` | `throwOnError` | v5 | Name change only |
| `keepPreviousData` | `placeholderData: keepPreviousData` | v5 | Unified API |
| `cacheTime` | `gcTime` | v5 | Name clarifies purpose |

**Deprecated/outdated:**
- `isInitialLoading`: Use `isLoading` (which equals `isPending && isFetching`)
- `onError`/`onSuccess` on individual queries: Use global cache callbacks or mutation options

## Open Questions

1. **Skeleton component implementation**
   - What we know: Skeletons should mimic content layout (per CONTEXT.md)
   - What's unclear: Exact skeleton component designs for Profile/Groups/Templates
   - Recommendation: Claude's discretion per CONTEXT.md; use existing Skeleton primitive from shadcn/ui

2. **Consolidated error toast logic**
   - What we know: "Multiple items failed to load" toast for network issues (per CONTEXT.md)
   - What's unclear: How to detect "multiple" failures vs single query failure
   - Recommendation: Track failed query keys in global handler; debounce toast to consolidate

## Sources

### Primary (HIGH confidence)
- [TanStack Query v5 Documentation](https://tanstack.com/query/v5/docs/framework/react/guides/queries) - Query states, fetchStatus
- [TkDodo's Blog: Testing React Query](https://tkdodo.eu/blog/testing-react-query) - Test patterns, QueryClient setup
- [TkDodo's Blog: React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling) - Global error handling, toast patterns
- [TkDodo's Blog: Placeholder and Initial Data](https://tkdodo.eu/blog/placeholder-and-initial-data-in-react-query) - Cache behavior, isPlaceholderData
- Existing codebase: `src/App.tsx` QueryClient config, `src/lib/queries/keys.ts`, `src/test/test-utils.tsx`

### Secondary (MEDIUM confidence)
- [Medium: isLoading vs isPending vs isFetching](https://medium.com/@manoj.munda/tanstack-query-isloading-ispending-and-isfetching-89db5f45d7d9) - State distinction clarification
- [Medium: Global Errors in React Query v5](https://medium.com/@valerasheligan/how-to-handle-global-errors-in-react-query-v5-4f8b919ee47a) - QueryCache callback patterns

### Tertiary (LOW confidence)
- None - all critical patterns verified with official or authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Package already installed, QueryClient configured, existing test utils
- Architecture: HIGH - Clear patterns from official docs and TkDodo (maintainer's blog)
- Pitfalls: HIGH - Based on v5 migration notes and common issues in discussions

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (stable library, patterns unlikely to change)
