# Architecture Patterns: React Query Migration

**Domain:** React Query integration with existing React/Supabase architecture
**Researched:** 2026-01-26
**Confidence:** HIGH (existing codebase analyzed, official docs verified)

## Executive Summary

The codebase already has `@tanstack/react-query@5.83.0` installed with `QueryClientProvider` configured in `App.tsx`. However, **none of the 12 custom hooks actually use React Query** - they all use manual `useState/useEffect` patterns. This creates a clear incremental migration path: wrap existing Supabase calls in React Query hooks without changing component interfaces.

---

## Current Architecture Analysis

### Infrastructure Status

| Component | Status | Notes |
|-----------|--------|-------|
| `@tanstack/react-query` | Installed v5.83.0 | Ready to use |
| `QueryClientProvider` | Configured in App.tsx | Default options only |
| `QueryClient` | Created with defaults | Needs enhancement |
| Test utils | Already have QueryClient setup | `src/test/test-utils.tsx` |

### Existing Hook Patterns

All 12 custom hooks follow this manual pattern:

```typescript
// Current pattern (useGroups.ts, useTemplates.ts, etc.)
export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user, fetchGroups]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("groups").select("*")...
      if (error) throw error;
      setGroups(data);
    } catch (error) {
      handleError(error, { component: 'useGroups', action: 'fetch' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { groups, loading, fetchGroups, createGroup, ... };
}
```

**Problems with current approach:**
1. **No caching** - every component mount refetches
2. **No request deduplication** - multiple components = multiple identical requests
3. **No background refetch** - stale data persists until manual refresh
4. **Manual state management** - loading/error state boilerplate everywhere
5. **No optimistic updates** - UI waits for server response

### Hooks Requiring Migration

| Hook | Type | Priority | Complexity | Reason |
|------|------|----------|------------|--------|
| `useProfile` | CRUD | P0 | LOW | Simplest hook, single entity, good starting point |
| `useGroups` | CRUD | P0 | MEDIUM | Core feature, used in CoachDashboard |
| `useTemplates` | CRUD | P0 | MEDIUM | Similar pattern to groups |
| `useAssignments` | CRUD | P1 | HIGH | Complex nested queries, multiple tables |
| `useRecurringSchedules` | CRUD | P2 | MEDIUM | Moderate complexity |
| `useAuth` | Auth | LOW | SPECIAL | Uses Supabase auth listeners, not typical query |
| `useAIAssistant` | Edge function | P3 | LOW | Already has retry/timeout patterns |
| `useStickers` | CRUD | P3 | LOW | Low usage |

**Note:** `useAuth`, `useGoogleAuth`, `useQRScanner`, `useDeviceType`, `useClassCode` don't need React Query - they're not data fetching hooks.

---

## Recommended Architecture

### Layer 1: Query Functions (NEW FILES)

Separate data fetching logic from React hooks for reusability and testing.

```
src/
  lib/
    queries/
      keys.ts          # Query key factory (centralized)
      groups.ts        # Query functions for groups
      templates.ts     # Query functions for templates
      assignments.ts   # Query functions for assignments
      profiles.ts      # Query functions for profiles
      helpers.ts       # Supabase error handling utilities
```

**Query Function Pattern:**

```typescript
// src/lib/queries/groups.ts
import { supabase } from "@/integrations/supabase/client";
import type { Group } from "@/hooks/useGroups";

export async function fetchGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("coach_id", userId)
    .order("created_at", { ascending: false })
    .throwOnError(); // CRITICAL: Makes errors throwable for React Query

  return data ?? [];
}

export async function fetchGroupWithMembers(groupId: string) {
  const { data } = await supabase
    .from("groups")
    .select(`
      *,
      group_members (
        user_id,
        role,
        profiles:user_id (display_name, email)
      )
    `)
    .eq("id", groupId)
    .single()
    .throwOnError();

  return data;
}

export async function createGroup(params: {
  name: string;
  color: string;
  userId: string
}) {
  const { data: joinCode } = await supabase.rpc("generate_group_join_code");

  const { data } = await supabase
    .from("groups")
    .insert({
      name: params.name,
      color: params.color,
      coach_id: params.userId,
      join_code: joinCode,
    })
    .select()
    .single()
    .throwOnError();

  return data;
}
```

