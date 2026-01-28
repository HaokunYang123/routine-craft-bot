# Architecture Research: v3.0 Auth & Realtime

**Domain:** Auth overhaul, realtime sync, timezone handling integration
**Researched:** 2026-01-28
**Confidence:** HIGH (existing codebase analyzed, official Supabase docs verified)

---

## Executive Summary

This milestone adds four interconnected features to the existing React Query + Supabase architecture:

1. **Database Trigger Enhancement** - Improve `handle_new_user` to properly read role metadata
2. **Role-Based Routing** - Flow role selection pre-login through OAuth to post-login routing
3. **Realtime Subscriptions** - Integrate Supabase realtime with React Query caching
4. **Timezone Handling** - Store UTC, convert on display, respect user preferences

All features integrate with the **existing React Query infrastructure** (already migrated in v2.0). The key architectural decision is **cache invalidation vs direct cache updates** for realtime - this research recommends a hybrid approach.

---

## Database Trigger Architecture

### Current State Analysis

The existing `handle_new_user` trigger in `supabase/FIX_SIGNUP_TRIGGER.sql`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student') -- Default to student if not specified
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Current Issues:**
1. **Role defaults to 'student'** - Correct for students, but coaches signing up via Google OAuth may not have metadata set
2. **No email storage** - Trigger doesn't copy email to profiles table
3. **No timezone field** - Profile table lacks timezone preference

### Recommended Trigger Enhancement

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, role, timezone)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',  -- Google OAuth provides full_name
      NEW.raw_user_meta_data->>'name',        -- Some providers use 'name'
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')  -- Default UTC
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Key Design Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default role | 'student' | Safer default; coaches must explicitly select |
| Display name fallback | full_name > name > email prefix | Covers Google OAuth + other providers |
| Timezone storage | IANA string (e.g., 'America/New_York') | Works with date-fns-tz, browser Intl API |
| Error handling | WARN + RETURN NEW | Don't block signup on profile creation failure |
| Security | SECURITY DEFINER | Required since trigger runs as `supabase_auth_admin` |

### Profile Schema Enhancement

```sql
-- Add timezone column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add email column if missing
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;
```

---

## Auth Flow Architecture

### Current Auth Flow Analysis

The current implementation in `CoachAuth.tsx` and `StudentAuth.tsx`:

1. User selects role at `/login` (RoleSelection component)
2. Navigates to `/login/coach` or `/login/student`
3. Signs up with role in `user_metadata`: `data: { role: "coach" }` or `data: { role: "student" }`
4. `handle_new_user` trigger creates profile with role
5. Post-login redirect based on profile role

**Current Problems:**

1. **Google OAuth loses role context** - The redirect flow loses which page user came from
2. **localStorage workaround** - Current code uses `localStorage.setItem("intended_role", "coach")` which is fragile
3. **Role mismatch after OAuth** - User selects "Teacher" but ends up as "student" if OAuth callback doesn't preserve role

### Recommended Role Flow Architecture

```
[User Intent]           [OAuth Flow]                [Post-Auth Resolution]
     |                       |                              |
     v                       v                              v
+-----------+          +----------+                 +---------------+
| /login    |   state  | OAuth    |   callback      | Auth Callback |
| Coach btn |--------->| Provider |---------------->| Component     |
| role=coach|          | (Google) |   ?code=xyz     |               |
+-----------+          +----------+                 +-------|-------+
                                                           |
                                                           v
                                                    +--------------+
                                                    | Check Profile|
                                                    | role in DB   |
                                                    +-------|------+
                                                           |
                            +---------- role exists? ------+
                            |                              |
                            v                              v
                     +------------+              +------------------+
                     | Route to   |              | Update profile   |
                     | /dashboard |              | with stored role |
                     | or /app    |              +------------------+
                     +------------+
```

### Implementation Strategy

**Option A: State Parameter (Recommended)**

Supabase OAuth supports passing state through the redirect flow:

