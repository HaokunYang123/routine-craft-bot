# CODEBASE_TAKEOVER_REPORT

## Executive Summary
TeachCoachConnect is a Vite + React (React Router) SPA that uses Supabase for auth and data. The app has a unified auth page (`/`) and an OAuth callback route (`/auth/callback`) that is responsible for creating/updating a `profiles` row and setting `profiles.role` to `coach` or `student`. Both dashboards are protected by `ProtectedRoute`, which fetches `profiles.role` and redirects to `/` if it is missing. The observed “setup loading → back to login” loop is consistent with `profiles.role` staying `NULL` (or not being readable) after signup, which makes the guards and the auth page treat the user as not onboarded.

The primary risk in the current flow is that role assignment depends on the callback route and successful profile writes. If the callback doesn’t execute, if the session isn’t available yet, or if profile updates are blocked (RLS/policy mismatch), the user appears “created” in Supabase but the UI never resolves the role, causing a loop back to the auth UI.

## Architecture Map (Routes, Providers, Supabase client, Auth flow)

### Framework & Entry
- Framework: Vite + React + React Router (CSR only).
- App entry: `src/App.tsx` sets up `BrowserRouter`, `QueryClientProvider`, `AppErrorBoundary`, `RouteErrorBoundary`, `TooltipProvider`, and a `SessionExpiredHandler` using `useAuth`.

### A1) Routes & Layouts
- `/` → `src/pages/Index.tsx` → `src/pages/Auth.tsx` (auth page with signup/login tabs and “Finishing Setup” state).
- `/login`, `/login/coach`, `/login/student` → `src/pages/Index.tsx` → `Auth` (aliases to main auth page).
- `/auth/callback` → `src/pages/AuthCallback.tsx` (OAuth callback, profile creation, role assignment).
- `/dashboard` → `src/pages/DashboardLayout.tsx` → `ProtectedRoute(requiredRole="coach")` → coach dashboard shell.
  - `/dashboard` index → `src/pages/CoachDashboard.tsx`
  - `/dashboard/calendar` → `src/pages/CoachCalendar.tsx`
  - `/dashboard/people` → `src/pages/People.tsx`
  - `/dashboard/templates` → `src/pages/Templates.tsx`
  - `/dashboard/recurring` → `src/pages/RecurringSchedules.tsx`
  - `/dashboard/settings` → `src/pages/CoachSettings.tsx`
  - `/dashboard/tasks` → `src/pages/Tasks.tsx`
  - `/dashboard/assistant` → `src/pages/Assistant.tsx`
  - `/dashboard/progress` → `src/pages/Progress.tsx`
  - `/groups/${groupId}` → `src/pages/GroupDetail.tsx`
- `/assigner-dashboard` → `src/pages/DashboardLayout.tsx` → `ProtectedRoute(requiredRole="coach")` → `src/pages/AssignerDashboard.tsx`.
- `/app` → `src/pages/student/StudentLayout.tsx` → `ProtectedRoute(requiredRole="student")`.
  - `/app` index → `src/pages/student/StudentHome.tsx`
  - `/app/calendar` → `src/pages/student/StudentCalendar.tsx`
  - `/app/settings` → `src/pages/student/StudentSettings.tsx`
  - `/app/help` → `src/pages/student/StudentHelp.tsx`
- `/assignee-dashboard` → `src/pages/student/StudentLayout.tsx` → `ProtectedRoute(requiredRole="student")` → `src/pages/AssigneeDashboard.tsx`.
- `/ui` → `src/pages/PolygonShowcase.tsx`.
- `*` → `src/pages/NotFound.tsx`.

### A2) Supabase Client Setup
- Supabase client is initialized once in `src/integrations/supabase/client.ts` with:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `auth` options: `storage: localStorage`, `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, `flowType: 'pkce'`.
- No evidence of a second client init pattern in the repo.

### A3) Auth State Management
- `useAuth` (`src/hooks/useAuth.tsx`) is the only auth hook and is used directly in many components (no global provider). It sets local state using:
  - `supabase.auth.onAuthStateChange` to keep `user` + `session` in sync.
  - `supabase.auth.getSession()` for initial hydration.
- Route guard: `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) checks `useAuth` for session and then queries `profiles.role` to allow or redirect.
- Auth page (`src/pages/Auth.tsx`) does its own `supabase.auth.getSession()` + profile role poll, independent of `useAuth`.
- Callback page (`src/pages/AuthCallback.tsx`) fetches session via `supabase.auth.getSession()`, then reads/writes the `profiles` row and sets `profiles.role`.
- Other auth usage:
  - `NotFound` uses `getSession` and `supabase.from('profiles').select('role')` to go home.
  - `SessionExpiredHandler` in `App.tsx` uses `useAuth` to show an expiry modal.

