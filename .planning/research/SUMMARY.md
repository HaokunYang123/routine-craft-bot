# Project Research Summary

**Project:** Routine Craft Bot - v3.0 Auth & Realtime
**Domain:** Supabase Auth Triggers + Realtime Subscriptions + Timezone Handling
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

Version 3.0 modernizes authentication and introduces real-time collaboration for the Routine Craft Bot coach/student task management system. The research confirms that the existing stack (Supabase v2.90.1, React Query v5.83.0, date-fns v3.6.0) requires only one addition: `date-fns-tz` for timezone support. The architectural approach centers on three interconnected changes: database triggers for atomic profile creation, Supabase Realtime integrated with React Query cache invalidation, and UTC storage with local display for timezone handling.

The recommended implementation path addresses four critical pitfalls discovered during research. First, database triggers must be defensive with proper error handling and SECURITY DEFINER configuration to avoid blocking user signups. Second, Google OAuth cannot pass custom metadata during signup, requiring a workaround using query parameters in the redirect URL. Third, Realtime subscriptions must properly clean up to avoid memory leaks, especially with React StrictMode's double-mounting. Fourth, timezone conversions must happen exactly once (not double-convert) and respect user local midnight for daily task rollover.

The key architectural decision is hybrid cache management: use React Query invalidation for consistency but direct cache updates for instant UI feedback on inserts/deletes. This builds on the existing v2.0 React Query infrastructure without introducing additional complexity. Critical success factors include defensive trigger programming, proper cleanup patterns, and timezone-aware date utilities. With careful attention to the documented pitfalls, this milestone can be delivered incrementally across four phases with minimal risk to existing functionality.

## Key Findings

### Recommended Stack

The existing stack is production-ready for v3.0 with one strategic addition. Supabase JS client v2.90.1 already includes full support for database triggers, realtime subscriptions, and OAuth flows. React Query v5.83.0 provides the caching infrastructure needed for realtime integration. date-fns v3.6.0 handles date formatting but needs its companion library for timezone operations.

**Core technologies:**
- **Supabase JS v2.90.1**: Auth triggers, Realtime postgres_changes, Google OAuth - already installed, no upgrade needed
- **React Query v5.83.0**: Cache invalidation on realtime events, existing patterns extend cleanly - already migrated in v2.0
- **date-fns-tz v3.1.3**: Timezone conversion (toZonedTime/fromZonedTime) without bundling timezone data - only new dependency required
- **PostgreSQL triggers**: `handle_new_user` with SECURITY DEFINER for atomic profile creation - zero client-side dependencies

**Explicitly not adding:**
- `@supabase-cache-helpers/postgrest-react-query`: Adds complexity, conflicts with existing React Query patterns, manual invalidation is clearer
- `luxon` or `moment-timezone`: date-fns-tz is lighter (10KB vs 40KB+), integrates with existing date-fns usage
- Edge Functions for auth: Database triggers handle profile creation atomically without deployment complexity

### Expected Features

Research identified a clear separation between table stakes (must ship in v3.0) and differentiators (competitive advantages).

**Must have (table stakes):**
- Role selection before OAuth - Users self-identify as Coach/Student on landing page before authentication
- Atomic profile creation via trigger - Profile exists immediately when auth.users row created, no race conditions
- Google OAuth only - Remove email/password auth to simplify security and UX
- Role-based routing from database - Query profiles.role to route to /dashboard or /app, database is source of truth
- Task completion visible to coach instantly - Realtime postgres_changes on task_instances table
- Store UTC, display local - All timestamptz fields store UTC, convert to user timezone on display
- Daily rollover at user's local midnight - "Today's tasks" calculated in user's timezone, not UTC

**Should have (competitive):**
- Instant profile availability - Zero latency from OAuth completion to usable profile (via trigger)
- Role immutability - Once assigned, role cannot change (simplifies auth logic, prevents confusion)
- Optimistic UI with realtime confirmation - Existing optimistic updates confirmed by realtime events (belt and suspenders)
- Granular subscriptions - Filter subscriptions by user_id to reduce unnecessary traffic

**Defer (v2+):**
- Presence indicators - "User X is online" feature requires significant infrastructure, unclear value proposition
- Multi-timezone classroom support - Coach viewing student times in student's timezone (niche use case)
- Server-side rollover job - Client-side calculation on load is simpler, cron adds infrastructure complexity

### Architecture Approach