```typescript
// CoachAuth.tsx
const handleGoogleSignIn = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?intended_role=coach`,
    },
  });
};
```

**Option B: Separate OAuth Apps**

Configure two Google OAuth apps with different redirect URIs:
- `/auth/callback/coach` - Sets role to coach
- `/auth/callback/student` - Sets role to student

**Recommendation:** Use Option A with query parameter. Simpler, maintains single OAuth app.

### Auth Callback Handler (NEW COMPONENT)

```typescript
// src/components/auth/AuthCallback.tsx
export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        navigate('/login');
        return;
      }

      const intendedRole = searchParams.get('intended_role');
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      // If profile exists with role, respect it
      if (profile?.role) {
        navigate(profile.role === 'coach' ? '/dashboard' : '/app');
        return;
      }

      // New user - set intended role
      if (intendedRole) {
        await supabase
          .from('profiles')
          .update({ role: intendedRole })
          .eq('user_id', session.user.id);
      }

      navigate(intendedRole === 'coach' ? '/dashboard' : '/app');
    };

    handleCallback();
  }, [navigate, searchParams]);

  return <LoadingSpinner />;
}
```

### Integration with Existing ProtectedRoute

The existing `ProtectedRoute.tsx` handles role-based access. No changes needed - it already:
1. Fetches role from profiles table
2. Redirects based on role mismatch

---

## Realtime + React Query Integration

### Architecture Decision: Invalidation vs Direct Update

There are two strategies for combining Supabase realtime with React Query:

| Strategy | Pros | Cons |
|----------|------|------|
| **Cache Invalidation** | Simple, always fresh from server | More network requests, slight delay |
| **Direct Cache Update** | Instant UI update, less network | Complex conflict resolution, stale risk |

**Recommendation: Hybrid Approach**

- **Inserts/Deletes**: Direct cache update (show instantly)
- **Updates from other users**: Cache invalidation (ensure consistency)
- **Own updates**: Already use optimistic updates (existing pattern)

### Integration Architecture

```
[Supabase Realtime]                    [React Query Cache]
       |                                      |
       |  INSERT/UPDATE/DELETE event          |
       v                                      |
+---------------+                             |
| Subscription  |                             |
| Channel       |--------- payload ---------->|
+---------------+                             |
                                              v
                              +----------------------------+
                              | Event Handler              |
                              |                            |
                              | if INSERT:                 |
                              |   setQueryData (add item)  |
                              |                            |
                              | if UPDATE && own:          |
                              |   (already optimistic)     |
                              |                            |
                              | if UPDATE && other:        |
                              |   invalidateQueries        |
                              |                            |
                              | if DELETE:                 |
                              |   setQueryData (remove)    |
                              +----------------------------+
```

### useRealtimeSubscription Hook (NEW)

```typescript
// src/hooks/useRealtimeSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { queryKeys } from '@/lib/queries/keys';

