---
phase: 15
plan: 03
subsystem: authentication
tags: [role-selection, oauth, react-components, ux]
dependency-graph:
  requires: [15-01, 15-02]
  provides: [direct-oauth-role-cards, simplified-auth-landing]
  affects: [15-04-protected-routes, 15-05-error-pages]
tech-stack:
  added: []
  patterns: [direct-oauth-trigger, session-aware-redirect]
key-files:
  created: []
  modified:
    - src/components/auth/RoleSelection.tsx
    - src/pages/Auth.tsx
decisions:
  - id: direct-oauth-click
    choice: "Card click triggers OAuth immediately without intermediate screen"
    reason: "Per CONTEXT.md - streamlined UX with no extra navigation steps"
metrics:
  duration: 1m
  completed: 2026-01-28
---

# Phase 15 Plan 03: Role Selection UI Rebuild Summary

RoleSelection now triggers Google OAuth directly from card click with loading states; Auth.tsx simplified to landing page with auto-redirect for logged-in users.

## What Was Done

### Task 1: Rebuild RoleSelection.tsx with direct OAuth trigger
**Commit:** 444a58e

Completely rebuilt `RoleSelection.tsx` to:
- Remove navigation to separate `/login/coach` and `/login/student` routes
- Import and use `useGoogleAuth` hook directly
- Add `selectedRole` state to track which card was clicked
- Show `Loader2` spinner on selected card while OAuth is in progress
- Display inline error message below cards when auth fails
- Add "Trouble signing in?" troubleshooting link with popup tips
- Silent reset (clear selected role) if OAuth popup closed without completing

Key behaviors implemented per CONTEXT.md:
- Two large cards (Coach left, Student right) with icons and taglines
- Cards taller (h-36) with larger icons (w-14/h-14) for better visual presence
- Clicking immediately triggers `signInWithGoogle(role)` - no intermediate screen
- Both cards disabled while any OAuth is in progress

### Task 2: Simplify Auth.tsx as landing page
**Commit:** c644d92

Simplified `Auth.tsx` to be a clean landing page:
- Removed path-based rendering logic (no more `/login/coach`, `/login/student`)
- Always shows `RoleSelection` component directly
- Added `checking` state with loading spinner while checking session
- Auto-redirects logged-in users to their dashboard (coach -> /dashboard, student -> /app)
- Removed imports for `CoachAuth` and `StudentAuth` (no longer needed)
- Updated branding to "Welcome to Routine Craft"
- Logo centered above welcome text for cleaner layout

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript compilation | PASS |
| Build (vite) | PASS |
| Auth.tsx no longer imports CoachAuth/StudentAuth | PASS |
| RoleSelection triggers OAuth directly | PASS |
| RoleSelection min 80 lines | PASS (94 lines) |
| Auth.tsx contains RoleSelection | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Check

- [x] User sees welcome message and two role cards on landing page
- [x] Clicking a card triggers Google OAuth with loading indicator
- [x] Error messages appear inline below cards
- [x] Troubleshooting link available
- [x] Logged-in users visiting / are auto-redirected to their dashboard

## Files Changed

| File | Change | Purpose |
|------|--------|---------|
| src/components/auth/RoleSelection.tsx | Modified | Direct OAuth trigger from card click with loading states |
| src/pages/Auth.tsx | Modified | Simplified landing page with auto-redirect |

## Next Phase Readiness

**Ready for Plan 04:** Protected routes and routing configuration:
- Role selection now works end-to-end with OAuth
- Auth landing page is simplified and ready
- Session detection and role-based redirect in place

**Dependencies satisfied:**
- Direct OAuth trigger from role cards (15-03)
- OAuth callback sets role in profile (15-02)
- Database trigger creates profile atomically (15-01)

## Commits

| Hash | Message |
|------|---------|
| 444a58e | feat(15-03): rebuild RoleSelection with direct OAuth trigger |
| c644d92 | feat(15-03): simplify Auth.tsx as landing page |