The architecture extends the existing React Query foundation with two new layers: a Realtime subscription layer that invalidates cache, and a timezone conversion layer that wraps all date displays. The key insight is that Supabase Realtime and React Query can coexist through cache invalidation rather than direct cache manipulation.

**Major components:**

1. **Database Trigger (handle_new_user)** - Runs after INSERT on auth.users, creates profile row atomically with COALESCE for missing metadata and EXCEPTION handler to prevent blocking signups

2. **Auth Flow Enhancement** - Landing page with role selection, role passed via query parameter through OAuth redirect (workaround for OAuth metadata limitation), AuthCallback component updates profile post-OAuth

3. **Realtime Subscription Hook (useRealtimeSubscription)** - Reusable hook wrapping Supabase channel creation with proper cleanup, invalidates React Query cache on postgres_changes events, ref-based channel management to handle StrictMode double-mounting

4. **Timezone Utilities (timezone.ts)** - Centralized conversion functions (toLocalTime, toUTCTime, formatInTimezone), user timezone detection from browser or profile, handles DATE fields separately from TIMESTAMPTZ to avoid double conversion

5. **React Query Integration** - Hybrid approach: invalidate for consistency (UPDATE/DELETE from others), direct cache update for instant feedback (INSERT/DELETE own), onSettled reconciliation prevents conflicts with optimistic updates

**Key patterns:**
- Triggers use SECURITY DEFINER with SET search_path = '' for security
- Realtime cleanup via useRef to handle React StrictMode
- Query key factory ensures invalidation matches query structure
- Always store UTC, convert once at display layer

### Critical Pitfalls

Research identified 13 critical pitfalls (would cause rewrites or data corruption) and 15 moderate pitfalls (would cause delays or UX issues).

1. **Trigger Failure Blocks Signup (A1)** - If handle_new_user trigger fails, entire signup transaction fails. Prevent with COALESCE for all nullable fields, EXCEPTION handler that logs but returns NEW, test with minimal Google profiles.

2. **SECURITY DEFINER Without search_path (A2)** - Functions with SECURITY DEFINER are vulnerable to schema injection attacks. Always set search_path = '' and use fully qualified table names (public.profiles, not profiles).

3. **Memory Leak from Missing Unsubscribe (C1)** - Realtime subscriptions without cleanup cause WebSocket leaks. Always return cleanup function from useEffect that calls supabase.removeChannel(channel).

4. **React StrictMode Double Subscription (C2)** - StrictMode mounts twice in dev, creating duplicate subscriptions if channel name is dynamic. Use useRef to track channel and remove existing before creating new, or use stable channel names.

5. **Double Timezone Conversion (D1)** - Converting UTC to local twice results in times offset by timezone amount. PostgreSQL timestamptz is already UTC, convert only once at display with formatInTimeZone, never convert DATE fields.

6. **Daily Rollover at Wrong Time (D2)** - Comparing dates without timezone causes tasks to roll over at UTC midnight instead of user's local midnight. Store user timezone in profile, use isSameDay with utcToZonedTime for both dates.

7. **Google OAuth Metadata Missing (B1)** - Some Google accounts don't provide full_name or avatar_url. Always use nested COALESCE with fallbacks (full_name > name > email prefix > 'User').

8. **Realtime Bypasses React Query Cache (E1)** - Realtime events that update local state directly bypass React Query cache. Always invalidate cache (queryClient.invalidateQueries) or directly update cache (queryClient.setQueryData), never setState directly.

## Implications for Roadmap

Based on dependency analysis and risk assessment, v3.0 should be delivered in four phases with clear boundaries and testability.

### Phase 1: Database Foundation & Auth
**Rationale:** Database schema and triggers must be correct before any user signups. Auth flow depends on trigger working correctly. This phase has the highest risk (can block all signups) so must be tested thoroughly before proceeding.

**Delivers:**
- Profiles table schema with timezone column (TEXT, IANA format)
- Enhanced handle_new_user trigger with defensive programming (COALESCE, EXCEPTION handling, SECURITY DEFINER)
- AuthCallback component to handle OAuth redirect and role assignment
- Updated CoachAuth/StudentAuth to pass role via query parameter

**Addresses (from FEATURES.md):**
- Role selection before auth (table stakes)
- Atomic profile creation via trigger (table stakes)
- Google OAuth only (table stakes)

**Avoids (from PITFALLS.md):**
- A1: Trigger failure blocks signup - defensive trigger programming
- A2: SECURITY DEFINER vulnerability - explicit search_path
- B1: Missing Google metadata - COALESCE with fallbacks
- B2: user_metadata for RBAC - store role in profiles table

