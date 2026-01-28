# Stack Research: v3.0 Auth & Realtime

**Project:** routine-craft-bot (Coach/Student Task Management)
**Researched:** 2026-01-28
**Scope:** Auth overhaul, Realtime subscriptions, Timezone handling

## Executive Summary

The existing stack (`@supabase/supabase-js@2.90.1`, `@tanstack/react-query@5.83.0`, `date-fns@3.6.0`) is well-positioned for v3.0 features. **No new npm dependencies required** for auth triggers or realtime. One addition recommended for timezone handling.

---

## Recommended Stack Additions

### Required Additions

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `date-fns-tz` | `^3.1.3` | Timezone conversion | You already have `date-fns@3.6.0`. The `date-fns-tz` package is the official companion for timezone operations. Provides `toZonedTime` and `fromZonedTime` for UTC-to-local conversion. No timezone data bundled (uses browser Intl API). |

### Already Present (No Changes Needed)

| Package | Current Version | Capability |
|---------|-----------------|------------|
| `@supabase/supabase-js` | `2.90.1` | Auth, Realtime, Database - latest stable |
| `@tanstack/react-query` | `5.83.0` | Data fetching, caching - current major |
| `date-fns` | `3.6.0` | Date manipulation - compatible with date-fns-tz v3 |

### Explicitly NOT Adding

| Package | Why Not |
|---------|---------|
| `@supabase-cache-helpers/postgrest-react-query` | Adds complexity without proportional benefit. Your existing React Query setup with manual `invalidateQueries` on realtime events is simpler and more predictable. The cache helpers auto-populate cache which can cause subtle bugs with optimistic updates. |
| `luxon` or `moment-timezone` | `date-fns-tz` is lighter (uses Intl API, no bundled timezone data) and integrates with your existing `date-fns` usage. |
| `@date-fns/utc` | Overkill for your use case. You need local-to-UTC conversion for display, not full UTC-mode date operations. |

---

## Supabase Features Required

### 1. Database Trigger: `handle_new_user`

**Purpose:** Atomically create profile when user signs up via Google OAuth.

**SQL Implementation:**

```sql
-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    display_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'coach'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Key Points:**
- `SECURITY DEFINER` allows trigger to write to public schema from auth schema
- `SET search_path = ''` is security best practice
- Access metadata via `NEW.raw_user_meta_data ->> 'field_name'`
- `COALESCE` handles missing metadata gracefully

**Accessing User Metadata in Trigger:**
```sql
NEW.id                                    -- User UUID
NEW.email                                 -- User email
NEW.raw_user_meta_data ->> 'full_name'    -- From Google OAuth
NEW.raw_user_meta_data ->> 'avatar_url'   -- From Google OAuth
NEW.raw_user_meta_data ->> 'role'         -- Custom metadata (if passed)
```

### 2. Passing Role During Google OAuth Signup

**Critical Finding:** Supabase OAuth does NOT support passing custom metadata during `signInWithOAuth()`. This is a known limitation with ongoing feature requests.

**Workaround Options (in order of recommendation):**

**Option A: URL Parameter + Post-Auth Update (RECOMMENDED)**
```typescript
// 1. Include role in redirect URL
const signInWithGoogle = async (role: 'coach' | 'student') => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
    },
  });
};

