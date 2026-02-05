# TeachCoachConnect Development Log

## Completed

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

## Planned
- Tasks tab build (assign modal integration, task list display)
- Notes tab build (compose + history)
- Recurring schedules (Daily/Weekly/Monthly/Custom)
- Template creation flow (AI builder + manual)
- Task edit/revoke functionality
- Minor cleanup (aria-describedby warning, PWA icon, remaining drift user)
