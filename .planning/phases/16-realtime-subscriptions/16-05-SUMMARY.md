---
phase: 16-realtime-subscriptions
plan: 05
subsystem: database, realtime
tags: [supabase, realtime, postgres, rls, triggers]

# Dependency graph
requires:
  - phase: 16-01 through 16-04
    provides: Realtime infrastructure hooks and subscription setup
provides:
  - Denormalized coach_id column on task_instances for efficient filtering
  - Coach subscriptions with proper filter parameters
  - Enhanced debug logging for realtime verification
affects: [coach-dashboard, coach-calendar, realtime-debugging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Denormalized columns for realtime filter efficiency
    - Trigger-based auto-population of denormalized fields
    - Direct column RLS policies (faster than subquery)

key-files:
  created:
    - supabase/migrations/20260128224200_add_coach_id_to_task_instances.sql
  modified:
    - src/pages/CoachDashboard.tsx
    - src/pages/CoachCalendar.tsx
    - src/hooks/useRealtimeSubscription.ts
    - supabase/migrations/20260113000001_add_stickers_and_wellness.sql (renamed)
    - supabase/migrations/20260113000002_class_sessions.sql (renamed)
    - supabase/migrations/20260113000003_instructor_students.sql (renamed)
    - supabase/migrations/20260119000001_template_preassignment.sql (renamed)

key-decisions:
  - "Denormalized coach_id for filter efficiency over normalized lookups"
  - "Auto-populate via trigger to ensure consistency"
  - "RLS policy uses direct column (coach_id = auth.uid()) instead of subquery"

patterns-established:
  - "Realtime subscriptions MUST have filter parameter for reliable delivery"
  - "Use denormalized columns when realtime filtering needed"

# Metrics
duration: 15min
completed: 2026-01-28
---

# Phase 16 Plan 05: Gap Closure - Realtime Event Delivery Summary

**Added denormalized coach_id column to task_instances and filter parameters to coach subscriptions for reliable realtime event delivery**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-28T22:27:18Z
- **Completed:** 2026-01-28T22:42:00Z
- **Tasks:** 3
- **Files modified:** 8 (1 created, 4 renamed, 3 modified)

## Accomplishments
- Created migration adding coach_id column with trigger, index, and RLS policy
- Added filter parameter to CoachDashboard.tsx and CoachCalendar.tsx subscriptions
- Enhanced debug logging in useRealtimeSubscription.ts for verification
- Fixed migration naming to proper timestamp format for Supabase CLI compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add coach_id column to task_instances** - `573a321` (feat)
2. **Task 2: Update coach subscriptions with filter parameter** - `2a964d4` (feat)
3. **Task 3: Add debug logging and verify realtime delivery** - `a4cc122` (chore)

## Files Created/Modified
- `supabase/migrations/20260128224200_add_coach_id_to_task_instances.sql` - Migration with column, trigger, index, RLS
- `src/pages/CoachDashboard.tsx` - Added `filter: coach_id=eq.${user?.id}`
- `src/pages/CoachCalendar.tsx` - Added `filter: coach_id=eq.${user?.id}`
- `src/hooks/useRealtimeSubscription.ts` - Enhanced logging with filter info and payload.new

## Decisions Made
- **Denormalized coach_id**: Chose to add a denormalized column rather than rely on RLS subquery because Supabase realtime filter parameter requires direct column comparison, not subquery-based authorization.
- **Trigger for consistency**: Auto-populate coach_id on INSERT via trigger to ensure new task instances always have the correct coach_id without application code changes.
- **Migration file renames**: Renamed legacy migrations to proper `YYYYMMDDHHMMSS_name.sql` format to fix Supabase CLI tracking issues.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed migration file naming for Supabase CLI**
- **Found during:** Task 1 (migration push)
- **Issue:** Existing migrations used `20260113_name.sql` format without full timestamp, causing Supabase CLI to fail tracking
- **Fix:** Renamed to `20260113000001_name.sql` format with proper timestamps
- **Files modified:** 4 migration files renamed
- **Verification:** `supabase migration list` shows all migrations tracked
- **Committed in:** 573a321 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Migration naming fix was necessary to unblock database push. No scope creep.

## Issues Encountered
- Migration history was out of sync with remote database, required `supabase migration repair` to mark previously-applied migrations as applied before pushing new one.

## User Setup Required
None - migration was applied directly to remote Supabase database.

## Gap Closure Status

**GAP-01: Realtime events not received** - ADDRESSED
- Root cause: Coach subscriptions had no filter parameter, relying entirely on RLS subquery authorization
- Solution: Added denormalized coach_id column and filter parameter `coach_id=eq.${userId}`

**GAP-02: RLS policies blocking realtime broadcast** - ADDRESSED
- Root cause: Original RLS policy used subquery to assignments table
- Solution: New RLS policy uses direct column comparison `coach_id = auth.uid()`

## Next Phase Readiness
- Realtime infrastructure is now properly configured with filters
- Manual runtime verification recommended: Open coach dashboard and student app in separate browsers, have student complete task, verify coach dashboard updates without refresh
- Phase 17 (Timezone & Rollover) can proceed

---
*Phase: 16-realtime-subscriptions*
*Completed: 2026-01-28*