// 2. In callback handler, update profile
const handleCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role') || 'coach';

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles')
      .update({ role })
      .eq('user_id', user.id);
  }
};
```

**Option B: Separate Landing Pages**
- `/signup/coach` and `/signup/student` set role via different trigger logic
- Trigger checks `raw_app_meta_data` which CAN be set server-side

**Option C: Role Selection After Signup**
- Trigger creates profile with NULL role
- Force role selection on first login before accessing app

### 3. Supabase Realtime Subscriptions

**Channel Types Available:**
1. **Postgres Changes** - Listen to INSERT/UPDATE/DELETE on tables
2. **Broadcast** - Low-latency pub/sub between clients
3. **Presence** - Track online users

**For v3.0, you need:** Postgres Changes only

**Subscription Pattern:**

```typescript
// Subscribe to task_instances changes for a specific assignee
const channel = supabase
  .channel('task-updates')
  .on(
    'postgres_changes',
    {
      event: '*',                        // INSERT, UPDATE, DELETE, or *
      schema: 'public',
      table: 'task_instances',
      filter: `assignee_id=eq.${userId}` // Row-level filtering
    },
    (payload) => {
      // payload.new = new record (INSERT/UPDATE)
      // payload.old = old record (UPDATE/DELETE)
      // payload.eventType = 'INSERT' | 'UPDATE' | 'DELETE'
      console.log('Change:', payload);
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

**Available Filter Operators:**
- `eq` - Equal: `assignee_id=eq.${userId}`
- `neq` - Not equal
- `gt`, `gte`, `lt`, `lte` - Comparisons
- `in` - In list: `status=in.(pending,in_progress)` (max 100 values)

**Multiple Tables on One Channel:**
```typescript
const channel = supabase
  .channel('all-updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'task_instances' }, handleTaskChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, handleAssignmentChange)
  .subscribe();
```

---

## Integration with React Query

### Pattern: Realtime + React Query Cache Invalidation

**Recommended Approach:** Use realtime events to trigger `invalidateQueries()`, not direct cache updates.

**Why invalidate, not update directly:**
1. Simpler mental model - data always comes from server
2. Avoids cache/server divergence bugs
3. Works with your existing React Query setup
4. Handles edge cases (deleted records, permission changes)

**Implementation Pattern:**

```typescript
// useRealtimeSubscription.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queries/keys';

export function useTaskRealtimeSubscription(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`tasks-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_instances',
          filter: `assignee_id=eq.${userId}`,
        },
        (payload) => {
          // Invalidate relevant queries - React Query will refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.assignments.instances({ assigneeId: userId })
          });

          // For INSERT/UPDATE, could also update cache directly for optimistic feel:
          // queryClient.setQueryData(queryKey, (old) => mergeWithPayload(old, payload));
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error');
          // Consider: retry logic, user notification, or fallback polling
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, queryClient]);
}
```

**Connection Error Handling (IMPORTANT):**
```typescript
.subscribe((status, err) => {
  if (status === 'SUBSCRIBED') {
    console.log('Connected to realtime');
  }
  if (status === 'CHANNEL_ERROR') {
    // Connection lost - data may be stale
    // Refetch all relevant data
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
  }
  if (status === 'TIMED_OUT') {
    // Subscription timed out
    // Consider reconnecting or showing offline indicator
  }
});
```

### Tables to Subscribe To

| Table | Events | Filter | Query Keys to Invalidate |
|-------|--------|--------|--------------------------|
| `task_instances` | INSERT, UPDATE, DELETE | `assignee_id=eq.${userId}` | `assignments.instances`, `assignments.progress` |
| `assignments` | INSERT, UPDATE, DELETE | `assigned_by=eq.${coachId}` or `assignee_id=eq.${userId}` | `assignments.list`, `assignments.instances` |
| `profiles` | UPDATE | `user_id=eq.${userId}` | `profile.current` |

---

## Timezone Approach

### Strategy: Store UTC, Display Local

**Database:** All timestamps stored as UTC (PostgreSQL default with `timestamptz`)
**Frontend:** Convert to user's local timezone for display

### Implementation with date-fns-tz

**Installation:**
```bash
npm install date-fns-tz
```

**Key Functions:**

```typescript
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

// User's timezone (detect or from profile)
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g., 'America/New_York'

// UTC string from database -> Display in local time
const utcDate = '2026-01-28T15:00:00Z';
const localDate = toZonedTime(utcDate, userTimezone);
// Format for display
const display = formatInTimeZone(utcDate, userTimezone, 'MMM d, yyyy h:mm a zzz');
// -> "Jan 28, 2026 10:00 AM EST"

// Local input from user -> UTC for database
const userInputDate = new Date(2026, 0, 28, 10, 0); // 10 AM local
const utcForDb = fromZonedTime(userInputDate, userTimezone);
// -> UTC Date object to send to Supabase
```

**Integration with Existing date-fns Usage:**

Your current code uses `date-fns` for formatting. Wrap display formatting:

```typescript
// utils/timezone.ts
import { formatInTimeZone } from 'date-fns-tz';

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatLocalDateTime(utcDate: string | Date, formatStr: string = 'PPp'): string {
  return formatInTimeZone(utcDate, getUserTimezone(), formatStr);
}

