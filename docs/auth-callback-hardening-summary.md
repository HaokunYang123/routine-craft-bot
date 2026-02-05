# Auth Callback Hardening Summary

## Overview of Changes
- Added explicit handling for OAuth callback `error` query params to surface a recoverable session error UI.
- Short-circuited code exchange when a valid session already exists.
- Expanded exchange error handling for `flow_state_not_found` and PKCE verifier issues with session fallback and a single retry for storage-sourced codes.
- Added timeout guards for profile fetch, profile creation, and role update to avoid indefinite loading.
- Trimmed callback logging to user_id-only context to avoid logging PII or sensitive params.
- Added explicit onboarding fallback when a session exists but no role or intended role can be resolved.
- Added unit tests for code-source recovery and session short-circuit behavior.

## Technical Details
- `src/pages/AuthCallback.tsx`
- Error query handling now exits early with `session_error` UI and a user-friendly message.
- Session pre-check via `supabase.auth.getSession()` skips exchange when already signed in.
- Exchange error handling detects flow-state and PKCE-verifier issues, retries once for storage-based codes, and attempts a session fallback before showing recovery UI.
- Timeouts added via `withTimeout` helper for profile fetch, profile creation, and role update steps.
- Logging trimmed to `log(message, userId)` / `logError(message, userId)` with no URL or parameter logging.
- Intent mismatch onboarding path triggers role picker when session exists but no role or intended role can be resolved.
- New tests in `src/pages/AuthCallback.test.tsx` cover stored code recovery and session short-circuit behavior.

## Testing Checklist (Manual)
1. URL error param detection
Simulate `/auth/callback?error=access_denied&error_description=...`.
Expected: session error UI with retry/back-to-login.

2. Session pre-check
Navigate to `/auth/callback` while already signed in.
Expected: skips exchange, continues to profile/role resolution.

3. Exchange error handling (`flow_state_not_found`)
Use a stale code or clear verifier and hit the callback.
Expected: if session exists, continue; otherwise show recovery UI.

4. PKCE verifier missing
Clear localStorage (verifier), then hit callback with stored code.
Expected: one retry; if still failing and no session, show recovery UI.

5. Timeout fallback
Simulate slow profile fetch or role update.
Expected: role picker or error UI after timeout.

6. Intent mismatch onboarding
Login flow with session but no role or intended role.
Expected: role picker shown with onboarding copy.

## Known Limitations
- Build still emits large chunk warnings (pre-existing).
- ESLint warnings remain for hooks dependency lists in unrelated files.
- Timeout fallbacks do not cancel in-flight network requests (best-effort UI recovery).

## Rollback Instructions
- Revert the auth callback hardening changes by restoring the previous `AuthCallback.tsx` and related test updates.
- No database changes or Supabase client configuration changes were made.
- Blast radius remains limited to OAuth callback and onboarding role resolution paths.
