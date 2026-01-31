---
phase: 22-security-section-removal
plan: 01
subsystem: auth
tags: [oauth, cleanup, dead-code, security]

# Dependency graph
requires:
  - phase: 15-auth-foundation
    provides: Google OAuth authentication (signInWithOAuth)
  - phase: 17-session-management
    provides: SessionExpiredModal, AuthTabs
provides:
  - Clean auth component directory (only AuthTabs, SessionExpiredModal)
  - OAuth-only test mocks (no password auth methods)
  - Removed StudentPrivacy page (password/2FA/data-export no longer applies)
affects: [23-infrastructure-e2e]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - OAuth-only authentication (no password flows)

key-files:
  created: []
  modified:
    - src/App.tsx (privacy route removed)
    - src/pages/student/StudentSettings.tsx (privacy link removed)
    - src/test/mocks/supabase.ts (password mocks removed)
  deleted:
    - src/pages/student/StudentPrivacy.tsx
    - src/components/auth/MultiAuthLogin.tsx
    - src/components/auth/QRScanner.tsx
    - src/components/auth/ClassCodeForm.tsx
    - src/hooks/useGoogleAuth.ts
    - src/hooks/useQRScanner.ts

key-decisions:
  - "Remove StudentPrivacy page entirely (password/2FA/data-export N/A for OAuth)"
  - "Delete dead auth components rather than deprecate (no future use case)"
  - "Clean test mocks to match production OAuth-only interface"

patterns-established:
  - "OAuth-only auth: no password/reset methods in mocks or production"

# Metrics
duration: 2min
completed: 2026-01-31
---

# Phase 22 Plan 01: Security Section Removal Summary

**Removed 6 dead auth files and password test mocks, completing v3.0 OAuth migration cleanup**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-31T22:21:49Z
- **Completed:** 2026-01-31T22:23:46Z
- **Tasks:** 2
- **Files deleted:** 6
- **Files modified:** 3

## Accomplishments
- Removed StudentPrivacy.tsx and its route/link (password/2FA/data-export no longer applies to OAuth)
- Deleted 5 dead auth code files from v3.0 OAuth migration (MultiAuthLogin, QRScanner, ClassCodeForm, useGoogleAuth, useQRScanner)
- Cleaned test mocks to OAuth-only interface (removed signInWithPassword, resetPasswordForEmail)
- TypeScript compiles with no errors after cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: Commit pending privacy deletion** - `3a961aa` (feat)
   - Deleted StudentPrivacy.tsx
   - Removed /app/privacy route from App.tsx
   - Removed Privacy Policy link from StudentSettings.tsx

2. **Task 1 (continued): Remove dead auth code** - `4903c68` (chore)
   - Deleted MultiAuthLogin.tsx, QRScanner.tsx, ClassCodeForm.tsx
   - Deleted useGoogleAuth.ts, useQRScanner.ts

3. **Task 2: Clean up test mocks** - `38ced60` (chore)
   - Removed signInWithPassword from MockAuth interface
   - Removed resetPasswordForEmail from MockAuth interface
   - Removed corresponding mock implementations

## Files Created/Modified

**Deleted (6 files):**
- `src/pages/student/StudentPrivacy.tsx` - Password/2FA/data-export UI (N/A for OAuth)
- `src/components/auth/MultiAuthLogin.tsx` - Old multi-auth component (replaced by AuthTabs)
- `src/components/auth/QRScanner.tsx` - QR code scanning (only used by MultiAuthLogin)
- `src/components/auth/ClassCodeForm.tsx` - Class code form (only used by MultiAuthLogin)
- `src/hooks/useGoogleAuth.ts` - Google auth hook (only used by MultiAuthLogin)
- `src/hooks/useQRScanner.ts` - QR scanner hook (only used by QRScanner)

**Modified (3 files):**
- `src/App.tsx` - Removed StudentPrivacy import and /app/privacy route
- `src/pages/student/StudentSettings.tsx` - Removed Privacy Policy link
- `src/test/mocks/supabase.ts` - Removed signInWithPassword and resetPasswordForEmail mocks

## Decisions Made

1. **Remove StudentPrivacy page entirely** - Password change, 2FA settings, and data export are not applicable after v3.0's Google OAuth migration. Users authenticate via Google, not passwords.

2. **Delete dead auth components rather than deprecate** - MultiAuthLogin and related components have no future use case. OAuth-only authentication via AuthTabs is the final design.

3. **Clean test mocks to match production** - Removed signInWithPassword and resetPasswordForEmail from test mocks since no production code uses password authentication.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing test failures unrelated to this phase:**
- 2 failing tests in useGroups.test.tsx (deleteGroup cache invalidation) - these failures are unrelated to the mock cleanup and existed prior to this phase. No tests depended on the removed password auth mocks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All dead auth code removed from codebase
- Test mocks aligned with OAuth-only production code
- Ready for Phase 23: Infrastructure & E2E

**Auth component directory now contains only:**
- AuthTabs.tsx (active - OAuth sign-in)
- SessionExpiredModal.tsx (active - session management)

---
*Phase: 22-security-section-removal*
*Completed: 2026-01-31*
