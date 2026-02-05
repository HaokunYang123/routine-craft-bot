# TeachCoachConnect Development Log

## Completed

### Manual Template Builder Redesign + Radix Sentinel Fix (2026-02-05)
- Manual Template Builder fix: replaced empty-string Select.Item values with sentinel strings to fix Radix crash, also fixed same pattern in RecurringSchedules.tsx. Redesigned task entry UI to card/blob layout with Add Task button. Removed due_time_offset_minutes from form. Priority stored in UI only (DB migration TODO).

### Coach Calendar Group Filter + Date Panel Fix (2026-02-05)
- Coach Calendar fix: added task_instances fetch filtered by selected group's members via group_members table, green dot indicators on dates with tasks, right panel groups tasks by name with student list underneath, removed redundant date-click modal on desktop (kept for mobile responsive view)

### Coach Calendar Task Date Rendering Fix (2026-02-05)
- Fixed coach calendar task loading bug where tasks were filtered out as orphaned due to stale `groupMap` state timing
- Replaced async `groupMap` state/effect with memoized derived map from `groups`
- Stabilized `fetchTasks` with `useCallback` and updated effect dependencies so calendar refetches with the correct group context

### Mobile Sidebar Auto-Close (2026-02-05)
- Fixed mobile sidebar: now closes automatically when a nav item is tapped

### Overview Roster Actions Restored (2026-02-05)
- Re-added "Remove Student" action to Overview tab student roster via row-level dropdown menu

### Documentation: Tasks Nav/Route Removal (2026-02-05)
- App.tsx: removed Tasks import and /dashboard/tasks route
- AppSidebar/CoachSidebar: removed Tasks nav items

### Student Dashboard Fixes (2026-02-05)
- Fixed overdue task card styling on student dashboard (improved contrast and readability)
- Fixed "New" badge on coach notes to disappear after student views the note

### Codex Context Handover Saved (2026-02-05)
- Added docs/codex-context.md with latest handover content
- Updated AGENTS.md required reads list

### Tasks Page Disconnected (2026-02-05)
- Removed Tasks nav item from CoachSidebar
- Removed /dashboard/tasks route from App.tsx
- Tasks.tsx file retained but disconnected

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
