# CHUNK_REPORT

## Framework/Router
- Framework: Vite + React (SPA).
- Router: React Router v6 (`BrowserRouter`, `Routes`, `Route`) in `src/App.tsx`.

## Auth Page Route (Login/Signup UI)
- Route: `/` (also `/login`, `/login/coach`, `/login/student`)
- Component: `src/pages/Index.tsx` → `src/pages/Auth.tsx`.

## Auth Callback Route (OAuth)
- Route: `/auth/callback`
- Component: `src/pages/AuthCallback.tsx`.

## Route Guard (Coach/Student Protection)
- Component: `src/components/ProtectedRoute.tsx`.
- Used by:
  - `src/pages/DashboardLayout.tsx` (coach routes, `requiredRole="coach"`).
  - `src/pages/student/StudentLayout.tsx` (student routes, `requiredRole="student"`).

## Role Storage (DB)
- Table/Field: `public.profiles.role`.
- Role values: `coach | student` (nullable in practice).

## Role Reads (where role is queried)
- `src/pages/Auth.tsx`: `supabase.from('profiles').select('role')` for session routing and polling.
- `src/components/ProtectedRoute.tsx`: `supabase.from('profiles').select('role')` to authorize protected routes.
- `src/pages/AuthCallback.tsx`: `supabase.from('profiles').select('role, timezone')` when resolving onboarding.
- `src/pages/NotFound.tsx`: `supabase.from('profiles').select('role')` for “Go to Dashboard”.

## Role Writes / Assignment (today)
- `src/pages/AuthCallback.tsx`:
  - Updates role via `.update({ role, timezone })` on `profiles` after OAuth.
  - Inserts profile if missing with `role: initialRole || null`.
- `src/hooks/useProfile.ts`:
  - Fallback insert if `profiles` row missing (uses `user_metadata.role` if present).
- Database trigger:
  - `supabase/migrations/20260128034942_create_handle_new_user_trigger.sql` inserts `profiles` row with `role = NULL` on signup.
  - `supabase/FIX_SIGNUP_TRIGGER.sql` (manual SQL) suggests setting role from `raw_user_meta_data->>'role'`.

## Test Setup + Commands
- Unit tests: Vitest
  - `npm run test`
  - `npm run test:watch`
  - `npm run test:coverage`
- E2E tests: Playwright
  - `npm run test:e2e`
  - `npm run test:e2e:headed`
  - `npm run test:e2e:ui`

## Suspicious Redirect Logic (Loop Risk)
- `src/components/ProtectedRoute.tsx`:
  - If `requiredRole` and role is missing after retries, it redirects to `/`.
  - Condition: `if (roleNotFound || !role) return <Navigate to="/" replace />;`.
- `src/pages/Auth.tsx`:
  - If session exists but `profiles.role` is null, it shows “Finishing Setup…” then after 5 polls shows auth tabs again.
  - This can loop if role never gets set (callback fails or RLS blocks updates).

## CHUNK 1 RESULTS

### Summary of behavioral changes
- OAuth callback now explicitly exchanges PKCE `code` for a session exactly once before any profile work.
- Callback only redirects to `/dashboard` or `/app` after a non-null role is confirmed from `profiles`.
- Missing session shows a dedicated “Setup failed: no session” UI with Retry + Back to login.
- Missing/failed role assignment shows a “Finish setup” role picker and does not bounce to login.
- Added deterministic role resolution and confirmation after updates, with consistent `[auth-callback]` logs.

### Manual verification steps
1. Start at `/` and trigger Google OAuth signup.
2. After returning to `/auth/callback`, verify logs:
   - `[auth-callback] code param found, exchanging for session`
   - `[auth-callback] session present`
   - `[auth-callback] profile resolved` with `currentRole` or `intendedRole`.
3. Confirm successful redirects only after role is present.
4. Simulate missing session (e.g., remove session from localStorage) and verify “Setup failed: no session” UI.
5. Simulate role update failure (e.g., block profile update via RLS) and verify role picker appears with error.

### Tests added + commands
- Added unit tests for pure helpers:
  - `src/pages/authCallbackHelpers.test.ts`
- Run with: `npm run test`

### Remaining problems for CHUNK 2/3
- No guard/onboarding route changes yet (ProtectedRoute still redirects to `/` on missing role).
- No RLS policy alignment or Supabase dashboard validation.
- No e2e coverage for the new session error or role picker flows.

### Next recommended chunk (not implemented)
- CHUNK 2: Add a dedicated onboarding route or adjust ProtectedRoute to avoid redirect loops when role is missing, plus e2e coverage for the new flows.

## CHUNK 2 RESULTS

### What changed and why
- Added an explicit onboarding route (`/onboarding`) with a dedicated page to resolve missing roles for authenticated users.
- Onboarding page reads the user’s profile role and redirects to the correct dashboard when present.
- When role is missing, users are shown a role picker to set and confirm their role without relying on the OAuth callback.
- Added actionable error UI with retry for profile fetch/update failures.

### Manual test steps
1. Visit `/onboarding` while signed out → should redirect to `/`.
2. Sign in as a user with `profiles.role = 'coach'` → visit `/onboarding` and confirm redirect to `/dashboard`.
3. Sign in as a user with `profiles.role = 'student'` → visit `/onboarding` and confirm redirect to `/app`.
4. Sign in as a user with `profiles.role = NULL` → visit `/onboarding`, select a role, and confirm redirect after role persists.

### Tests added
- `src/pages/Onboarding.test.tsx`

Run tests with:
- `npm run test`

### Next recommended chunk (not implemented)
- CHUNK 3: Update route guard behavior to redirect authenticated users with missing roles to `/onboarding` instead of `/`, and add e2e coverage for the loop prevention.
