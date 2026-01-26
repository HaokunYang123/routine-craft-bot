---
phase: 09-react-query-foundation
plan: 01
subsystem: data-layer
tags: [react-query, caching, error-handling, infrastructure]
dependency-graph:
  requires: [phase-02-error-completion]
  provides: [query-key-factory, queryClient-config, global-error-handling]
  affects: [phase-10-group-hooks, phase-11-template-hooks, phase-12-assignment-hooks]
tech-stack:
  added: []
  patterns: [query-key-factory, centralized-cache-error-handling]
key-files:
  created:
    - src/lib/queries/keys.ts
  modified:
    - src/App.tsx
decisions:
  - id: D-0901-01
    title: "5-minute staleTime for data freshness"
    choice: "staleTime: 5 * 60 * 1000"
    rationale: "Balance between reducing API calls and data freshness for routine app"
  - id: D-0901-02
    title: "Skip retry for auth errors"
    choice: "Custom retry function returns false for 401/403"
    rationale: "Auth errors won't be fixed by retrying - fail fast for better UX"
  - id: D-0901-03
    title: "Global queryCache.onError handler"
    choice: "Use handleError in QueryCache onError callback"
    rationale: "Prevents duplicate toasts when multiple components use same failing query (M2 pitfall)"
metrics:
  duration: 2 min
  completed: 2026-01-26
---

# Phase 9 Plan 01: React Query Foundation Summary

**One-liner:** Query key factory with hierarchical keys + production-ready QueryClient with 5-min staleTime, auth-aware retry, and global error handling.

## What Was Built

### Query Key Factory (`src/lib/queries/keys.ts`)
- Hierarchical query keys for all 6 entities identified for migration:
  - `groups` (all, lists, list, details, detail, members)
  - `templates` (all, lists, list, details, detail)
  - `assignments` (all, lists, list, instances, progress)
  - `profile` (all, current)
  - `stickers` (all, byUser)
  - `recurringSchedules` (all, lists, list)
- `as const` assertions preserve literal types for type safety
- Consistent pattern: `entity.all` -> `entity.lists()` -> `entity.list(id)`

### Enhanced QueryClient (`src/App.tsx`)
- **Caching (RQ-01):** `staleTime: 5 * 60 * 1000` (5 minutes)
- **Garbage collection:** `gcTime: 30 * 60 * 1000` (30 minutes)
- **Background refetch (RQ-04):** `refetchOnWindowFocus: true`, `refetchOnReconnect: true`
- **Auth-aware retry:** Custom function skips retry for 401/403 errors
- **Global error handling:** `queryCache.onError` calls `handleError` from error.ts

## Tasks Completed

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Create Query Key Factory | `cb06b97` | New `src/lib/queries/keys.ts` with hierarchical keys |
| 2 | Enhance QueryClient Configuration | `c458525` | Updated `src/App.tsx` with production defaults |
| 3 | Verify Existing Tests Pass | N/A | All 103 tests pass unchanged |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0901-01 | 5-minute staleTime | Balance between reducing API calls and data freshness |
| D-0901-02 | Skip retry for 401/403 | Auth errors won't fix on retry - fail fast |
| D-0901-03 | Global queryCache.onError | Prevents duplicate toasts (M2 pitfall mitigation) |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. **TypeScript compiles:** Yes (no errors)
2. **App builds:** Yes (production build succeeds)
3. **All tests pass:** Yes (103/103 tests)
4. **Query key factory exists:** Yes (`src/lib/queries/keys.ts`)
5. **QueryClient configured:** Yes (staleTime, gcTime, retry, queryCache.onError)

## Next Phase Readiness

**Ready for Phase 10 (Group Hooks Migration):**
- Query key factory provides `queryKeys.groups.*` for useGroups migration
- QueryClient defaults handle caching, refetch, and error handling
- No blockers identified

## Files Changed

```
src/lib/queries/keys.ts  (created)
src/App.tsx              (modified)
```

---
*Generated: 2026-01-26*
*Duration: 2 min*
*Tests: 103 passing (no regressions)*