**Why `.throwOnError()`:** Supabase returns errors in the response object by default. Without `.throwOnError()`, React Query won't catch errors - the `error` state stays empty while `data` is undefined. This is a critical pitfall.

### Layer 2: Query Key Factory (NEW FILE)

Centralized query key management for consistent cache invalidation.

```typescript
// src/lib/queries/keys.ts
export const queryKeys = {
  // Groups
  groups: {
    all: ['groups'] as const,
    lists: () => [...queryKeys.groups.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.groups.lists(), userId] as const,
    details: () => [...queryKeys.groups.all, 'detail'] as const,
    detail: (groupId: string) => [...queryKeys.groups.details(), groupId] as const,
    members: (groupId: string) => [...queryKeys.groups.all, 'members', groupId] as const,
  },

  // Templates
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.templates.lists(), userId] as const,
    details: () => [...queryKeys.templates.all, 'detail'] as const,
    detail: (templateId: string) => [...queryKeys.templates.details(), templateId] as const,
  },

  // Assignments
  assignments: {
    all: ['assignments'] as const,
    lists: () => [...queryKeys.assignments.all, 'list'] as const,
    list: (filters: { userId?: string; groupId?: string }) =>
      [...queryKeys.assignments.lists(), filters] as const,
    instances: (filters: { assigneeId?: string; date?: string; startDate?: string }) =>
      [...queryKeys.assignments.all, 'instances', filters] as const,
    progress: (groupId: string, date: string) =>
      [...queryKeys.assignments.all, 'progress', groupId, date] as const,
  },

  // Profile
  profile: {
    all: ['profile'] as const,
    current: (userId: string) => [...queryKeys.profile.all, userId] as const,
  },
} as const;
```

**Key benefits:**
- Type-safe query keys
- Hierarchical structure enables targeted invalidation
- `queryClient.invalidateQueries({ queryKey: queryKeys.groups.all })` invalidates all group queries
- `queryClient.invalidateQueries({ queryKey: queryKeys.groups.list('user-1') })` invalidates specific list

### Layer 3: Migrated Hooks (MODIFY EXISTING)

Wrap existing hooks to use React Query internally while maintaining the same interface.

```typescript
// src/hooks/useGroups.ts - MIGRATED VERSION
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/keys';
import * as groupQueries from '@/lib/queries/groups';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { handleError } from '@/lib/error';

export function useGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ===== QUERIES =====

  // READ - replaces useState + useEffect + fetchGroups
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups.list(user?.id ?? ''),
    queryFn: () => groupQueries.fetchGroups(user!.id),
    enabled: !!user, // Only fetch when user exists
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });

  // ===== MUTATIONS =====

  // CREATE
  const createMutation = useMutation({
    mutationFn: groupQueries.createGroup,
    onSuccess: (data) => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.list(user!.id)
      });
      toast({
        title: "Group Created",
        description: `"${data.name}" has been created`,
      });
    },
    onError: (error) => {
      handleError(error, { component: 'useGroups', action: 'create group' });
    },
  });

  // UPDATE
  const updateMutation = useMutation({
    mutationFn: groupQueries.updateGroup,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.detail(variables.groupId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.list(user!.id)
      });
      toast({ title: "Group Updated" });
    },
    onError: (error) => {
      handleError(error, { component: 'useGroups', action: 'update group' });
    },
  });

  // DELETE
  const deleteMutation = useMutation({
    mutationFn: groupQueries.deleteGroup,
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.all
      });
      toast({ title: "Group Deleted" });
    },
    onError: (error) => {
      handleError(error, { component: 'useGroups', action: 'delete group' });
    },
  });

  // ===== BACKWARD COMPATIBLE INTERFACE =====
  // Components using this hook don't need to change

  return {
    // Data
    groups: groupsQuery.data ?? [],
    loading: groupsQuery.isPending,

    // Manual refresh (for backward compatibility)
    fetchGroups: () => groupsQuery.refetch(),

    // Mutations with same signatures
    createGroup: async (name: string, color: string, icon?: string) => {
      if (!user) return null;
      try {
        return await createMutation.mutateAsync({ name, color, icon, userId: user.id });
      } catch {
        return null; // Match existing error behavior
      }
    },

    updateGroup: async (groupId: string, updates: Partial<Group>) => {
      try {
        await updateMutation.mutateAsync({ groupId, ...updates });
        return true;
      } catch {
        return false;
      }
    },

    deleteGroup: async (groupId: string) => {
      try {
        await deleteMutation.mutateAsync(groupId);
        return true;
      } catch {
        return false;
      }
    },

    // Existing methods that don't need migration (they're already callbacks)
    addMember: groupQueries.addMember,
    removeMember: groupQueries.removeMember,
    getGroupMembers: groupQueries.getGroupMembers,
  };
}
```

