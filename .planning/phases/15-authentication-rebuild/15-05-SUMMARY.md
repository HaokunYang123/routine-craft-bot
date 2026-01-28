---
phase: 15-authentication-rebuild
plan: 05
subsystem: auth
tags: [react-query, retry, oauth, profile]

# Dependency graph
requires:
  - phase: 15-03
    provides: Auth.tsx role selection with Google OAuth
provides:
  - useProfile hook with retry logic for trigger timing edge case
  - CoachAuth simplified to redirect-only
  - StudentAuth class-joining only (QR/code preserved, email auth removed)
  - Deprecated routes removed from App.tsx
affects: [15-06, profile-loading, auth-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [react-query retry with exponential backoff for PGRST116]

key-files:
  modified:
    - src/hooks/useProfile.ts
    - src/components/auth/CoachAuth.tsx
    - src/components/auth/StudentAuth.tsx
    - src/App.tsx

key-decisions:
  - "useProfile retries PGRST116 up to 3 times with exponential backoff (100ms, 200ms, 400ms)"
  - "Fallback profile creation uses role from userMetadata instead of hardcoded 'coach'"
  - "CoachAuth redirects to / instead of providing separate auth UI"
  - "StudentAuth renamed to 'Join a Class' - only QR/code, no email auth"

patterns-established:
  - "React Query retry with type-safe error handling: (failureCount, error: unknown) => { const pgError = error as { code?: string } }"

# Metrics
duration: 4min
completed: 2026-01-28
---

# Phase 15 Plan 05: Auth Cleanup Summary

**useProfile with retry logic for trigger timing, email/password auth removed, localStorage role tracking eliminated**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-28T11:59:15Z
- **Completed:** 2026-01-28T12:02:47Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- useProfile now retries up to 3 times for PGRST116 errors with exponential backoff
- Email/password authentication completely removed from CoachAuth and StudentAuth
- localStorage role tracking eliminated from all auth components
- Deprecated /login/coach and /login/student routes removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add retry logic to useProfile** - `b9b184d` (feat)
2. **Task 2A: Update CoachAuth to redirect-only** - `89b7b15` (refactor)
3. **Task 2B: Update StudentAuth to class-joining only** - `433cdc2` (refactor)
4. **Task 2C: Remove deprecated routes from App.tsx** - `5a408ad` (refactor)

## Files Created/Modified
- `src/hooks/useProfile.ts` - Added retry configuration with exponential backoff for PGRST116 errors
- `src/components/auth/CoachAuth.tsx` - Simplified to redirect-only (from 197 lines to 17 lines)
- `src/components/auth/StudentAuth.tsx` - Reduced to class-joining only, removed email auth (from 204 lines to 88 lines)
- `src/App.tsx` - Removed /login/coach and /login/student routes

## Decisions Made
- useProfile retries PGRST116 errors up to 3 times with exponential backoff (100ms, 200ms, 400ms) to handle the rare case where React Query fires before the database trigger completes
- Fallback profile creation now uses role from userMetadata instead of hardcoded "coach" - this supports proper role selection flow
- CoachAuth now just redirects to / instead of duplicating auth UI - all auth is handled by Auth.tsx
- StudentAuth renamed from "Student Login" to "Join a Class" since it no longer handles authentication, only class joining via QR/code

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Auth cleanup complete - email/password flows removed
- useProfile robust against trigger timing edge case
- Ready for 15-06 (final integration testing)

---
*Phase: 15-authentication-rebuild*
*Completed: 2026-01-28*