**Critical success criteria:** Test signup with minimal Google profile, verify trigger creates profile even with null fields, confirm onAuthStateChange cleanup prevents memory leaks.

### Phase 2: Realtime Foundation
**Rationale:** Realtime subscriptions depend on existing React Query infrastructure (v2.0) and database schema (Phase 1). Must establish patterns before adding timezone complexity. This phase introduces new WebSocket connections that can leak memory if not cleaned up properly.

**Delivers:**
- useRealtimeSubscription hook with proper cleanup and StrictMode handling
- Task instances subscription for student views
- Assignment/progress subscription for coach dashboard
- React Query cache invalidation on realtime events

**Addresses (from FEATURES.md):**
- Task completion visible to coach instantly (table stakes)
- Assignment creation visible to students (table stakes)
- Optimistic UI with realtime confirmation (differentiator)

**Uses (from STACK.md):**
- Supabase Realtime postgres_changes API
- React Query cache invalidation (queryClient.invalidateQueries)

**Implements (from ARCHITECTURE.md):**
- Hybrid cache strategy: invalidate for consistency, direct update for instant feedback
- Query key factory for consistent invalidation
- Ref-based channel management for StrictMode compatibility

**Avoids (from PITFALLS.md):**
- C1: Memory leak from missing unsubscribe - cleanup function in useEffect
- C2: StrictMode double subscription - useRef to track channel
- C4: Channel already subscribed error - check existing channels before creating
- E1: Realtime bypasses cache - invalidate React Query cache

**Critical success criteria:** Browser memory stable after 10 page navigations, no duplicate events in dev (StrictMode), realtime updates visible in React Query DevTools.

### Phase 3: Timezone Implementation
**Rationale:** Timezone handling touches many components and requires the date utilities to be correct before migrating existing date displays. Depends on profile schema (Phase 1) for storing user timezone. Can be implemented in parallel with Phase 2 if resources allow, but must be complete before Phase 4 daily rollover logic.

**Delivers:**
- date-fns-tz integration (npm install, utility functions)
- Timezone conversion utilities (toLocalTime, toUTCTime, formatInTimezone)
- Timezone selector in coach/student settings
- Updated task display components to show times in user timezone
- Timezone auto-detection from browser

**Addresses (from FEATURES.md):**
- Store UTC, display local (table stakes)
- User timezone detection (table stakes)
- DST-safe scheduling (differentiator)

**Uses (from STACK.md):**
- date-fns-tz v3.1.3 for timezone conversion
- Browser Intl API for timezone detection
- PostgreSQL timestamptz for UTC storage

**Avoids (from PITFALLS.md):**
- D1: Double timezone conversion - convert once at display layer
- D3: DST transition bugs - use IANA timezone names, let date-fns-tz handle transitions
- D4: Storing local time - always store UTC in timestamptz fields
- D5: JavaScript Date inconsistency - use date-fns-tz with IANA database

**Critical success criteria:** User in different timezone sees correct "today", task times correct after DST transition, historical tasks show correct time.

### Phase 4: Daily Rollover & Polish
**Rationale:** Daily rollover logic depends on timezone utilities (Phase 3) to correctly determine user's local midnight. This phase ties together auth, realtime, and timezone into the complete user experience. Lowest risk phase as it's primarily display logic.

**Delivers:**
- Client-side daily rollover calculation (isToday, isMissed logic)
- Recurring task generation respecting user timezone
- "Today" boundary calculated in user's local timezone
- Connection recovery for realtime subscriptions

**Addresses (from FEATURES.md):**
- Daily rollover at user's local midnight (table stakes)
- Correct "today" boundary (table stakes)
- Connection recovery (table stakes)

**Avoids (from PITFALLS.md):**
- D2: Daily rollover at wrong time - calculate in user's timezone
- C5: Connection recovery - monitor subscription status, refetch on reconnect

**Critical success criteria:** Tasks roll over at user's local midnight, "today's tasks" correct across timezones, realtime recovers from network interruption.

### Phase Ordering Rationale

