# Features Research: v3.0 Auth & Realtime

**Project:** Routine Craft Bot (Coach/Student Task Management)
**Researched:** 2026-01-28
**Research Mode:** Ecosystem (Features Dimension)

---

## Auth Flow Features

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Role selection before auth** | Users must self-identify as Coach or Student before signup. Without this, the app cannot route them correctly or create appropriate profiles. | Low | Landing page with two clear CTAs: "I am a Coach" / "I am a Student" |
| **Google OAuth with role metadata** | Role must persist through OAuth flow. Users select role, then authenticate, and role appears in their profile on first login. | Medium | Supabase `signInWithOAuth` does NOT natively support passing metadata. Workaround: Store role in localStorage pre-OAuth, then update profile in `handle_new_user` trigger or post-auth callback. |
| **Atomic profile creation via DB trigger** | Profile must exist immediately when user record exists. No race conditions, no "profile not found" errors. This is fundamental data integrity. | Medium | `handle_new_user` trigger on `auth.users` INSERT. MUST use `SECURITY DEFINER`. If trigger fails, signup fails - thorough testing required. |
| **Role-based routing from database** | App queries database for role, not localStorage/session. Database is source of truth. Prevents spoofing and inconsistent state. | Low | Query `profiles.role` on app load, route to `/dashboard` (coach) or `/app` (student) |
| **Session persistence** | Users stay logged in across browser sessions, page reloads. Standard OAuth behavior. | Low | Already implemented via Supabase Auth with localStorage persistence |
| **Session expiry handling** | Graceful handling when JWT expires or refresh fails. Show modal, redirect to login - never leave user in broken state. | Low | Already implemented: `sessionExpired` state in `useAuth` |
| **Remove email/password auth** | Single auth provider simplifies flow, reduces attack surface, removes code paths. Google-only is the design decision. | Low | Delete CoachAuth/StudentAuth email forms, keep only Google OAuth button |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Instant profile availability** | Profile exists before user code runs. No loading states for profile after login. No "creating profile..." spinners. Zero latency to usable state. | Low | DB trigger handles creation; React Query pre-populates cache immediately |
| **Role immutability** | Once assigned, role cannot change. Simplifies authorization logic, prevents role confusion. Business rule: one user = one role, forever. | Low | Don't build role-switching UI. RLS policies can enforce immutability. |
| **Student onboarding flow** | Students login first, then join class. Clear separation: auth is "who are you", class joining is "where do you belong". Better UX than combined flow. | Medium | Post-login empty state for students with prominent "Join a Class" CTA |
| **Pre-auth role visualization** | Show different value propositions on landing page for Coach vs Student. Help users understand what they're signing up for. | Low | Conditional content on landing page based on hovered/selected role |

### Dependencies on Existing Features

