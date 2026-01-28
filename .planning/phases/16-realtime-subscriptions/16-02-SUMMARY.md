---
phase: 16-realtime-subscriptions
plan: 02
subsystem: ui
tags: [realtime, supabase, react-query, hooks]

# Dependency graph
requires:
  - phase: 16-01
    provides: useRealtimeSubscription hook, useVisibilityRefetch hook, REALTIME_CHANNELS constants, queryKeys factory
provides:
  - Realtime-enabled CoachDashboard with task completion updates
  - Realtime-enabled CoachCalendar with task completion updates
  - Consistent channel naming via REALTIME_CHANNELS.COACH_TASK_UPDATES
  - Cache invalidation through queryKeys.assignments.all
affects: [16-03, 16-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useRealtimeSubscription hook integration in page components
    - useVisibilityRefetch for tab visibility handling
    - Channel name reuse for subscription deduplication

key-files:
  created: []
  modified:
    - src/pages/CoachDashboard.tsx
    - src/pages/CoachCalendar.tsx

key-decisions:
  - "Use same channel name (COACH_TASK_UPDATES) in both components for Supabase deduplication"
  - "Invalidate queryKeys.assignments.all (covers all assignment queries including progress)"
  - "enabled condition uses !!user && groups.length > 0 for Dashboard, !!user for Calendar"

patterns-established:
  - "Coach views use REALTIME_CHANNELS.COACH_TASK_UPDATES(userId) for task updates"
  - "assignmentQueryKeys array shared between useRealtimeSubscription and useVisibilityRefetch"

# Metrics
duration: 8min
completed: 2026-01-28
---

# Phase 16 Plan 02: Coach Dashboard Realtime Summary

**Coach dashboard and calendar now receive instant task completion updates via useRealtimeSubscription hook with React Query cache invalidation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-28T21:00:00Z
- **Completed:** 2026-01-28T21:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- CoachDashboard refactored from manual supabase.channel() to useRealtimeSubscription hook
- CoachCalendar added realtime subscription for task completion updates
- Both components use consistent channel naming and cache invalidation
- Old manual 'coach-dashboard-updates' subscription removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor CoachDashboard to use useRealtimeSubscription** - `11c20db` (feat)
2. **Task 2: Add realtime subscription to CoachCalendar** - `70dd837` (feat)

## Files Created/Modified
- `src/pages/CoachDashboard.tsx` - Replaced manual subscription with useRealtimeSubscription hook
- `src/pages/CoachCalendar.tsx` - Added realtime subscription for task updates

## Decisions Made
- Used same channel name (COACH_TASK_UPDATES) in both components - Supabase deduplicates channels with same name, so both share one subscription when mounted together
- Invalidate queryKeys.assignments.all - covers all assignment-related queries (lists, progress, instances)
- CoachDashboard enabled condition: !!user && groups.length > 0 (consistent with original logic)
- CoachCalendar enabled condition: !!user (simpler, always subscribe when authenticated)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both components integrated cleanly with the new realtime hooks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Coach views now have realtime updates (REAL-01 requirement satisfied)
- Ready for Phase 16-03: Student app realtime integration
- Pre-existing test failure in useProfile.test.tsx (role assertion) remains - does not block Phase 16

---
*Phase: 16-realtime-subscriptions*
*Completed: 2026-01-28*