### Layer 4: Enhanced QueryClient Configuration

Enhance the existing QueryClient with better defaults and error handling.

```typescript
// src/App.tsx - ENHANCED
import { handleError } from '@/lib/error';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data freshness
      staleTime: 5 * 60 * 1000,      // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000,         // 30 minutes - cache garbage collection (replaces cacheTime in v5)

      // Refetch behavior
      refetchOnWindowFocus: true,     // Refetch when tab becomes active
      refetchOnReconnect: true,       // Refetch when network reconnects

      // Retry logic
      retry: (failureCount, error) => {
        // Don't retry on auth errors (401, 403)
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('401') || msg.includes('403') ||
              msg.includes('unauthorized') || msg.includes('forbidden')) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
    mutations: {
      // Global mutation error handler
      onError: (error) => {
        handleError(error, { component: 'mutation', action: 'global' });
      },
    },
  },
});
```

---

## Integration Points with Existing Components

### Components Using Hooks (No Changes Required)

These components call hooks and receive data - they need **zero changes** if hook interface is preserved:

| Component | Hooks Used | Migration Impact |
|-----------|------------|------------------|
| `CoachDashboard.tsx` | `useGroups`, `useAssignments` | None |
| `Templates.tsx` | `useTemplates` | None |
| `GroupDetail.tsx` | `useGroups` | None |
| `RecurringSchedules.tsx` | `useRecurringSchedules` | None |

### Components with Direct Supabase Calls (Migration Required)

Some pages bypass hooks and call Supabase directly. These need inline queries or new hooks:

```typescript
// People.tsx - lines 87-139 have direct Supabase calls
const fetchData = async () => {
  const { data: sessionsData, error: sessionsError } = await supabase
    .from("class_sessions").select("*")...
```

**Migration approach:** Create `useClassSessions` hook or use inline `useQuery`:

```typescript
// Option 1: Inline useQuery
const { data: groups, isLoading } = useQuery({
  queryKey: ['classSessions', user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("class_sessions")
      .select("*")
      .eq("coach_id", user!.id)
      .throwOnError();
    return data;
  },
  enabled: !!user,
});

// Option 2: Create dedicated hook (preferred for reuse)
// src/hooks/useClassSessions.ts
```

### Pages with Direct Supabase Calls

| Page | Direct Calls | Recommended Action |
|------|--------------|-------------------|
| `People.tsx` | class_sessions, instructor_students, profiles | Create `useClassSessions` hook |
| `StudentHome.tsx` | task_instances, group_members, profiles | Use `useAssignments` + new `useStudentGroups` |
| `CoachDashboard.tsx` | supabase.functions.invoke | Keep as-is (AI calls are different) |
| `GroupDetail.tsx` | task_instances queries | Extend `useAssignments` |

### Error Handling Integration

The existing `handleError()` utility integrates naturally with React Query:

```typescript
// Existing handleError stays the same
onError: (error) => {
  handleError(error, {
    component: 'useGroups',
    action: 'create group',
    retry: () => createMutation.mutate(params) // Optional retry callback
  });
}
```

---

## New Files Needed

