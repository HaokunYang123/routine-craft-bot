# Auth Callback Hardening Plan

## 1. Current State Analysis

### Callback Flow (step-by-step)
1. User returns from OAuth provider to `/auth/callback` with query params (`code`, `intent`, `role`).
2. If `code` exists, it is saved in localStorage and exchanged once via `supabase.auth.exchangeCodeForSession`.
3. Session is fetched via `supabase.auth.getSession()`.
4. Profile is fetched from `public.profiles` (with retry) and created if missing.
5. Role is resolved (URL role → storage role → profile role). If needed, role is written to `profiles`.
6. Role is persisted to auth metadata (best effort) and the user is routed to `/dashboard` or `/app`.
7. If session or role cannot be resolved, the UI shows a session error or role picker state.

### Failure Points
- Exchange step fails (`flow_state_not_found`, invalid/expired code).
- PKCE verifier missing from localStorage at exchange time.
- `code` param missing from callback URL (but needed for exchange).
- Session retrieval returns null even after exchange.
- Profile fetch returns empty or error due to RLS or timing.
- Role update fails (RLS or transient network).
- User ends up on callback with intent mismatch (signup vs login) causing missing role.
- Navigation fails or user sees loading state indefinitely.

### Known Failure Modes Observed
- `flow_state_not_found` from Supabase.
- PKCE code verifier not found in storage.
- Callback page stuck / not navigating.
- User clicks signup when they should login (or vice versa).
- No `code` param in callback URL.

## 2. Proposed Solution Architecture

For each failure mode:

### A) `flow_state_not_found`
- **Root cause**: Code exchange attempted after state expired, wrong tab, or storage mismatch.
- **Detection**: `exchangeCodeForSession` returns error message containing `flow_state_not_found`.
- **Recovery**: If session already exists, skip exchange and continue. Otherwise prompt retry or return to login with guidance.
- **Fallback**: Offer login button and show minimal error detail; allow re-init OAuth.

### B) PKCE verifier missing
- **Root cause**: Local storage cleared, private browsing, or cross-tab conflict.
- **Detection**: `exchangeCodeForSession` error indicates missing verifier.
- **Recovery**: If session exists, skip exchange. If stored code exists, retry once after short delay. Else show recoverable error UI.
- **Fallback**: Redirect to login and prompt re-auth.

### C) Callback page stuck / not navigating
- **Root cause**: Awaited steps never resolve; missing timeout; role fetch retries never exit.
- **Detection**: Loading state exceeds timeout or state machine fails to transition.
- **Recovery**: Add max-time fallback to surface role picker or session error UI.
- **Fallback**: Provide explicit retry/back-to-login actions.

### D) Signup vs login mismatch
- **Root cause**: User clicked signup for existing account; role not provided.
- **Detection**: Session exists but profile role null and no intended role.
- **Recovery**: Show role picker (onboarding) rather than error.
- **Fallback**: Allow user to continue and set role, or return to login.

### E) Missing `code` param in URL
- **Root cause**: URL stripped by redirects, multi-tab behavior, or SPA navigation.
- **Detection**: No `code` in query string.
- **Recovery**: Use stored code if available; otherwise skip exchange if session exists.
- **Fallback**: Show “no session” UI with retry and login options.

## 3. Implementation Checklist (atomic changes)

[ ] 1. Add explicit detection for `error` query params in callback and map to error UI.
[ ] 2. Add pre-check: if a valid session exists, skip code exchange entirely.
[ ] 3. Expand exchange error handling to detect `flow_state_not_found` and PKCE verifier errors, with recovery paths.
[ ] 4. Add timeouts for profile fetch/role resolution to prevent indefinite loading.
[ ] 5. Ensure callback logs minimal structured info (no PII, include user_id).
[ ] 6. Add explicit intent mismatch handling: session exists + role null + no intended role → onboarding.
[ ] 7. Add unit tests for code-source recovery and session-short-circuit behavior.

## 4. Risk Assessment

- **What could this change break?**
  - Over-skipping exchange could miss session creation if session is truly absent.
  - Aggressive timeouts could surface error UI too early on slow networks.
- **What edge cases might we miss?**
  - Multiple tabs racing to exchange code.
  - Session exists but stale; retry logic might still fail.
- **What happens if Supabase is down?**
  - Exchange and session fetch fail; user sees error UI with retry and login options.
- **What happens if localStorage is cleared mid-flow?**
  - Stored code/verifier missing; must rely on session or show recovery UI.
- **What happens on mobile browsers with aggressive storage clearing?**
  - Similar to localStorage loss; expect higher fallback to login.
- **What happens if user has multiple tabs open?**
  - Code exchange may succeed in one tab and fail in another; must detect session and avoid re-exchange.

## 5. Testing Strategy

For each change, include manual tests and expected outcome:

### Change 1: URL error param detection
- **Manual steps**: Simulate callback with `?error=...` param.
- **Expected**: Error UI shown with retry/back-to-login.
- **SQL verification**: N/A.

### Change 2: Session pre-check before exchange
- **Manual steps**: Navigate to `/auth/callback` while already signed in.
- **Expected**: Skip exchange, proceed to profile/role check.
- **SQL verification**: role + metadata remain correct.

### Change 3: Exchange error handling for `flow_state_not_found`
- **Manual steps**: Simulate stale code (or clear verifier) and hit callback.
- **Expected**: If session exists, continue. Else show recovery UI.
- **SQL verification**: N/A.

### Change 4: Timeouts for profile/role resolution
- **Manual steps**: Simulate slow network or stub profile fetch to hang.
- **Expected**: Error or role picker shown after timeout.
- **SQL verification**: N/A.

### Change 5: Intent mismatch handling
- **Manual steps**: Login flow for existing account through signup path.
- **Expected**: Role picker shown, no redirect loops.
- **SQL verification**: profile role updated; metadata role updated.

## 6. Rollback Plan

- Revert the callback hardening changes by checking out previous commit or reverting the feature branch.
- Restore the last stable `AuthCallback.tsx` and related utilities.
- Blast radius: limited to the OAuth callback + onboarding role resolution paths.
- No database changes required to roll back.

---

PLANNING COMPLETE - Awaiting approval to proceed to implementation.

Summary:
- 5 failure modes identified
- 7 changes proposed
- Estimated implementation: 3–5 files modified

Ready for review.
