---
phase: 20-task-rollover-logic
plan: 04
subsystem: ui
tags: [react, badge, coach-dashboard, task-management]

# Dependency graph
requires:
  - phase: 20-02
    provides: Task categorization hooks with overdue detection
provides:
  - excuseTask mutation for coaches to excuse overdue tasks
  - Color-coded overdue badges (yellow/orange/red by count)
  - Excuse button in student detail sheet
affects: [student-notifications, coach-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Color escalation based on count thresholds (1-2 yellow, 3-5 orange, 6+ red)
    - Local state update on mutation success for responsive UI

key-files:
  created: []
  modified:
    - src/hooks/useAssignments.ts
    - src/components/groups/GroupReviewCard.tsx
    - src/components/dashboard/StudentDetailSheet.tsx

key-decisions:
  - "Use 'excused' status instead of deleting tasks to keep audit trail"
  - "Use className-based badge styling since Badge component lacks warning/orange variants"
  - "Update local task state immediately after excuse for responsive UI"

patterns-established:
  - "getOverdueBadgeClassName pattern for count-based color escalation"
  - "excuseTask mutation with updated_at/updated_by for audit trail"

# Metrics
duration: 12min
completed: 2026-01-31
---

# Phase 20 Plan 04: Coach Overdue Visibility Summary

**Coach can see color-coded overdue badges on students and excuse individual overdue tasks with single click**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-31T16:00:00Z
- **Completed:** 2026-01-31T16:12:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added excuseTask mutation to useAssignments hook for coaches to mark tasks as 'excused'
- Implemented color-coded overdue badges in GroupReviewCard (yellow 1-2, orange 3-5, red 6+)
- Added Excuse button to overdue tasks in StudentDetailSheet with loading state
- Excused tasks immediately removed from local state for responsive UX

## Task Commits

Each task was committed atomically:

1. **Task 1: Add excuseTask mutation to useAssignments** - `31d4939` (feat)
2. **Task 2: Add overdue badge with color escalation** - `d728188` (feat)
3. **Task 3: Add excuse task button in student detail view** - `f107e79` (feat)

## Files Created/Modified
- `src/hooks/useAssignments.ts` - Added ExcuseTaskInput interface, excuseTaskMutation, excuseTask wrapper, isExcusingTask flag
- `src/components/groups/GroupReviewCard.tsx` - Added overdueCount to GroupMember, getOverdueBadgeClassName helper, overdue badge display
- `src/components/dashboard/StudentDetailSheet.tsx` - Added useAssignments import, handleExcuseTask, isTaskOverdue helper, Excuse button in TaskCard

## Decisions Made
- Used 'excused' status instead of deleting task instances to maintain audit trail (per CONTEXT.md)
- Used className-based styling for badges since Badge component only has default/secondary/destructive/outline variants
- Update local state immediately after successful excuse for responsive UI (cache invalidation handles server sync)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Coach overdue visibility complete
- Excusing tasks works end-to-end
- Ready for Plan 20-05 (student notification for excused tasks if planned)

---
*Phase: 20-task-rollover-logic*
*Completed: 2026-01-31*