- **Phase 1 before all others:** Database triggers must work before any users sign up. Auth flow changes are foundational and cannot be added incrementally.
- **Phase 2 and 3 parallel-safe:** Realtime and timezone are independent concerns that can be developed concurrently if resources allow. However, Phase 4 requires both complete.
- **Phase 4 last:** Daily rollover logic is the integration point that uses timezone utilities and benefits from realtime updates. Deferring to last reduces complexity of earlier phases.
- **Incremental testing:** Each phase delivers user-visible functionality and can be deployed independently (with feature flags if needed). This allows validation before proceeding.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1 (Auth):** Minimal - auth triggers are well-documented in Supabase docs, OAuth flow is standard
- **Phase 2 (Realtime):** Minimal - postgres_changes API is stable, React Query patterns are established
- **Phase 3 (Timezone):** Minimal - date-fns-tz documentation is comprehensive, IANA timezones are standard
- **Phase 4 (Rollover):** Low - edge cases around DST transitions may need validation testing

**Phases with standard patterns (can skip deep research):**
- **All phases:** Research has already identified standard patterns and critical pitfalls. Implementation should follow documented patterns without additional research phase.

**Recommendation:** Skip `/gsd:research-phase` for v3.0. Research is comprehensive and all patterns are documented. Focus on careful implementation following the pitfall prevention strategies.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Supabase docs verified, versions confirmed in package.json, date-fns-tz is official companion to date-fns |
| Features | HIGH | Feature research based on Supabase official docs and community patterns, table stakes vs differentiators clearly identified |
| Architecture | HIGH | Architecture patterns verified against existing codebase (v2.0 React Query migration), integration points documented |
| Pitfalls | HIGH | Critical pitfalls verified through GitHub discussions, official docs, and community issue tracking, prevention strategies tested |

**Overall confidence:** HIGH

The research is comprehensive across all four dimensions. Stack recommendations are conservative (only one new dependency) and build on existing infrastructure. Feature categorization is based on official Supabase capabilities and community consensus. Architecture patterns extend proven v2.0 React Query foundation. Pitfalls are documented from real production issues in Supabase community with verified prevention strategies.

### Gaps to Address

While overall confidence is high, three areas need attention during implementation:

- **Google OAuth metadata variability:** Not all Google accounts provide the same metadata fields. Trigger testing must include organizational Google accounts and accounts with restricted privacy settings to verify COALESCE fallbacks work correctly. Recommend creating test accounts with various privacy configurations before Phase 1 deployment.

- **Realtime subscription limits:** Supabase plans have different Realtime connection limits. Current research doesn't verify exact limits for the project's Supabase plan. Verify connection limits during Phase 2 planning to ensure design scales within plan limits. May need to reduce subscription granularity if approaching limits.

- **DST transition edge cases:** While date-fns-tz handles DST correctly in general, specific edge cases around recurring tasks scheduled for non-existent times (2:30 AM on spring forward) need validation testing. Recommend creating test suite with DST transition dates before Phase 4 deployment.

## Sources

### Primary (HIGH confidence)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth) - Database triggers, OAuth flows, user management patterns
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime) - postgres_changes API, subscription patterns, connection management
- [TanStack Query v5 Documentation](https://tanstack.com/query/latest) - Cache invalidation, optimistic updates, integration patterns
- [date-fns-tz GitHub](https://github.com/marnusw/date-fns-tz) - API reference, timezone conversion patterns, DST handling

### Secondary (MEDIUM confidence)
- [Supabase GitHub Discussions](https://github.com/orgs/supabase/discussions) - #6518 (trigger failures), #4047 (OAuth metadata), #5282 (auth cleanup), #13091 (RBAC patterns)
- [MakerKit: Supabase React Query](https://makerkit.dev/blog/saas/supabase-react-query) - Integration patterns and cache management
- [TkDodo Blog: React Query Testing](https://tkdodo.eu/blog) - Optimistic updates, concurrent mutations, cache patterns
- [DrDroid: Supabase Diagnostics](https://drdroid.io/stack-diagnosis) - Memory leak patterns, subscription cleanup

### Tertiary (LOW confidence)
- Community blog posts on timezone handling - General patterns, not Supabase-specific, needs validation
- Task management app documentation (Todoist, Amazing Marvin) - Daily rollover patterns as reference, not prescriptive

### Codebase Analysis (HIGH confidence)
- Existing React Query migration (v2.0) - Query key patterns, cache management, optimistic updates
- Current auth implementation - useAuth hook, ProtectedRoute, profile management
- Supabase setup - Client configuration, existing RPC patterns
- Test infrastructure - 103 existing tests with vi.mock patterns, test-utils.tsx with QueryClient setup

---
*Research completed: 2026-01-28*
*Ready for roadmap: yes*
