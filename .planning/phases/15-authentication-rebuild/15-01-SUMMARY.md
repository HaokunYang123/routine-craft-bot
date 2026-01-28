---
phase: 15
plan: 01
subsystem: authentication
tags: [supabase, oauth, database-trigger, react-hooks]
dependency-graph:
  requires: []
  provides: [handle_new_user_trigger, role_parameter_oauth, auth_cleanup]
  affects: [15-02-callback, 15-03-role-routing]
tech-stack:
  added: []
  patterns: [database-trigger-for-profile, url-parameter-for-oauth-state]
key-files:
  created:
    - supabase/migrations/20260128034942_create_handle_new_user_trigger.sql
  modified:
    - src/hooks/useGoogleAuth.ts
    - src/components/auth/CoachAuth.tsx
    - src/components/auth/MultiAuthLogin.tsx
decisions:
  - id: role-null-on-create
    choice: "Profile created with role=NULL, callback sets role ONCE"
    reason: "Supports AUTH-10 immutability - role cannot be changed once set, but CAN be set from null"
metrics:
  duration: 3m
  completed: 2026-01-28
---

# Phase 15 Plan 01: Database Trigger and OAuth Role Parameter Summary

Database trigger creates profile atomically on OAuth signup with role=NULL; useGoogleAuth now passes role in redirectTo URL for callback to set.

## What Was Done

### Task 1: Create handle_new_user database trigger
**Commit:** 45d5d02

Created migration `20260128034942_create_handle_new_user_trigger.sql` that:
- Drops existing trigger/function (idempotent)
- Creates `handle_new_user()` function with `SECURITY DEFINER SET search_path = ''`
- Extracts display_name from OAuth metadata (`full_name`, `name`, or email prefix)
- Inserts profile with `role=NULL` (intentionally - callback sets role ONCE)
- Uses `ON CONFLICT (user_id) DO NOTHING` to prevent duplicates
- Creates trigger `on_auth_user_created` AFTER INSERT on auth.users

**Key design decision:** Role is NULL initially. This supports AUTH-10 (role immutability) - the callback will set the role ONCE from the URL parameter. Role cannot be changed after being set, but can be set from null.

### Task 2: Enhance useGoogleAuth to pass role in redirectTo
**Commit:** 18eacca

Modified `useGoogleAuth.ts`:
- Changed `signInWithGoogle()` to `signInWithGoogle(role: 'coach' | 'student')`
- Updated redirectTo URL to `/auth/callback?role=${role}`
- Role now persists through OAuth redirect via URL parameter (not localStorage)

Updated callers (blocking fix - Rule 3):
- `CoachAuth.tsx`: Now passes `'coach'` role
- `MultiAuthLogin.tsx`: Now passes `selectedRole` with null check

Removed localStorage-based `intended_role` pattern - now URL-based.

### Task 3: Verify onAuthStateChange cleanup (AUTH-06)
**No changes needed**

Verified `useAuth.tsx` already has proper cleanup:
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
// ...
return () => subscription.unsubscribe();
```

AUTH-06 is satisfied. No memory leaks from auth subscriptions.

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript compilation | PASS |
| Build (vite) | PASS |
| Test suite (240 tests) | PASS |
| Migration file syntax | VALID |
| useGoogleAuth requires role | PASS |
| useAuth has subscription cleanup | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing signInWithGoogle callers**
- **Found during:** Task 2
- **Issue:** Two files called `signInWithGoogle()` without role parameter after signature change
- **Fix:** Updated `CoachAuth.tsx` to pass `'coach'`, `MultiAuthLogin.tsx` to pass `selectedRole`
- **Files modified:** src/components/auth/CoachAuth.tsx, src/components/auth/MultiAuthLogin.tsx
- **Commit:** 18eacca

## Success Criteria Check

- [x] Database trigger `handle_new_user` is active on auth.users (migration ready)
- [x] Trigger creates profiles with role=null (not a default value)
- [x] useGoogleAuth.signInWithGoogle requires role parameter ('coach' | 'student')
- [x] OAuth redirect URL includes role query parameter
- [x] useAuth.tsx properly unsubscribes from onAuthStateChange (AUTH-06)
- [x] No TypeScript errors in modified files

## Files Changed

| File | Change | Purpose |
|------|--------|---------|
| supabase/migrations/20260128034942_create_handle_new_user_trigger.sql | Created | Database trigger for atomic profile creation |
| src/hooks/useGoogleAuth.ts | Modified | Added required role parameter, URL-based role passing |
| src/components/auth/CoachAuth.tsx | Modified | Updated to pass 'coach' role |
| src/components/auth/MultiAuthLogin.tsx | Modified | Updated to pass selectedRole |

## Next Phase Readiness

**Ready for Plan 02:** The `/auth/callback` page needs to be created to:
1. Extract role from URL parameter
2. Set role in profile (UPDATE where role IS NULL)
3. Route to appropriate dashboard based on role

**Dependencies satisfied:**
- Database trigger will create profile atomically
- Role will be available in URL at callback
- Auth state cleanup is properly handled

## Commits

| Hash | Message |
|------|---------|
| 45d5d02 | feat(15-01): create handle_new_user database trigger |
| 18eacca | feat(15-01): enhance useGoogleAuth to pass role in redirectTo |
