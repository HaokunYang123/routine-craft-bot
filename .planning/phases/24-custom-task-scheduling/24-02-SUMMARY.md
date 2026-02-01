---
phase: 24-custom-task-scheduling
plan: 02
subsystem: ui
tags: [react, date-fns, scheduling, form-state, assign-date, due-date, monthly]

# Dependency graph
requires:
  - phase: 24-custom-task-scheduling
    provides: DB schema with assign_date, start_time, end_time columns and assign_task_to_group RPC
provides:
  - Separate Assign Date and Due Date fields in AssignerDashboard
  - Monthly recurring schedule option with day picker (1-31 + Last day)
  - Auto-adjustment of due date when assign date changes
  - Updated useAssignments hook with assignDate/dueDate parameters
  - getScheduledDates helper supporting monthly recurrence
affects: [24-03 template scheduling, student-schedule-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Assign date = visibility, Due date = deadline"
    - "Monthly day picker uses -1 for 'Last day of month'"

key-files:
  created: []
  modified:
    - src/pages/AssignerDashboard.tsx
    - src/hooks/useAssignments.ts

key-decisions:
  - "Renamed startDate/endDate to assignDate/dueDate for semantic clarity"
  - "Auto-adjust due date when assign date is moved later"
  - "Monthly recurrence handles months with fewer days gracefully"

patterns-established:
  - "Form state uses assignDate (visibility) and dueDate (deadline) naming"
  - "getScheduledDates handles monthly with scheduleDays[0] as day of month"

# Metrics
duration: 8min
completed: 2026-02-01
---

# Phase 24 Plan 02: UI for Assign/Due Dates and Monthly Option Summary

**Updated AssignerDashboard with separate Assign Date/Due Date fields and Monthly recurring option with day-of-month picker**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-01T05:16:20Z
- **Completed:** 2026-02-01T05:24:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added separate Assign Date and Due Date fields with helper text explaining purpose
- Added Monthly option to schedule type buttons with day-of-month picker (1-31 + Last day)
- Updated useAssignments hook to accept assignDate/dueDate parameters and pass to RPC
- Extended getScheduledDates helper to calculate monthly recurring dates
- Due date auto-adjusts when assign date is set to a later date

## Task Commits

Each task was committed atomically:

1. **Task 1: Update AssignerDashboard with assign/due date separation and monthly option** - `a993324` (feat)
2. **Task 2: Update useAssignments hook with monthly support and new RPC parameters** - `b90d583` (feat)

## Files Created/Modified
- `src/pages/AssignerDashboard.tsx` - Added assignDate/dueDate states, monthlyDay state, two-column date grid, monthly day picker, updated form submission
- `src/hooks/useAssignments.ts` - Updated AssignGroupTaskInput interface, RPC parameter mapping, added monthly case to getScheduledDates

## Decisions Made
- **Parameter naming:** Renamed startDate/endDate to assignDate/dueDate in interface for semantic clarity (matches RPC naming from 24-01)
- **Auto-adjust due date:** When assign date moves later than current due date, automatically adjust due date to match. This prevents invalid state.
- **Monthly edge cases:** For months with fewer days (e.g., Feb 28), use the last available day rather than skipping the month

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation following the established patterns from 24-01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- UI integration complete for basic assign/due date separation
- Monthly scheduling ready for use
- Ready for Plan 24-03 (template scheduling enhancements)
- Note: The scheduleType and scheduleDays are passed to hook but not yet used by RPC - single task assignment still works, recurring via RPC is for future enhancement

---
*Phase: 24-custom-task-scheduling*
*Plan: 02*
*Completed: 2026-02-01*
