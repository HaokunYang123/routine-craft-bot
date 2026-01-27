---
phase: 10-simple-hook-migration
plan: 02
subsystem: hooks
tags: [react-query, useQuery, caching, groups, invalidation]

# Dependency graph
requires:
  - phase: 09-react-query-foundation
    provides: QueryClientProvider config, queryKeys factory
  - phase: 10-01
    provides: React Query migration pattern, useProfile example
provides:
  - useGroups hook migrated to React Query
  - Groups caching with queryKeys.groups.list
  - Backward-compatible interface (groups, loading, fetchGroups, mutations)
  - New properties (isFetching, isError, error)
  - All 5 mutations use invalidateQueries for cache sync
  - Comprehensive test suite (25 tests)
affects: [10-03, 10-04, groups-components, coach-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase error handling with object type check (not instanceof Error)"
    - "Multiple mutations with shared invalidateQueries pattern"
    - "Member count computation in queryFn"

key-files:
  created: []
  modified:
    - src/hooks/useGroups.ts
    - src/hooks/useGroups.test.tsx

key-decisions:
  - "Keep backward-compatible interface (groups, loading, fetchGroups) to minimize component changes"
  - "Expose new React Query properties (isFetching, isError, error) for enhanced UI states"
  - "Use invalidateQueries for all 5 mutations to ensure fresh data after changes"
  - "Handle Supabase errors as objects with message property, not Error instances"

patterns-established:
  - "Mutation error handling pattern: check for object with 'message' property, not instanceof Error"
  - "Multiple mutations hook pattern: shared queryClient, invalidateQueries after each success"

# Metrics
duration: 3min
completed: 2026-01-27
---

# Phase 10 Plan 02: useGroups Migration Summary

**useGroups hook migrated from useState/useEffect to React Query useQuery with 5 mutations using invalidateQueries and 25-test coverage**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-27T04:59:52Z
- **Completed:** 2026-01-27T05:03:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced useState/useEffect pattern with useQuery for automatic caching
- Maintained backward-compatible interface (groups, loading, fetchGroups exports)
- Added new React Query properties (isFetching, isError, error) for enhanced UI
- Updated all 5 mutation functions (createGroup, updateGroup, deleteGroup, addMember, removeMember) to use invalidateQueries
- Updated test suite with QueryClientProvider and new React Query behavior tests
- Test count increased from 117 to 124 (7 new tests including auth guard tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate useGroups to React Query** - `d271828` (feat)
2. **Bug fix: Supabase error handling** - `3c93615` (fix)
3. **Task 2: Update useGroups tests for React Query** - `092d918` (test)

## Files Created/Modified
- `src/hooks/useGroups.ts` - Migrated from useState/useEffect to useQuery with queryKeys.groups.list, all mutations use invalidateQueries
- `src/hooks/useGroups.test.tsx` - Updated with QueryClientProvider wrapper, new tests for isFetching/isError/invalidation

## Decisions Made
- **Backward compatibility maintained:** Kept `groups`, `loading`, `fetchGroups` return names to minimize component changes
- **New properties exposed:** Added `isFetching`, `isError`, `error` for components that want enhanced loading/error states
- **Cache sync via invalidation:** Used `invalidateQueries` in all 5 mutations instead of optimistic updates for simplicity
- **Supabase error handling:** Changed from `instanceof Error` to object type check since Supabase errors are plain objects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Supabase error handling in mutations**
- **Found during:** Task 2 (test execution)
- **Issue:** Error handling used `error instanceof Error` which returns false for Supabase error objects (plain objects with `message` property)
- **Fix:** Changed to `error && typeof error === 'object' && 'message' in error` for proper Supabase error extraction
- **Files modified:** src/hooks/useGroups.ts
- **Verification:** All 25 tests pass including error toast assertions
- **Committed in:** 3c93615 (separate fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Bug fix essential for correct error message display. No scope creep.

## Issues Encountered
None - standard migration following pattern established in 10-01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- useGroups migration complete, validates pattern with more complex hook (5 mutations)
- Ready for plan 03 (useTemplates migration) and plan 04 (useAssignments migration)
- Error handling pattern established for Supabase errors in hooks

---
*Phase: 10-simple-hook-migration*
*Completed: 2026-01-27*
