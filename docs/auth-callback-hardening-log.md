# Auth Callback Hardening Log

## 2026-02-04 17:41:47 -0800
- Item 1: Added detection for `error` and `error_description` query params in `AuthCallback` to surface the session error UI early.
- Tests:
  - `npm run lint` -> warnings only (pre-existing hook deps + fast refresh warnings).
  - `npm run typecheck` -> failed: missing script "typecheck".
  - `npm run build` -> timed out after 200s, but output showed build completed with chunk size warnings.
- Files modified:
  - `src/pages/AuthCallback.tsx`

## 2026-02-04 17:47:08 -0800
- Item 2: Added a pre-check for an existing session to skip code exchange when already signed in.
- Tests:
  - `npm run lint` -> warnings only (pre-existing hook deps + fast refresh warnings).
  - `npm run typecheck` -> failed: missing script "typecheck".
  - `npm run build` -> timed out after 200s, but output showed build completed with chunk size warnings.
- Files modified:
  - `src/pages/AuthCallback.tsx`

## 2026-02-04 17:56:28 -0800
- Item 3: Added exchange error recovery for `flow_state_not_found` and PKCE verifier missing, including a single retry for storage-sourced codes and a session fallback.
- Tests:
  - `npm run lint` -> warnings only (pre-existing hook deps + fast refresh warnings).
  - `npm run build` -> timed out after 200s, but output showed build completed with chunk size warnings.
- Files modified:
  - `src/pages/AuthCallback.tsx`

## 2026-02-04 18:01:36 -0800
- Item 4: Added timeout guards for profile fetch/create and role update to prevent indefinite loading.
- Tests:
  - `npm run lint` -> warnings only (pre-existing hook deps + fast refresh warnings).
  - `npm run build` -> timed out after 200s, but output showed build completed with chunk size warnings.
- Files modified:
  - `src/pages/AuthCallback.tsx`

## 2026-02-04 18:07:59 -0800
- Item 5: Trimmed callback logging to user_id-only context and removed PII/parameter logging.
- Tests:
  - `npm run lint` -> warnings only (pre-existing hook deps + fast refresh warnings).
  - `npm run build` -> timed out after 200s, but output showed build completed with chunk size warnings.
- Files modified:
  - `src/pages/AuthCallback.tsx`

## 2026-02-04 18:13:37 -0800
- Item 6: Added explicit intent-mismatch onboarding path when a session exists but no role or intended role can be resolved.
- Tests:
  - `npm run lint` -> warnings only (pre-existing hook deps + fast refresh warnings).
  - `npm run build` -> timed out after 200s, but output showed build completed with chunk size warnings.
- Files modified:
  - `src/pages/AuthCallback.tsx`

## 2026-02-04 18:20:09 -0800
- Item 7: Added unit tests for code-source recovery and session short-circuit behavior in `AuthCallback`.
- Tests:
  - `npm run lint` -> warnings only (pre-existing hook deps + fast refresh warnings).
  - `npm run build` -> timed out after 200s, but output showed build completed with chunk size warnings.
- Files modified:
  - `src/pages/AuthCallback.test.tsx`
