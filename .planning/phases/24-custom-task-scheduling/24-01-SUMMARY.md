---
phase: 24-custom-task-scheduling
plan: 01
subsystem: database
tags: [supabase, postgresql, rpc, migrations, scheduling]

# Dependency graph
requires:
  - phase: 21-task-assignment-cleanup
    provides: task_instances table structure with coach_id column
provides:
  - start_time TEXT column on task_instances for time block start
  - end_time TEXT column on task_instances for time block end
  - assign_date DATE column on task_instances for visibility date
  - assign_task_to_group RPC function with scheduling parameters
  - Index on assign_date for efficient filtering
affects: [24-02 UI integration, 24-03 monthly recurring, student-schedule-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate assign_date (visibility) from scheduled_date (due date)"
    - "RPC function for bulk task creation with SECURITY DEFINER"

key-files:
  created:
    - supabase/migrations/20260131000001_add_scheduling_columns.sql
  modified:
    - src/integrations/supabase/types.ts
    - src/hooks/useAssignments.ts

key-decisions:
  - "Added start_time column alongside scheduled_time for explicit time block start"
  - "Backfilled assign_date from scheduled_date for backward compatibility"
  - "RPC function uses p_assign_date/p_due_date naming for clarity"

patterns-established:
  - "Time blocks use start_time + end_time TEXT columns (format: '12:00 PM')"
  - "assign_date controls visibility, scheduled_date controls due date"

# Metrics
duration: 12min
completed: 2026-01-31
---

# Phase 24 Plan 01: Database Schema for Custom Scheduling Summary

**Added start_time, end_time, and assign_date columns to task_instances with assign_task_to_group RPC function for time blocks and separate visibility/due dates**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-31T21:10:00Z
- **Completed:** 2026-01-31T21:22:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added three new columns to task_instances: start_time, end_time, assign_date
- Created assign_task_to_group RPC function accepting all scheduling parameters
- Added index on assign_date for efficient "tasks visible today" queries
- Regenerated TypeScript types with new columns and RPC function
- Updated useAssignments hook to use correct parameter names

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database migration for scheduling columns** - `9e1cf56` (feat)
2. **Task 2: Push migration and regenerate types** - `ec8967e` (feat)

## Files Created/Modified
- `supabase/migrations/20260131000001_add_scheduling_columns.sql` - Migration adding columns and RPC function
- `src/integrations/supabase/types.ts` - Regenerated TypeScript types with new columns
- `src/hooks/useAssignments.ts` - Updated RPC parameter names (p_assign_date, p_due_date)

## Decisions Made
- **start_time vs scheduled_time:** Added new start_time column for explicit time block start, while keeping scheduled_time for backward compatibility. Both are set to the same value in RPC.
- **Parameter naming:** Used p_assign_date and p_due_date in RPC function for semantic clarity (assign = visibility, due = deadline).
- **Backfill strategy:** Existing records get assign_date = scheduled_date so they remain visible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated hook RPC parameter names**
- **Found during:** Task 2 (Type regeneration)
- **Issue:** useAssignments hook used p_start_date/p_end_date but RPC function uses p_assign_date/p_due_date
- **Fix:** Updated parameter names in assignGroupTaskMutation to match RPC signature
- **Files modified:** src/hooks/useAssignments.ts
- **Verification:** TypeScript compilation passes, parameters match types.ts
- **Committed in:** ec8967e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for hook-RPC compatibility. No scope creep.

## Issues Encountered
- **Migration history mismatch:** Remote database had 6 migrations from reverted Phase 24 implementation. Repaired with `supabase migration repair --status reverted`. No data loss.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Database schema ready for UI integration (Plan 02)
- RPC function ready to be called from AssignerDashboard
- Types available for form state management
- No blockers for next plan

---
*Phase: 24-custom-task-scheduling*
*Plan: 01*
*Completed: 2026-01-31*