### A4) Data Model + Role Model
- Core onboarding table: `public.profiles` (created in migrations).
  - `profiles.user_id` → `auth.users.id` (unique, required).
  - `profiles.role` → `coach | student` (nullable in practice).
- Role is stored in `profiles.role` and used for authorization and routing.
- OAuth signup uses metadata and URL/localStorage params to infer role (`AuthTabs` → `AuthCallback`).
- Fallback profile creation exists in `useProfile` if `profiles` row is missing.

### A5) RLS Policies / Security Assumptions
- `public.profiles` has RLS enabled in migrations.
  - Base migration policies: users can select/update/insert their own profile.
- `supabase/APPLY_RLS_POLICIES.sql` broadens select to “Users can view all profiles,” while keeping update/insert to own.
- Auth flow relies on:
  - `profiles` SELECT for the current user (Auth, ProtectedRoute, AuthCallback).
  - `profiles` INSERT or UPDATE for the current user (AuthCallback, useProfile fallback).
- If RLS is misapplied or different in production, these calls can silently return empty results, causing role resolution failures.

## Signup Flow Trace (Coach + Student)

### B1) Coach Signup Flow
Sequence (coach):
1. Click “Coach” signup button → `src/components/auth/AuthTabs.tsx` `handleSignUp("coach")`.
2. Sets `localStorage.pendingAuthRole = 'coach'` and `pendingAuthIntent = 'signup'`.
3. Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { data: { role, intent }, redirectTo: /auth/callback?intent=signup&role=coach } })`.
4. OAuth redirects to `/auth/callback` → `src/pages/AuthCallback.tsx`.
5. `AuthCallback` calls `supabase.auth.getSession()`. If session exists:
   - Attempts to fetch profile (`profiles` select). Retries up to 5 times.
   - If no profile, attempts to insert one with `role: initialRole || null`.
   - If profile role exists, redirects to `/dashboard`.
   - If role is missing and `initialRole` exists, updates profile role and redirects to `/dashboard`.
6. If `profiles.role` is still NULL or update fails, `AuthCallback` shows error or role selection UI.
7. If user lands on `/dashboard` but `ProtectedRoute` can’t resolve role, it redirects to `/`.

### B2) Student Signup Flow
Sequence (student) mirrors coach:
1. Click “Student” signup button → `AuthTabs.tsx` `handleSignUp("student")`.
2. LocalStorage role/intent set and OAuth redirect to `/auth/callback?intent=signup&role=student`.
3. `AuthCallback` obtains session, fetches/creates profile, sets role.
4. On success, navigates to `/app`.
5. `ProtectedRoute` on `StudentLayout` checks `profiles.role === 'student'` or redirects to `/`/`/dashboard`.

### B3) Setup/Onboarding Page Responsibilities
- **Auth page** (`src/pages/Auth.tsx`) does session check and role polling; when session exists but role is `NULL`, it shows “Finishing Setup…” for up to 5 polls, then displays `AuthTabs` again (role selection prompt).
- **AuthCallback** (`src/pages/AuthCallback.tsx`) is the real onboarding step:
  - Ensures session exists.
  - Fetches or creates profile row.
  - Sets `profiles.role` based on URL/localStorage intent.
  - Sets timezone and redirects to dashboard.
- Error handling:
  - `AuthCallback` shows a “Setup Failed” UI if session/profile operations fail.
  - `Auth` page does not surface an explicit error for role resolution failures; it simply loops back to role prompt.

## Bug Diagnosis (Root cause(s) + evidence)

### C1) Most Likely Causes (prioritized)
1. **`profiles.role` remains `NULL` after signup, causing guards to redirect to `/`.**
   - The `handle_new_user` trigger inserts profile with `role = NULL` by design (`supabase/migrations/20260128034942_create_handle_new_user_trigger.sql`). If the callback does not run or fails to update role, the user never passes the guard.
2. **OAuth callback not reliably setting role** due to a missing callback (redirect URL mismatch) or session not available at callback time.
   - `AuthCallback` is responsible for role assignment. If the redirect lands on `/` instead of `/auth/callback`, the role stays NULL and the auth page polls then shows login again.
3. **RLS or profile visibility issues** resulting in `profiles.role` read returning empty.
   - `ProtectedRoute` uses `.single()` without error handling; if RLS blocks or data is missing, it sets `roleNotFound` and redirects to `/`.

### C2) Evidence (code + guard behavior)
- **Role is intentionally NULL on signup**:
  - `supabase/migrations/20260128034942_create_handle_new_user_trigger.sql` inserts `role = NULL` for new users.
- **Auth page assumes NULL role = “setup in progress”**:
  - `src/pages/Auth.tsx` sets `waiting_for_role` if session exists but `profiles.role` is null, then falls back to showing `AuthTabs` after 5 polls.
- **Guard redirects to `/` when role missing**:
  - `src/components/ProtectedRoute.tsx`:
    - If `roleNotFound || !role` → `Navigate to "/"`.

**Redirect loop logic (truth table)**
Guard condition in `ProtectedRoute` when `requiredRole` is set:
- If `authLoading || roleLoading` → show spinner (no redirect).
- If `!user` → redirect to `/`.
- Else if `roleNotFound || !role` → redirect to `/`.
- Else if `role !== requiredRole` → redirect to `/app` or `/dashboard`.
- Else → allow access.

Simplified truth table (after loading completes):

| user | role | roleNotFound | requiredRole | Outcome |
| --- | --- | --- | --- | --- |
| false | n/a | n/a | any | Redirect `/` |
| true | null | false | coach/student | Redirect `/` (role missing) |
| true | null | true | coach/student | Redirect `/` (role missing) |
| true | coach | false | coach | Allow |
| true | student | false | student | Allow |
| true | coach | false | student | Redirect `/dashboard` |
| true | student | false | coach | Redirect `/app` |

### C3) Minimal Fix Candidates (do not implement)
1. **Set role in DB at signup (trigger reads metadata)**
   - Change `handle_new_user` to use `raw_user_meta_data->>'role'` (see `supabase/FIX_SIGNUP_TRIGGER.sql`).
   - Pros: removes dependency on callback route, prevents NULL role loops.
   - Cons: requires DB change; role immutability must be enforced if needed.
   - Files: `supabase/migrations/*` or apply `FIX_SIGNUP_TRIGGER.sql` in production.
   - Test: signup coach/student → role populated in profile immediately.

2. **Harden the callback + add explicit session exchange**
   - In `AuthCallback`, explicitly call `supabase.auth.exchangeCodeForSession()` if a `code` param exists (PKCE flow).
   - Keep redirect to `/auth/callback` but show actionable error UI if session missing.
   - Pros: makes callback deterministic even if `detectSessionInUrl` fails.
   - Cons: requires careful handling to avoid double exchange.
   - Files: `src/pages/AuthCallback.tsx`.
   - Test: simulate callback with code in URL; confirm session + role update.

3. **Make guard/onboarding state explicit (no redirect to `/` on missing role)**
   - Replace `Navigate to '/'` on missing role with a dedicated `/onboarding` route or “complete setup” page, and keep user authenticated.
   - Pros: avoids redirect loop; clearer UX.
   - Cons: adds a new route and new states.
   - Files: `src/components/ProtectedRoute.tsx`, `src/pages/Auth.tsx`, `src/App.tsx`.
   - Test: new user without role is guided to role selection instead of a login loop.

## Chunked Implementation Plan (with tests)

1. **Audit current role + callback behavior in production**
   - Goal: verify actual root cause (missing callback, role NULL, RLS denial).
   - Files: `src/pages/AuthCallback.tsx`, `src/pages/Auth.tsx`, `src/components/ProtectedRoute.tsx` (add logging later).
   - Change summary: add structured logging and error surfaces (no functional changes yet).
   - Tests: none.
   - Manual verification: reproduce signup and collect logs for session/role/profile state.
   - Rollback: remove added logs if noisy.

2. **Make role assignment deterministic at DB layer**
   - Goal: ensure profile has role immediately after signup.
   - Files: `supabase/migrations/...` or apply `supabase/FIX_SIGNUP_TRIGGER.sql`.
   - Change summary: update `handle_new_user` to read `raw_user_meta_data->>'role'` and default safely.
   - Tests: add integration test (if DB test harness exists), or simulate in e2e with mock responses.
   - Manual verification: signup with coach/student → profile shows correct role; no loop.
   - Rollback: revert SQL function change.

3. **Harden callback for PKCE session exchange**
   - Goal: prevent session-null callback failures.
   - Files: `src/pages/AuthCallback.tsx`.
   - Change summary: if `code` param exists, call `supabase.auth.exchangeCodeForSession()` before `getSession()`.
   - Tests: add Playwright test for callback code path.
   - Manual verification: signup in a clean browser; verify session + role creation.
   - Rollback: remove exchange logic.

4. **Adjust ProtectedRoute behavior for missing role**
   - Goal: avoid redirect loop and make missing role explicit.
   - Files: `src/components/ProtectedRoute.tsx`, `src/pages/Auth.tsx`, `src/App.tsx`.
   - Change summary: send users with `role == null` to a dedicated onboarding screen (or keep them on callback) instead of `/`.
   - Tests: add unit test for ProtectedRoute’s missing role branch; update e2e to verify onboarding route.
   - Manual verification: create user with missing role and confirm they see role selection rather than login.
   - Rollback: restore original redirect behavior.

5. **Add robust error UI for role/profile failures**
   - Goal: surface RLS or profile insert/update failures.
   - Files: `src/pages/Auth.tsx`, `src/pages/AuthCallback.tsx`.
   - Change summary: show actionable errors instead of silent fallbacks; include “Retry” and “Contact support”.
   - Tests: add UI unit test for error state.
   - Manual verification: simulate blocked update and confirm UI guidance.
   - Rollback: revert UI changes.

6. **Consolidate auth state usage**
   - Goal: reduce mismatched session reads.
   - Files: `src/hooks/useAuth.tsx`, `src/pages/Auth.tsx`, `src/pages/AuthCallback.tsx`.
   - Change summary: prefer `useAuth` or a single session source to avoid races; document the source of truth.
   - Tests: update useAuth tests as needed.
   - Manual verification: sign-in flow across routes remains stable.
   - Rollback: revert refactor.

7. **Extend e2e tests for signup loop prevention**
   - Goal: lock in correct behavior.
   - Files: `e2e/auth.spec.ts` + new fixtures.
   - Change summary: add tests for “role missing” and “callback fails” paths.
   - Tests: Playwright `npm run test:e2e`.
   - Manual verification: run in headed mode to observe flow.
   - Rollback: remove added test cases.

## Risk Register (top 5 risks and mitigations)
1. **OAuth redirect URL mismatch** leads to callback not being hit.
   - Mitigation: verify Supabase Auth “Redirect URLs” include `/auth/callback` and environment origin.
2. **Role stays NULL due to trigger behavior or callback failures**.
   - Mitigation: set role in DB trigger using metadata; add explicit callback checks.
3. **RLS policies differ between local and production** leading to blocked profile reads/updates.
   - Mitigation: align policies (apply `APPLY_RLS_POLICIES.sql` consistently); add error handling when profile ops fail.
4. **Auth state race conditions** from multiple `getSession` calls and subscriptions.
   - Mitigation: centralize session source (single hook/provider) and ensure guards wait for hydration.
5. **Unclear onboarding UX** when role missing or profile not created.
   - Mitigation: create explicit onboarding route and clear error states.

## Appendices

### Key file index
- `src/App.tsx` — router, providers, route definitions.
- `src/pages/Auth.tsx` — login/signup UI, session check, role polling, “Finishing Setup…” UI.
- `src/components/auth/AuthTabs.tsx` — OAuth signup/login triggers and localStorage intent/role.
- `src/pages/AuthCallback.tsx` — OAuth callback; profile creation and role assignment.
- `src/components/ProtectedRoute.tsx` — role-based guard and redirects.
- `src/hooks/useAuth.tsx` — auth state hook (session + user).
- `src/integrations/supabase/client.ts` — Supabase client init and auth options.
- `supabase/migrations/20260128034942_create_handle_new_user_trigger.sql` — profile creation trigger sets role NULL.
- `supabase/FIX_SIGNUP_TRIGGER.sql` — suggested DB fix: set role from metadata.
- `e2e/auth.spec.ts` — Playwright coverage for auth flows.

### Relevant code excerpts (short)
- `src/components/ProtectedRoute.tsx` (redirect on missing role):
```tsx
if (requiredRole) {
  if (roleNotFound || !role) {
    return <Navigate to="/" replace />;
  }
}
```

- `src/pages/Auth.tsx` (waiting for role):
```tsx
if (role === null) {
  setAuthState("waiting_for_role");
  setPollAttempt(1);
}
```

- `supabase/migrations/20260128034942_create_handle_new_user_trigger.sql`:
```sql
INSERT INTO public.profiles (
  user_id, display_name, role, created_at, updated_at
)
VALUES (new.id, display_name_value, NULL, now(), now());
```

### Commands to run tests/build/dev
- `npm run dev`
- `npm run build`
- `npm run test` (Vitest)
- `npm run test:e2e` (Playwright)
- `npm run test:e2e:headed` (Playwright headed)
