# TeachCoachConnect Development Log

## Completed

### Coach Dashboard Realtime Routing Fix (2026-02-05)
- Diagnosed route structure causing CoachDashboard to persist on /groups/:groupId
- Fixed routing so CoachDashboard unmounts on group detail navigation
- Added pathname guard to coach-tasks subscription enabled flag

### Realtime Hook Stabilization (2026-02-05)
- Fixed useRealtimeSubscription hook: stabilized queryKeysToInvalidate dependency to prevent subscription thrashing
- Documented all callers of useRealtimeSubscription (CoachDashboard, CoachCalendar)

### Group Detail Realtime Stability (2026-02-05)
- Fixed realtime subscription thrashing (separated subscription from data-fetch effect, used ref pattern for stable callback)

### Group Detail Realtime Stability (2026-02-05)
- Fixed realtime subscription thrashing in GroupDetail.tsx (stabilized useEffect dependencies with useCallback and serialized member IDs)

### Group Detail Crash Fix (2026-02-05)
- Fixed circular dependency crash in GroupDetail.tsx (ReferenceError: Cannot access before initialization)

### Auth Callback Hardening (2026-02-04)
- Full auth callback hardening shipped (see docs/auth-callback-hardening-summary.md)
- Metadata drift fixed for all users except one (self-heals on next login)

### Assign Task Modal Fix (2026-02-04)
- Fixed Radix Select crash: template dropdown used empty string value
- Changed to "none" sentinel value, clears template fields on selection

## In Progress

### Group Detail Restructure (2026-02-04)
- Tabs shell built with ?tab= routing (Overview | Tasks | Notes)
- Overview tab: student list, join code, delete group
- Tasks tab: placeholder
- Notes tab: migrated existing content
- Old group detail route removed (use /groups/${groupId})
- Fixed Dashboard and Tasks page navigation links to use /groups/${groupId}
- Tasks tab built: assign to group, assign to student, task instance list with status grouping
- Restructured GroupDetail: page-level assign button, gear menu for delete, Overview made read-only, actions consolidated to Tasks tab
- Tasks tab redesigned: grouped accordion view by task name, status filter, visual fixes for dark theme
- Fixed time validation in AssignTaskModal (comparison logic + re-validation on change)
- Added real-time subscription for task_instances on GroupDetail (coach sees student updates live)

## Planned
- Tasks tab build (assign modal integration, task list display)
- Notes tab build (compose + history)
- Recurring schedules (Daily/Weekly/Monthly/Custom)
- Template creation flow (AI builder + manual)
- Task edit/revoke functionality
- Minor cleanup (aria-describedby warning, PWA icon, remaining drift user)
