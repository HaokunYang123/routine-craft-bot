---
phase: 21-task-assignment-cleanup
plan: 01
subsystem: ui
tags: [react, forms, collapsible, radix, task-assignment]

# Dependency graph
requires:
  - phase: 20-task-rollover
    provides: Task instance management foundation
provides:
  - Single Due Date field replacing duplicate Start/End Date fields
  - Expandable multi-day task section via Collapsible
  - Schedule type selector (once, daily, weekly, custom)
  - Day-of-week picker for custom schedules
affects: [recurring-tasks, task-creation, coach-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Collapsible for progressive disclosure of advanced form options
    - Schedule type state with conditional UI rendering
    - Form state reset helper pattern

key-files:
  created: []
  modified:
    - src/pages/AssignerDashboard.tsx

key-decisions:
  - "Single Due Date maps to startDate in hook call"
  - "Multi-day section only available for one-time tasks"
  - "Schedule type buttons store state locally (backend recurring not yet wired)"

patterns-established:
  - "Collapsible for optional form sections: use ghost button trigger with rotate animation"
  - "Form state reset via extracted helper function"

# Metrics
duration: 2min
completed: 2026-01-31
---

# Phase 21 Plan 01: Task Assignment Cleanup Summary

**Simplified task assignment form with single Due Date, collapsible multi-day section, and recurring schedule type buttons**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-31T21:57:11Z
- **Completed:** 2026-01-31T21:59:29Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Replaced duplicate Start/End Date grid with single "Due Date" field
- Added schedule type selector with one-time, daily, weekly, and custom options
- Created collapsible multi-day task section for one-time tasks with End Date
- Added day-of-week picker buttons for custom schedule selection
- Wired form submission to map dueDate to startDate for hook compatibility
- Added validation requiring at least one day for custom schedules

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor form state and UI structure** - `77c8320` (feat)
2. **Task 2: Wire up submission logic and state resets** - `6b91970` (feat)

## Files Created/Modified
- `src/pages/AssignerDashboard.tsx` - Simplified task assignment form with new date/schedule UI

## Decisions Made
- Used Collapsible from Radix UI (via shadcn) for progressive disclosure of multi-day options
- Schedule type stored in local state only - backend recurring task integration is future work per CONTEXT.md
- dueDate maps to startDate when calling assignGroupTask hook (hook contract unchanged)
- Custom schedule requires at least one day selected - validated both in button disabled state and toast on submit

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed plan specifications.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Form UI cleanup complete, ready for Phase 22 (Security Section Removal)
- Recurring schedule backend integration can be wired in future when backend support is added
- ASSIGN-01 and ASSIGN-02 requirements satisfied

---
*Phase: 21-task-assignment-cleanup*
*Completed: 2026-01-31*
