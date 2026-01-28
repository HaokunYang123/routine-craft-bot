---
phase: 15-authentication-rebuild
plan: 02
subsystem: auth
tags: [oauth, supabase, react-router, callback, role-routing]

# Dependency graph
requires:
  - phase: 15-01
    provides: Database trigger that creates profiles with role=null on auth.users insert
provides:
  - OAuth callback handler at /auth/callback
  - Role setting from URL (once-only on null profiles)
  - Role-based routing to /dashboard or /app
affects: [15-03, 15-04, 15-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role immutability via .is('role', null) filter on update"
    - "Profile retry logic for trigger timing edge case"

key-files:
  created:
    - src/pages/AuthCallback.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Role update uses .is('role', null) to ensure AUTH-10 immutability - role can be SET once but never CHANGED"
  - "500ms retry on profile fetch handles trigger timing edge case"
  - "AuthCallback handles its own errors (no RouteErrorBoundary wrapper)"

patterns-established:
  - "Role routing from database: profile.role === 'coach' -> /dashboard, else -> /app"
  - "OAuth callback URL format: /auth/callback?role=coach|student"

# Metrics
duration: 1min
completed: 2026-01-28
---

# Phase 15 Plan 02: OAuth Callback Summary

**OAuth callback page that sets role once from URL parameter and routes to correct dashboard based on database profile role**

## Performance

- **Duration:** 1 min 18 sec
- **Started:** 2026-01-28T11:49:20Z
- **Completed:** 2026-01-28T11:50:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created AuthCallback component handling OAuth redirect flow
- Implemented once-only role setting (supports AUTH-10 immutability)
- Role-based routing to /dashboard (coach) or /app (student)
- Added /auth/callback route to App.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AuthCallback page component** - `3eedc52` (feat)
2. **Task 2: Add /auth/callback route to App.tsx** - `c219830` (feat)

## Files Created/Modified
- `src/pages/AuthCallback.tsx` - OAuth callback handler (103 lines)
- `src/App.tsx` - Added import and route for AuthCallback

## Decisions Made
- Role update uses `.is('role', null)` filter to support AUTH-10 immutability (role can be SET once from null, but never CHANGED once set)
- 500ms retry on profile fetch handles potential trigger timing edge case
- AuthCallback handles its own errors with fallback UI (no RouteErrorBoundary needed)
- Route placed after login routes, before dashboard routes for logical ordering

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- OAuth callback ready for integration with landing page (15-03)
- Expects Google OAuth to redirect to /auth/callback?role=coach|student
- Works with 15-01's trigger which creates profiles with role=null

---
*Phase: 15-authentication-rebuild*
*Completed: 2026-01-28*
