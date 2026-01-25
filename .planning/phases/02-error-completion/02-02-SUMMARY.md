---
phase: 02-error-completion
plan: 02
subsystem: auth/session-management
tags: [jwt, session-expiry, modal, supabase-auth]
dependency-graph:
  requires: [01-error-foundation]
  provides: [session-expiry-detection, session-expired-modal]
  affects: [02-03, 02-04]
tech-stack:
  added: []
  patterns: [auth-state-listener, non-dismissible-modal]
key-files:
  created:
    - src/components/auth/SessionExpiredModal.tsx
  modified:
    - src/hooks/useAuth.tsx
    - src/App.tsx
decisions:
  - Navigate before signOut to prevent false expiry modal
  - Use onAuthStateChange SIGNED_OUT event for detection
  - Exclude auth pages from showing modal (already at login)
metrics:
  duration: 1min 25s
  completed: 2026-01-25
---

# Phase 02 Plan 02: Session Expiry Handling Summary

JWT session expiry detection via Supabase auth events with non-dismissible modal for re-login prompt.

## What Was Built

### SessionExpiredModal Component
Non-dismissible AlertDialog that appears when a user's session expires:
- Prevents escape key and click-outside dismissal
- Single "Sign In Again" action button
- Clear messaging: "Your session has expired. Please sign in again to continue where you left off."

### useAuth Hook Extension
Extended with session expiry detection:
- `sessionExpired` state - true when SIGNED_OUT event detected
- `clearSessionExpired()` - resets state after re-login
- Clears state on TOKEN_REFRESHED or SIGNED_IN events
- Navigate-before-signOut pattern prevents false expiry modal on explicit signout

### App.tsx Integration
SessionExpiredHandler component wired at app root:
- Inside Router context for navigation access
- Excludes auth pages (`/`, `/login/*`) from showing modal
- Navigates to `/login` on re-login action

## Implementation Details

**Session Expiry Flow:**
1. User's JWT expires after inactivity (Supabase default: 7 days refresh token)
2. Supabase attempts silent token refresh automatically
3. If refresh fails, Supabase fires `SIGNED_OUT` event
4. useAuth detects event, sets `sessionExpired: true`
5. SessionExpiredHandler shows non-dismissible modal
6. User clicks "Sign In Again" -> modal closes, navigate to `/login`
7. On successful re-login, `SIGNED_IN` event clears expiry state

**Explicit Signout Flow:**
1. User clicks "Sign Out"
2. `signOut()` navigates to `/` FIRST
3. Then calls `supabase.auth.signOut()`
4. `SIGNED_OUT` event fires, but user is on auth page
5. Modal hidden because `isAuthPage` check excludes `/` and `/login/*`

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| src/components/auth/SessionExpiredModal.tsx | Created | +37 |
| src/hooks/useAuth.tsx | Extended with session expiry state | +16, -2 |
| src/App.tsx | Added SessionExpiredHandler | +29, -1 |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 8e99062 | feat | Add SessionExpiredModal component |
| 5c13214 | feat | Add session expiry detection to useAuth |
| 4670c0f | feat | Wire SessionExpiredModal in App.tsx |

## Verification Results

- TypeScript compiles: PASS
- Build succeeds: PASS
- Modal is non-dismissible (escape/click-outside prevented): PASS
- Modal hidden on auth pages: PASS
- Re-login navigates to login page: PASS

## Deviations from Plan

None - plan executed exactly as written.

## Key Patterns Established

1. **Non-dismissible modal pattern**: Use AlertDialog with `onEscapeKeyDown` and `onPointerDownOutside` prevention
2. **Auth state listener pattern**: Listen to Supabase `onAuthStateChange` for session events
3. **Navigate-before-action pattern**: Navigate away before triggering state that could show unwanted UI

## Next Phase Readiness

Session expiry handling complete. Ready for:
- 02-03: Network connectivity handling
- 02-04: Final error handling integration
