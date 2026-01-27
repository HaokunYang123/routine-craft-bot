# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Users can reliably complete their daily workflows without encountering errors, crashes, or unexpected behavior.
**Current focus:** Phase 11 - Complex Hook Migration

## Current Position

Phase: 11 of 14 (Complex Hook Migration)
Plan: 01, 03 of 5 complete
Status: In progress
Last activity: 2026-01-27 - Completed 11-01-PLAN.md (useAssignments migration)

Progress: [===========---------] 71% (10/14 phases complete)

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
- All 141 tests passing

**Phase 11 In Progress:**
- Plan 01 complete: useAssignments migrated to React Query fetchQuery pattern (25 tests)
- Plan 03 complete: useStickers migrated to React Query useQueries with combine (30 tests)
- All 209 tests passing

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full list with outcomes.

Recent key decisions:
- Use Vitest over Jest (Vite-native, faster ESM support) - Done
- Two-level error boundaries (root + route) - Done
- React Query migration deferred to v2 - Done (Phase 9-10)
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
- Export calculateStreak as pure function for testability (D-1103-01)
- Use useQueries combine for parallel fetching with derived state (D-1103-02)

### Pending Todos

None.

### Blockers/Concerns

None - Phase 11 plans 01, 03 complete, ready for plan 02 (useRecurringSchedules) or plan 04.

**Research completed for v2.0:**
- React Query architecture patterns documented
- 6 hooks identified for migration (useGroups, useTemplates, useAssignments, useProfile, useStickers, useRecurringSchedules)
- 4 hooks NOT to migrate (useAuth, useAIAssistant, use-toast, use-mobile)
- Migration pitfalls documented (13 critical/moderate pitfalls)

**Migration patterns established:**
- Simple hooks (10-01, 10-02, 10-03): Extract queryFn, replace useState/useEffect with useQuery
- Utility hooks (11-01): fetchQuery for on-demand caching, not useQuery
- Complex hooks with parallel fetching (11-03): useQueries with combine for multiple data sources and derived state
- Keep return interface for backward compatibility
- Add new properties (isFetching, isError, error) for enhanced UI
- Handle Supabase errors: check `error && typeof error === 'object' && 'message' in error`
- Handle PGRST205 (table not found): return empty array, not error

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 11-01-PLAN.md (useAssignments migration)
Resume file: None

---
*State initialized: 2026-01-24*
*Last updated: 2026-01-27 - Completed 11-01 useAssignments migration*
