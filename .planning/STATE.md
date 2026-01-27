# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Users can reliably complete their daily workflows without encountering errors, crashes, or unexpected behavior.
**Current focus:** Phase 13 - Pagination

## Current Position

Phase: 13 of 14 (Pagination)
Plan: 02 of 03
Status: In progress
Last activity: 2026-01-27 - Completed 13-02-PLAN.md

Progress: [=============-------] 86% (12/14 phases complete)

## Milestone History

| Version | Name | Phases | Shipped |
|---------|------|--------|---------|
| v1 | Reliability Hardening | 1-8 (23 plans) | 2026-01-25 |
| v2.0 | Performance | 9-14 (TBD plans) | In progress |

See: .planning/ROADMAP.md for full details

## Performance Summary (v1)

**Velocity:**
- Total plans completed: 23
- Average duration: 2.8 min/plan
- Total execution time: ~1.1 hours

**Key Metrics:**
- Tests: 103 passing
- Type safety: 0 `as any` casts
- Error handling: 53 handleError call sites
- Memory leaks fixed: 4 components

## v2.0 Progress

**Phase 9 Complete:**
- Query key factory: `src/lib/queries/keys.ts`
- QueryClient production config: staleTime, gcTime, retry, global error handling

**Phase 10 Complete:**
- useProfile migrated to React Query (14 tests)
- useGroups migrated to React Query (25 tests, 5 mutations)
- useTemplates migrated to React Query (17 tests, 3 mutations)

**Phase 11 Complete:**
- useAssignments migrated (utility pattern with fetchQuery, 25 tests)
- useRecurringSchedules migrated (useQuery + Promise.all enrichment, 28 tests)
- useStickers migrated (useQueries + combine, 30 tests)
- All 209 tests passing

**Phase 12 Complete:**
- 12-01: useGroups useMutation migration (complete)
- 12-02: useTemplates + useProfile useMutation migration (complete)
- 12-03: useAssignments useMutation with optimistic updates (complete)
- 12-04: Student components integration (complete)
- All 228 tests passing

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full list with outcomes.

Recent key decisions:
- Use Vitest over Jest (Vite-native, faster ESM support) - Done
- Two-level error boundaries (root + route) - Done
- React Query migration deferred to v2 - Done (Phase 9-11)
- QueryClientProvider already configured in App.tsx - Enhanced in 09-01
- 5-minute staleTime for data freshness (D-0901-01)
- Skip retry for 401/403 auth errors (D-0901-02)
- Global queryCache.onError with handleError (D-0901-03)
- Backward-compatible hook interface during migration (D-1001-01)
- Use invalidateQueries for cache sync after mutations (D-1001-02)
- Handle Supabase errors as objects with message property (D-1002-01)
- Handle PGRST205 gracefully by returning empty array (D-1003-01)
- Use fetchQuery for utility hooks that don't auto-fetch (D-1101-01)
- 30s staleTime for task instances, 60s for group progress (D-1101-02)
- Filter params in queryKeys.assignments.instances for cache granularity (D-1101-03)
- Use Promise.all for parallel enrichment queries (D-1102-01)
- Export calculateStreak as pure function for testability (D-1103-01)
- Use useQueries combine for parallel fetching with derived state (D-1103-02)
- useMutation hooks defined inside parent hook for user context access (D-1201-01)
- useMutation hooks defined inside useTemplates/useProfile for access to user context (D-1202-01)
- Wrapper functions catch errors and return null/false for backward compatibility (D-1202-02)
- No toast on successful task completion - reduces noise for frequent action (D-1203-01)
- Optimistic update pattern: onMutate snapshots/updates cache, onError rolls back (D-1203-02)
- User-friendly error messages for mutations: "Couldn't save changes. Please try again." (D-1203-03)
- StudentTasks uses legacy 'tasks' table, keep direct Supabase pattern with optimistic update (D-1204-01)
- Dual optimistic update (local state + cache) for instant feedback in components with local state (D-1204-02)
- 100px rootMargin for preloading before user reaches bottom (D-1302-01)
- 1px sentinel height for invisibility while maintaining observability (D-1302-02)

### Pending Todos

None.

### Blockers/Concerns

None - Phase 13 in progress.

**Research completed for v2.0:**
- React Query architecture patterns documented
- 6 hooks migrated (useProfile, useGroups, useTemplates, useAssignments, useRecurringSchedules, useStickers)
- 4 hooks NOT to migrate (useAuth, useAIAssistant, use-toast, use-mobile)

**Migration patterns established:**
- Simple hooks (10-01, 10-02, 10-03): Extract queryFn, replace useState/useEffect with useQuery
- Utility hooks (11-01): fetchQuery for on-demand caching, not useQuery
- Complex hooks with parallel fetching (11-03): useQueries with combine for multiple data sources and derived state
- Complex hooks with nested enrichment (11-02): Promise.all for parallel enrichment queries
- useMutation pattern (12-01, 12-02, 12-03): onSuccess for toast + invalidation, onError for handleError, wrapper for backward compat
- Optimistic mutation pattern (12-03): onMutate snapshots cache and updates optimistically, onError rolls back
- Component integration (12-04): Local state + hook mutation for instant UI, revert on failure
- Keep return interface for backward compatibility
- Add new properties (isFetching, isError, error, isPending) for enhanced UI
- Handle Supabase errors: check `error && typeof error === 'object' && 'message' in error`
- Handle PGRST205 (table not found): return empty array, not error

**Phase 13 Progress:**
- 13-02: Pagination UI components (complete)

**Pagination patterns established:**
- Infinite scroll: InfiniteScrollSentinel + useIntersectionObserver + ListStatus
- Page size options: 10/25/50 with "Showing X of Y" counter

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 13-02-PLAN.md
Resume file: None

---
*State initialized: 2026-01-24*
*Last updated: 2026-01-27 - Completed 13-02*