| File | Purpose | Priority | Dependencies |
|------|---------|----------|--------------|
| `src/lib/queries/keys.ts` | Query key factory | P0 | None |
| `src/lib/queries/helpers.ts` | Error handling utilities | P0 | None |
| `src/lib/queries/groups.ts` | Group query functions | P0 | keys.ts |
| `src/lib/queries/profiles.ts` | Profile query functions | P0 | keys.ts |
| `src/lib/queries/templates.ts` | Template query functions | P1 | keys.ts |
| `src/lib/queries/assignments.ts` | Assignment query functions | P1 | keys.ts |
| `src/lib/queries/schedules.ts` | Schedule query functions | P2 | keys.ts |

**No new React components needed** - migration is internal to hooks layer.

---

## Data Flow Changes

### Before (Current Pattern)

```
Component Mount
    |
    v
useEffect triggers
    |
    v
setLoading(true)
    |
    v
supabase.from().select()
    |
    v
setData() / handleError()
    |
    v
setLoading(false)
    |
    v
Re-render
```

### After (React Query Pattern)

```
Component Mount
    |
    v
useQuery checks cache
    |
    +--[Cache hit & fresh]------> Return cached data immediately
    |                                    |
    +--[Cache hit & stale]------+        v
    |                           |    Render with cached data
    +--[Cache miss]-------------+        |
                                |        v
                                +---> Background fetch
                                         |
                                         v
                                    Cache updated
                                         |
                                         v
                                    Re-render with fresh data
```

**Key UX improvements:**
- Instant UI on cache hit (no loading spinner)
- Background refetch keeps data fresh without blocking UI
- Multiple components sharing data = single request
- Automatic retry on transient failures

---

## Suggested Build Order

### Phase 1: Foundation (No UI Changes)

**Goal:** Set up infrastructure without breaking anything.

1. **Create query key factory** - `src/lib/queries/keys.ts`
2. **Create Supabase helpers** - `src/lib/queries/helpers.ts` (throwOnError wrapper)
3. **Enhance QueryClient config** in `App.tsx` (add staleTime, gcTime, retry)

**Validation:** Run existing tests, no regressions.

### Phase 2: Migrate Simple Hooks

**Goal:** Validate pattern with lowest-risk hooks.

4. **Migrate `useProfile`** - Single entity, simple CRUD, low usage
5. **Migrate `useGroups`** - Core feature, moderate complexity
6. **Migrate `useTemplates`** - Similar pattern to groups

**Validation:** Manual testing of CoachDashboard, Templates pages.

### Phase 3: Migrate Complex Hooks

**Goal:** Handle complex nested queries.

7. **Migrate `useAssignments`** - Complex with nested task instances
8. **Migrate `useRecurringSchedules`** - Moderate complexity

**Validation:** Full regression test of assignment creation flow.

### Phase 4: Clean Up Direct Calls

**Goal:** Eliminate direct Supabase calls in pages.

9. **Create `useClassSessions`** for People.tsx
10. **Create `useStudentGroups`** for StudentHome.tsx
11. **Migrate remaining inline Supabase calls**

**Validation:** Full app regression testing.

### Phase 5: Optimization

**Goal:** Performance enhancements.

12. **Add optimistic updates** to mutations (instant UI feedback)
13. **Configure per-query staleTime** (different freshness per data type)
14. **Add prefetching** for predictable navigation patterns

---

## Patterns to Follow

### Pattern 1: Query Key Convention

```typescript
// Hierarchical keys enable targeted invalidation
queryKey: ['groups', 'list', userId]
queryKey: ['groups', 'detail', groupId]
queryKey: ['groups', 'members', groupId]

// Invalidate all groups data
queryClient.invalidateQueries({ queryKey: ['groups'] })

// Invalidate only group lists
queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })

// Invalidate specific group
queryClient.invalidateQueries({ queryKey: ['groups', 'detail', 'group-123'] })
```

### Pattern 2: Enabled Flag for Auth-Dependent Queries

```typescript
const { data } = useQuery({
  queryKey: queryKeys.groups.list(user?.id ?? ''),
  queryFn: () => fetchGroups(user!.id),
  enabled: !!user, // Prevents fetch before auth complete
});
```