export function formatLocalDate(utcDate: string | Date, formatStr: string = 'PP'): string {
  return formatInTimeZone(utcDate, getUserTimezone(), formatStr);
}
```

**Storing User Timezone (Optional):**
- Could add `timezone` column to `profiles` table
- Allows coach to see student times in student's timezone
- Default to browser-detected if not set

---

## What NOT to Add

### 1. @supabase-cache-helpers/postgrest-react-query

**Why avoid:**
- Adds abstraction layer over your working React Query setup
- Auto-cache population can conflict with optimistic updates
- Your `queryKeys` factory pattern already handles cache management well
- Learning curve for team with no proportional benefit
- Simple `invalidateQueries()` on realtime events is clearer

**When to reconsider:** If you need realtime to instantly update UI without any refetch (true optimistic realtime), and are willing to invest in understanding the library.

### 2. Moment.js or Luxon

**Why avoid:**
- You already have `date-fns` - adding another date library is redundant
- `date-fns-tz` is ~10KB and uses browser Intl API (no bundled timezone data)
- Luxon bundles timezone data (~40KB+)
- Moment.js is deprecated and large

### 3. Custom Auth Hook Library

**Why avoid:**
- Your `useAuth` hook is already well-structured
- Adding `@supabase/auth-ui-react` or similar adds complexity for minimal gain
- Google OAuth is the only provider - no need for provider abstraction

### 4. Supabase Edge Functions for Auth

**Why avoid for v3.0:**
- Database triggers handle profile creation atomically
- Edge Functions add deployment complexity
- Only needed if you require external API calls during signup

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| **Auth Triggers** | HIGH | Verified with official Supabase documentation. `handle_new_user` pattern is well-documented and stable. |
| **Role Passing Limitation** | HIGH | Confirmed via GitHub discussions and official docs that OAuth does not support custom metadata during signup. Workarounds verified. |
| **Realtime Subscriptions** | HIGH | Official documentation provides complete API. Pattern is stable in supabase-js v2.x. |
| **React Query Integration** | HIGH | Standard pattern used in production apps. Simple invalidation approach is recommended by TanStack team. |
| **date-fns-tz Compatibility** | HIGH | Version 3.x explicitly supports date-fns v3.x. API verified from official repository. |
| **NOT Adding cache-helpers** | MEDIUM | Subjective recommendation based on complexity vs. benefit analysis. Some teams prefer it. |

---

## Migration Path for Existing Code

### 1. Remove Client-Side Profile Creation

**Current (`useProfile.ts`):**
```typescript
// Auto-creates profile if missing - REMOVE this logic
if (error.code === "PGRST116") {
  const newProfile = { ... };
  await supabase.from("profiles").insert(newProfile);
}
```

**New:** Let database trigger handle this. `useProfile` becomes read-only for profile fetch.

### 2. Update Google OAuth Hook

**Current (`useGoogleAuth.ts`):** No role parameter

**New:** Accept role parameter, include in redirect URL:
```typescript
const signInWithGoogle = useCallback(async (role?: 'coach' | 'student') => {
  const redirectUrl = role
    ? `${window.location.origin}/auth/callback?role=${role}`
    : `${window.location.origin}`;
  // ...
}, []);
```

### 3. Add Realtime Subscriptions

**New file:** `src/hooks/useRealtimeSubscription.ts`

Wire into relevant pages (CoachDashboard, StudentTasks) via custom hook.

---

## Installation Commands

```bash
# Single addition for timezone support
npm install date-fns-tz

# No other npm changes needed
```

---

## Sources

### Official Documentation
- [Supabase User Management - Database Triggers](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase Postgres Changes Subscriptions](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)

### GitHub Discussions
- [OAuth metadata limitations - Discussion #29075](https://github.com/orgs/supabase/discussions/29075)
- [React Query + Supabase Realtime - Discussion #5048](https://github.com/orgs/supabase/discussions/5048)

### Package Documentation
- [date-fns-tz GitHub](https://github.com/marnusw/date-fns-tz) - v3.x API reference
- [@supabase/supabase-js Releases](https://github.com/supabase/supabase-js/releases) - v2.90.1 is current stable

### Best Practices
- [Supabase Cache Helpers Documentation](https://supabase-cache-helpers.vercel.app/) - Reviewed but not recommended for this project
- [How to use Supabase with React Query](https://makerkit.dev/blog/saas/supabase-react-query) - Pattern reference