- **QR/Code class joining** - Keep for students to join classes (don't confuse with removed login-via-code)
- **ProtectedRoute** - Already exists, needs minor update to query DB for role instead of checking local state
- **useAuth/useProfile hooks** - Already exist, need modifications for trigger-based profile creation

---

## Realtime Features

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Task completion visible to coach instantly** | When student marks task complete, coach dashboard updates without refresh. Core realtime expectation for collaborative apps. | Medium | Supabase Realtime `postgres_changes` on `task_instances` table. Already partially implemented in `CoachDashboard.tsx` |
| **Assignment creation visible to students** | When coach creates new assignment, student sees it without refresh. Same expectation as above. | Medium | Subscribe to `assignments` and `task_instances` tables |
| **Proper subscription cleanup** | No memory leaks. Subscriptions unsubscribed on component unmount. | Low | `useEffect` cleanup with `supabase.removeChannel(channel)` - pattern already exists |
| **React Query cache invalidation on realtime events** | Realtime events should invalidate relevant React Query caches, triggering refetch with fresh data. | Medium | On realtime event, call `queryClient.invalidateQueries({ queryKey: ... })` |
| **Connection recovery** | If websocket disconnects (mobile network, browser tab sleep), reconnect and refetch data to catch any missed events. | Medium | Monitor subscription status, refetch on reconnect. Chrome/Edge suspend tabs after 10 minutes - must handle. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Optimistic UI with realtime confirmation** | Optimistic updates (already have) + realtime confirmation that mutation succeeded server-side. Belt and suspenders reliability. | Low | Already have optimistic updates; realtime just confirms. No extra work if optimistic cache matches server state. |
| **Presence indicators** | Show when coach is online, when students are active. Optional but creates engagement feeling. | High | Supabase Realtime Presence feature. Defer unless specifically requested. |
| **Granular subscriptions** | Subscribe only to relevant data (e.g., student's own tasks, coach's own groups). Reduces unnecessary traffic and DB load. | Medium | Use filters: `filter: 'user_id=eq.${userId}'` or similar |
| **Calendar freshness via realtime** | Coach calendar view updates when tasks are completed, showing progress in real-time on the calendar. | Medium | Invalidate `useAssignments` query on task_instances change |

### Dependencies on Existing Features

- **React Query infrastructure** - Already migrated (v2.0). Realtime invalidates queries.
- **Existing realtime subscription in CoachDashboard** - Already subscribes to `task_instances` changes. Extend pattern to other views.
- **Query key factory** - Already exists (`queryKeys`). Use for invalidation targets.

---

## Timezone Features

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Store all dates in UTC** | Single source of truth. No ambiguity about what "6 PM" means. Database stores UTC, always. | Medium | Existing schema may store local times. Migration required if so. |
| **Display dates in user's local timezone** | UTC stored, local displayed. User sees "6 PM" in their timezone, not UTC. | Medium | Use `date-fns-tz` (or date-fns v4+ with built-in TZ support). `toZonedTime()` for display. |
| **User timezone detection** | Automatically detect user's timezone from browser. Don't make them configure it. | Low | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| **Correct "today" boundary** | "Today's tasks" means tasks for today in user's local timezone, not UTC. Critical for daily task views. | Medium | Calculate today's start/end in local TZ, convert to UTC for query |
| **Daily rollover logic** | At midnight local time, yesterday's incomplete tasks become "missed", today's tasks become "pending". | High | Requires either: (a) client-side recalculation on load, or (b) server cron job, or (c) DB trigger. See Pitfalls. |
| **Consistent date display format** | Same format throughout app. Localized (e.g., "Jan 28, 2026" in US, "28 Jan 2026" in UK). | Low | Use `date-fns` format with locale |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Explicit timezone in profile** | Store user's timezone in profile. Allows server-side operations to know user's TZ without relying on client. | Low | Add `timezone` column to profiles table |
| **Timezone-aware scheduling UI** | When coach schedules task for "5 PM", they can see what time that is for students in different timezones (if relevant). | High | Only needed for multi-timezone classrooms. Defer unless requested. |
| **DST-safe scheduling** | Handle daylight saving transitions gracefully. Task at "2 AM" on DST transition day doesn't break. | Medium | Use IANA timezone names (e.g., "America/New_York"), let `date-fns-tz` handle DST |

### Dependencies on Existing Features

- **Existing date utilities** - `safeParseISO`, `safeFormatDate` exist but may need TZ awareness
- **Calendar views** - CoachCalendar displays dates; needs UTC-to-local conversion
- **Task scheduling** - `useAssignments` creates task instances with dates; must store UTC

---

## Anti-Features

Features to deliberately NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Email/password auth** | Single provider (Google) simplifies security, UX, and maintenance. Email/password adds forgot-password flow, email verification, password strength rules. | Google OAuth only. Delete email auth code. |
| **Login-via-code for auth** | Confuses auth (who are you) with class joining (where do you belong). Students should authenticate first, then join class. | Keep code-based class joining. Remove code-based login. |
| **Role switching** | "One user = one role" simplifies authorization, prevents edge cases, matches real-world usage (a coach is always a coach). | No role switching UI. Roles immutable after profile creation. |
| **Client-side profile creation fallback** | If DB trigger fails, don't try to create profile in app code. That creates race conditions and split-brain scenarios. | Trust the trigger. If profile doesn't exist, something is wrong - surface error, don't silently fix. |
| **Global realtime subscriptions** | Subscribing to all changes on a table is expensive (100 users = 100 RLS checks per change). Doesn't scale. | Use filtered subscriptions. Subscribe only to data user needs. |
| **Presence without purpose** | "User X is online" is meaningless without action. Don't build presence just because Supabase supports it. | Defer presence until there's a use case (e.g., "coach is watching your progress"). |
| **Manual timezone configuration** | Users shouldn't have to configure their timezone. Browser already knows. | Auto-detect from browser. Only allow override if user explicitly requests. |
| **Timezone for each task** | Overcomplicates data model. Tasks don't have timezones, users do. | Store task times in UTC. Convert based on viewing user's timezone. |
| **Realtime for everything** | Not all data needs realtime. Templates, stickers, profile changes don't need instant updates. | Realtime only for: task_instances, assignments. Everything else uses React Query's staleTime. |
| **Cron-based task rollover** | External cron job adds infrastructure complexity, can miss executions, requires monitoring. | Client-side rollover on app load, or DB trigger on date change. Prefer client-side for simplicity. |

---

## Complexity Assessment

### Straightforward (Low Complexity)

| Feature | Reasoning |
|---------|-----------|
| Role selection landing page | UI only. Two buttons, conditional routing. No backend. |
| Remove email/password auth | Deletion is easier than addition. Remove code paths. |
| Session handling | Already implemented. Minor tweaks at most. |
| React Query invalidation | Pattern exists. Just add `invalidateQueries` calls in realtime handlers. |
| Timezone detection | One-liner: `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| Role-based routing | Already exists. Just verify DB query instead of local state. |

### Moderate (Medium Complexity)

| Feature | Reasoning |
|---------|-----------|
| Atomic profile creation trigger | Requires PostgreSQL trigger, `SECURITY DEFINER`, testing edge cases. Must not break signups. |
| Google OAuth with role metadata | Supabase doesn't support passing metadata in `signInWithOAuth`. Need workaround: localStorage pre-auth, post-auth update, or trigger reads state. |
| Realtime subscriptions for all entities | Multiple subscription channels. Must handle cleanup, reconnection, and cache invalidation. |
| UTC storage with local display | Touch multiple components. Need consistent conversion utilities. Migration if existing data is local time. |
| Connection recovery | Track subscription status. Refetch on reconnect. Handle mobile network changes. |

### Complex (High Complexity)

| Feature | Reasoning | Mitigation |
|---------|-----------|------------|
| Daily task rollover logic | Determining "missed" status requires knowing user's midnight in UTC. Different users have different midnights. Race conditions if checking at boundary. | Option A: Client recalculates status on load (easiest). Option B: DB function called on demand. Avoid real-time rollover - just calculate when displaying. |
| DST-safe scheduling | Daylight saving transitions create edge cases. Task at "2 AM" during "spring forward" doesn't exist. | Use IANA timezone names. Let `date-fns-tz` handle. Test DST transitions specifically. |
| Presence indicators | Requires Presence channel management, heartbeats, offline detection, UI for presence state. | Defer to future milestone unless explicitly requested. |

---

## Feature Dependencies Graph

```
Landing Page (Role Selection)
    |
    v
Google OAuth Flow
    |
    v
DB Trigger (handle_new_user) <-- Role from localStorage/state
    |
    v
Profile Created (atomic)
    |
    +---> Role-Based Routing --> Coach Dashboard OR Student App
    |
    v
Realtime Subscriptions (task_instances, assignments)
    |
    v
React Query Invalidation
    |
    v
Calendar/Task Views (with timezone conversion)
    |
    v
Daily Rollover (calculated on display)
```

---

## MVP Feature Set

For v3.0 MVP, prioritize:

1. **Landing page role selection** - Table stakes, low complexity
2. **Google OAuth only** - Table stakes, low complexity (deletion)
3. **DB trigger for atomic profile creation** - Table stakes, medium complexity
4. **Realtime for task completions** - Table stakes, medium complexity (already started)
5. **UTC storage, local display** - Table stakes, medium complexity
6. **Client-side rollover calculation** - Table stakes, high complexity (but avoids cron)

Defer to post-v3.0:
- Presence indicators (high complexity, no clear use case yet)
- Multi-timezone classroom support (high complexity, niche use case)
- Server-side rollover job (if client-side proves insufficient)

---

## Sources

### HIGH Confidence (Official Documentation)

- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data) - Trigger patterns, metadata handling
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) - Realtime subscription patterns, RLS limitations, scaling considerations
- [Supabase Auth Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) - OAuth flow, no metadata support confirmed
- [Supabase signInWithOAuth API](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) - Available options

### MEDIUM Confidence (Verified Community Patterns)

- [date-fns-tz NPM](https://www.npmjs.com/package/date-fns-tz) - Timezone handling utilities
- [date-fns v4 Timezone Support](https://blog.date-fns.org/v40-with-time-zone-support/) - First-class TZ support in date-fns v4
- [GitHub Discussion: signInWithOAuth Metadata](https://github.com/orgs/supabase/discussions/29075) - Confirms no native metadata support in OAuth flow
- [React Query with Supabase](https://makerkit.dev/blog/saas/supabase-react-query) - Integration patterns

### LOW Confidence (WebSearch Only)

- Education app realtime notification patterns - General patterns, not Supabase-specific
- Daily task rollover logic - Patterns from Todoist, Microsoft To Do, Notion - product-specific, not universal

---

*Features research completed: 2026-01-28*