### Pattern 3: Mutation with Cache Invalidation

```typescript
const mutation = useMutation({
  mutationFn: createGroup,
  onSuccess: () => {
    // Invalidate related queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  },
});
```

### Pattern 4: Optimistic Updates (Advanced)

```typescript
const mutation = useMutation({
  mutationFn: updateTask,
  onMutate: async (newData) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey: ['tasks', newData.id] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['tasks', newData.id]);

    // Optimistically update cache
    queryClient.setQueryData(['tasks', newData.id], newData);

    // Return context for rollback
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['tasks', newData.id], context?.previous);
  },
  onSettled: () => {
    // Always refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});
```

### Pattern 5: Backward Compatible Interface

```typescript
// Maintain existing return shape - zero component changes needed
return {
  groups: groupsQuery.data ?? [],      // Same as before: Group[]
  loading: groupsQuery.isPending,       // Same as before: boolean
  fetchGroups: () => groupsQuery.refetch(), // Same as before: () => void
  createGroup,                          // Same signature: (name, color) => Promise<Group|null>
  updateGroup,                          // Same signature: (id, updates) => Promise<boolean>
  deleteGroup,                          // Same signature: (id) => Promise<boolean>
};
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: State Sync with useEffect

```typescript
// BAD - Creates unnecessary re-renders, stale closure issues
const [groups, setGroups] = useState([]);
const { data } = useQuery({ queryKey: ['groups'], queryFn: fetchGroups });

useEffect(() => {
  if (data) setGroups(data);
}, [data]);

// GOOD - Use query data directly
const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: fetchGroups });
```

### Anti-Pattern 2: Manual Refetch After Mutation

```typescript
// BAD - Race condition, unnecessary complexity
const mutation = useMutation({
  mutationFn: createGroup,
  onSuccess: () => {
    fetchGroups(); // Manual refetch call
  },
});

// GOOD - Let React Query handle it
const mutation = useMutation({
  mutationFn: createGroup,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  },
});
```

### Anti-Pattern 3: Missing throwOnError

```typescript
// BAD - Supabase errors not caught by React Query
const { data } = await supabase.from('groups').select('*');
// error is in response object, React Query doesn't see it
// query.error is null, query.data is undefined - confusing state!

// GOOD - Errors thrown for React Query to catch
const { data } = await supabase.from('groups').select('*').throwOnError();
// Now query.error contains the error, query.data is undefined
```

### Anti-Pattern 4: Fetching in useEffect

```typescript
// BAD - Defeats the purpose of React Query
const { refetch } = useQuery({ queryKey: ['groups'], enabled: false });

useEffect(() => {
  refetch(); // Why use React Query if you're manually controlling fetches?
}, []);

// GOOD - Let React Query manage the lifecycle
const { data } = useQuery({
  queryKey: ['groups'],
  queryFn: fetchGroups,
  enabled: !!user, // Control with enabled flag
});
```

---

## Testing Considerations

The project already has React Query test infrastructure in `src/test/test-utils.tsx`:

```typescript
// Already exists - creates fresh QueryClient per test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}
```

**Migration tests should verify:**
1. **Cache behavior** - Correct data caching and invalidation
2. **Loading states** - `isPending` vs `isFetching` (background refetch)
3. **Error states** - Thrown Supabase errors appear in `query.error`
4. **Mutation effects** - Cache updates correctly after mutations

---

## Sources

- [TanStack Query v5 Migration Guide](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5) - Official documentation on v5 changes
- [How to use Supabase with React Query](https://makerkit.dev/blog/saas/supabase-react-query) - Integration patterns and `.throwOnError()` requirement
- [TanStack Query Discussions on callback removal](https://github.com/TanStack/query/discussions/6451) - Why onSuccess/onError were removed in v5
- [Migrating to TanStack Query v5](https://www.bigbinary.com/blog/migrating-to-tanstack-query-v5) - Breaking changes overview
- Codebase analysis: `src/hooks/*.ts`, `src/App.tsx`, `src/lib/error.ts`, `package.json`