interface RealtimeConfig {
  table: string;
  filter?: string;
  queryKeyToInvalidate: readonly unknown[];
  // Optional: direct cache update handler
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export function useRealtimeSubscription(config: RealtimeConfig) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`${config.table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: config.table,
          filter: config.filter,
        },
        (payload) => {
          const isOwnChange = payload.new?.updated_by === user.id;

          switch (payload.eventType) {
            case 'INSERT':
              if (config.onInsert) {
                config.onInsert(payload.new);
              } else {
                // Default: invalidate to refetch
                queryClient.invalidateQueries({
                  queryKey: config.queryKeyToInvalidate
                });
              }
              break;

            case 'UPDATE':
              // If own change, optimistic update already handled
              if (!isOwnChange) {
                if (config.onUpdate) {
                  config.onUpdate(payload.new);
                } else {
                  queryClient.invalidateQueries({
                    queryKey: config.queryKeyToInvalidate
                  });
                }
              }
              break;

            case 'DELETE':
              if (config.onDelete) {
                config.onDelete(payload.old);
              } else {
                queryClient.invalidateQueries({
                  queryKey: config.queryKeyToInvalidate
                });
              }
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, config, queryClient]);
}
```

### Usage Example: Task Instances Realtime

```typescript
// In StudentHome.tsx or a wrapper component
export function TaskListWithRealtime({ assigneeId, date }: Props) {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    table: 'task_instances',
    filter: `assignee_id=eq.${assigneeId}`,
    queryKeyToInvalidate: queryKeys.assignments.instances({ assigneeId, date }),

    // Direct insert handling for instant UI
    onInsert: (newTask) => {
      queryClient.setQueryData(
        queryKeys.assignments.instances({ assigneeId, date }),
        (old: TaskInstance[] | undefined) => old ? [...old, newTask] : [newTask]
      );
    },

    // Direct delete handling for instant UI
    onDelete: (deletedTask) => {
      queryClient.setQueryData(
        queryKeys.assignments.instances({ assigneeId, date }),
        (old: TaskInstance[] | undefined) =>
          old?.filter(t => t.id !== deletedTask.id) ?? []
      );
    },
  });

  // Rest of component uses existing useAssignments hook
}
```

### Conflict Resolution Strategy

When optimistic updates conflict with realtime events:

```typescript
const updateTaskStatusMutation = useMutation({
  mutationFn: updateTaskStatus,

  onMutate: async ({ taskId, status }) => {
    // Standard optimistic update
    await queryClient.cancelQueries({ queryKey: ['assignments', 'instances'] });
    const previous = queryClient.getQueryData(['assignments', 'instances']);

    queryClient.setQueryData(['assignments', 'instances'], (old) =>
      old?.map(t => t.id === taskId ? { ...t, status } : t)
    );

    return { previous };
  },

  onError: (err, variables, context) => {
    // Rollback optimistic update
    if (context?.previous) {
      queryClient.setQueryData(['assignments', 'instances'], context.previous);
    }
  },

  onSettled: () => {
    // Always refetch to reconcile with server truth
    // This catches any realtime conflicts
    queryClient.invalidateQueries({ queryKey: ['assignments', 'instances'] });
  },
});
```

**Key Insight:** The `onSettled` invalidation ensures eventual consistency even if realtime and optimistic updates create temporary divergence.

---

## Timezone Architecture

### Design Principles

1. **Store UTC in database** - All timestamps in UTC
2. **Convert on display** - Convert to user's timezone when rendering
3. **Convert on input** - Convert user input back to UTC before storage
4. **Date-only fields stay naive** - `scheduled_date` (DATE type) has no timezone

### Storage Strategy

| Field | DB Type | Storage | Example |
|-------|---------|---------|---------|
| `created_at` | TIMESTAMPTZ | UTC | `2026-01-28T15:30:00Z` |
| `completed_at` | TIMESTAMPTZ | UTC | `2026-01-28T15:30:00Z` |
| `scheduled_date` | DATE | Naive (no TZ) | `2026-01-28` |
| `scheduled_time` | TIME | Naive (no TZ) | `09:30:00` |
| `profiles.timezone` | TEXT | IANA TZ ID | `America/New_York` |

### Conversion Layer Architecture

```
[Database]           [Utility Layer]          [Component]
    |                      |                       |
    |  UTC timestamp       |                       |
    v                      |                       |
+--------+            +---------+            +----------+
| UTC    |----------->| toLocal |----------->| Display  |
| stored |            | (tz)    |            | "3:30 PM"|
+--------+            +---------+            +----------+

+----------+          +---------+            +--------+
| User     |--------->| toUTC   |----------->| Store  |
| "3:30 PM"|          | (tz)    |            | as UTC |
+----------+          +---------+            +--------+
```

### Timezone Utilities (NEW FILE)

```typescript
// src/lib/timezone.ts
import { format, parse } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Get user's timezone, falling back to browser timezone
 */
export function getUserTimezone(profile?: { timezone?: string | null }): string {
  return profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert UTC timestamp to user's local time for display
 */
export function toLocalTime(utcDate: Date | string, timezone: string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return toZonedTime(date, timezone);
}

/**
 * Convert local time input to UTC for storage
 */
export function toUTCTime(localDate: Date, timezone: string): Date {
  return fromZonedTime(localDate, timezone);
}

/**
 * Format a UTC timestamp in user's local timezone
 */
export function formatInTimezone(
  utcDate: Date | string,
  timezone: string,
  formatStr: string = 'h:mm a'
): string {
  const local = toLocalTime(utcDate, timezone);
  return format(local, formatStr);
}

/**
 * For scheduled_date + scheduled_time combination
 * Returns display string like "Jan 28 at 3:30 PM"
 */
export function formatScheduledDateTime(
  scheduledDate: string,  // "2026-01-28"
  scheduledTime: string | null,  // "15:30:00" or null
  timezone: string
): string {
  if (!scheduledTime) {
    return format(new Date(scheduledDate + 'T12:00:00'), 'MMM d');
  }

  // Combine date and time, interpret as UTC, then convert to local
  const utcDateTime = new Date(`${scheduledDate}T${scheduledTime}Z`);
  const localDateTime = toLocalTime(utcDateTime, timezone);

  return format(localDateTime, 'MMM d \'at\' h:mm a');
}
```

### Component Integration Pattern

```typescript
// In a task display component
function TaskCard({ task }: { task: TaskInstance }) {
  const { profile } = useProfile();
  const timezone = getUserTimezone(profile);

  const displayTime = formatScheduledDateTime(
    task.scheduled_date,
    task.scheduled_time,
    timezone
  );

  return (
    <div>
      <span>{task.name}</span>
      <span>{displayTime}</span>
    </div>
  );
}
```

### Timezone Settings UI Integration

Add to `CoachSettings.tsx` and `StudentSettings.tsx`:

```typescript
// Common timezone options (top 20 by usage)
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Time' },
  { value: 'Australia/Sydney', label: 'Sydney Time' },
  { value: 'UTC', label: 'UTC (no DST)' },
];
```

---

## Component Changes

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AuthCallback` | `src/components/auth/AuthCallback.tsx` | Handle OAuth redirect, set role |
| `TimezoneSelect` | `src/components/settings/TimezoneSelect.tsx` | Timezone picker with search |
| `RealtimeProvider` | `src/components/RealtimeProvider.tsx` | Optional: Global realtime setup |

### Modified Components

| Component | What Changes | Why |
|-----------|--------------|-----|
| `App.tsx` | Add `/auth/callback` route | OAuth redirect handling |
| `CoachAuth.tsx` | Update OAuth redirect URL | Include intended_role |
| `StudentAuth.tsx` | Update OAuth redirect URL | Include intended_role |
| `ProtectedRoute.tsx` | No changes | Already handles role routing |
| `CoachSettings.tsx` | Add timezone selector | User preference |
| `StudentSettings.tsx` | Add timezone selector | User preference |
| `StudentHome.tsx` | Add realtime subscription | Live task updates |
| `GroupDetail.tsx` | Add realtime subscription | Coach sees student progress live |

### Modified Hooks

| Hook | What Changes | Why |
|------|--------------|-----|
| `useProfile.ts` | Fetch/update timezone | Profile includes timezone |
| `useAssignments.ts` | No direct changes | Consumed by realtime layer |
| `useAuth.tsx` | Minor: clear intended_role localStorage | Cleanup |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/timezone.ts` | Timezone conversion utilities |
| `src/hooks/useRealtimeSubscription.ts` | Realtime + React Query bridge |
| `src/components/auth/AuthCallback.tsx` | OAuth callback handler |
| `supabase/migrations/xxxx_add_timezone.sql` | Add timezone to profiles |
| `supabase/migrations/xxxx_update_trigger.sql` | Enhanced handle_new_user |

---

## Suggested Build Order

### Phase 1: Database Foundation

**Dependencies:** None
**Risk:** LOW (additive schema changes)

1. Add `timezone` column to profiles table
2. Add `email` column to profiles table (if missing)
3. Update `handle_new_user` trigger with enhanced logic
4. Test trigger with new signups

**Validation:** Create test user, verify profile has timezone

### Phase 2: Auth Flow Enhancement

**Dependencies:** Phase 1 complete
**Risk:** MEDIUM (auth changes can break login)

1. Create `AuthCallback` component
2. Add `/auth/callback` route to App.tsx
3. Update `CoachAuth.tsx` OAuth redirect URL
4. Update `StudentAuth.tsx` OAuth redirect URL
5. Test Google OAuth flow for both roles

**Validation:** Sign up as coach via Google, verify role is correct

### Phase 3: Timezone Implementation

**Dependencies:** Phase 1 complete
**Risk:** LOW (additive, no breaking changes)

1. Create `src/lib/timezone.ts` utilities
2. Install `date-fns-tz` if not present
3. Create `TimezoneSelect` component
4. Add timezone to settings pages
5. Update task display components to use timezone

**Validation:** Change timezone, verify task times display correctly

### Phase 4: Realtime Integration

**Dependencies:** Phases 1-3 complete (needs timezone for accurate times)
**Risk:** MEDIUM (realtime can cause cache conflicts)

1. Create `useRealtimeSubscription` hook
2. Add subscription to `StudentHome.tsx` for task_instances
3. Add subscription to `GroupDetail.tsx` for task progress
4. Test concurrent updates (coach + student)
5. Verify no cache conflicts with optimistic updates

**Validation:** Coach marks task complete, student sees update within 2s

---

## Pitfalls to Avoid

### Pitfall 1: Realtime + Optimistic Update Race Condition

**What happens:** User completes task (optimistic update), realtime event arrives, overwrites optimistic state.

**Prevention:** Use `onSettled` invalidation pattern shown above. The server-side truth reconciles any conflicts.

### Pitfall 2: Timezone Confusion with DATE vs TIMESTAMPTZ

**What happens:** `scheduled_date` is DATE (no timezone), but displaying it with timezone conversion shifts the day.

**Prevention:** Keep DATE fields as naive dates. Only apply timezone to TIME and TIMESTAMPTZ fields.

```typescript
// WRONG - shifts date by timezone offset
const displayDate = toZonedTime(new Date(task.scheduled_date), timezone);

// RIGHT - naive date display
const displayDate = format(new Date(task.scheduled_date + 'T12:00:00'), 'MMM d');
```

### Pitfall 3: OAuth Role Not Persisting

**What happens:** User selects "Teacher", goes through Google OAuth, ends up as "student".

**Prevention:** Use query parameter in redirect URL, NOT localStorage. The callback URL is:
```
/auth/callback?intended_role=coach
```

### Pitfall 4: Multiple Realtime Subscriptions

**What happens:** Each component creates its own subscription, causing duplicate events.

**Prevention:** Lift subscription to a common ancestor or use a single subscription per table per user session.

### Pitfall 5: SECURITY DEFINER Not Set

**What happens:** Trigger runs as `supabase_auth_admin` which can't insert into public schema tables.

**Prevention:** Always use `SECURITY DEFINER` for auth triggers:
```sql
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Integration with Existing React Query Architecture

The v2.0 milestone already established React Query patterns. This milestone builds on them:

| Existing Pattern | How v3.0 Uses It |
|------------------|------------------|
| `queryKeys` factory | Realtime subscriptions use same keys for invalidation |
| Optimistic updates in `useAssignments` | `onSettled` reconciles with realtime |
| `QueryClient` in App.tsx | No changes needed, reuse existing instance |
| Error handling via `handleError` | Realtime errors flow through same handler |

### Key Integration Point: Query Key Consistency

```typescript
// Existing key from keys.ts
queryKeys.assignments.instances({ assigneeId, date })

// Realtime uses SAME key for invalidation
useRealtimeSubscription({
  table: 'task_instances',
  queryKeyToInvalidate: queryKeys.assignments.instances({ assigneeId, date }),
});
```

This ensures realtime events invalidate the exact same cache entries that queries populate.

---

## Sources

### Official Documentation (HIGH Confidence)
- [Supabase Auth Architecture](https://supabase.com/docs/guides/auth/architecture) - OAuth flows
- [Supabase Postgres Triggers](https://supabase.com/docs/guides/database/postgres/triggers) - Trigger patterns
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) - Subscription API
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data) - handle_new_user patterns
- [TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Cache patterns
- [date-fns-tz Documentation](https://www.npmjs.com/package/date-fns-tz) - Timezone handling

### Community Resources (MEDIUM Confidence)
- [How to use Supabase with React Query](https://makerkit.dev/blog/saas/supabase-react-query) - Integration patterns
- [Supabase Cache Helpers](https://github.com/psteinroe/supabase-cache-helpers) - Alternative approach (considered but not recommended due to migration complexity)
- [TkDodo: Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) - Conflict resolution patterns
- [Automatically Creating New Users in Supabase with SQL Triggers](https://anhthang.org/posts/2024-05-30-automatically-creating-new-users-in-supabase-with-sql-triggers) - Trigger examples

### Codebase Analysis (HIGH Confidence)
- `src/hooks/useAuth.tsx` - Current auth state management
- `src/hooks/useAssignments.ts` - Existing optimistic update pattern
- `src/hooks/useProfile.ts` - Profile fetching pattern
- `src/components/ProtectedRoute.tsx` - Role-based routing
- `src/components/auth/CoachAuth.tsx` - Current OAuth implementation
- `src/components/auth/StudentAuth.tsx` - Current OAuth implementation
- `supabase/FIX_SIGNUP_TRIGGER.sql` - Current trigger implementation
- `.planning/research/REACT_QUERY_ARCHITECTURE.md` - Existing React Query patterns
- `.planning/codebase/ARCHITECTURE.md` - Overall system architecture
