# TeachCoachConnect Development Log

## Completed

### Email Signup Role Selection and Callback Auto-Role (2026-02-08)
- Added role selection (Coach/Student) to email signup form
- Role stored in user metadata during signUp
- AuthCallback reads role from metadata after email confirmation and creates profile automatically
- Skips role selection page for email signup users
- Google OAuth flow unchanged, legacy fallback preserved

### Email/Password Auth Chunk 2 Forgot Password Flow (2026-02-08)
- Wired "Forgot password?" in auth login tab to a new reset-request view with email input and send action.
- Added reset email request via `supabase.auth.resetPasswordForEmail(email, { redirectTo: /auth/callback })`.
- Added reset password view on auth page for recovery sessions with new password + confirm fields and validation.
- Added password update via `supabase.auth.updateUser({ password })` and sign-out after successful reset.
- Updated AuthCallback to detect Supabase recovery callbacks (`type=recovery`) and redirect to `/login?mode=reset` instead of role setup routing.
- Updated Auth page session gating to allow reset mode to render auth reset UI without auto-redirecting to coach or student dashboards.
- Fixed duplicate email signup: detects existing identity via empty identities array and shows helpful error instead of fake success message

### Shared Gemini Utility (2026-02-06)
- Created src/lib/gemini.ts: shared Gemini API utility with typed request/response, JSON mode, 15s timeout, single retry on parse failure
- Updated gemini.ts: use VITE_GEMINI_API_KEY as sole env var (Vite requires VITE_ prefix for client-side access)
- Phase 1 AI Template Builder: built AIPlanBuilder.tsx with input, generate, preview, edit, save flow. Created templatePrompt.ts for Gemini prompt construction. Wired into Templates page. Saves to templates + template_tasks with is_ai_generated flag.
- Added unsaved changes protection to AIPlanBuilder: beforeunload listener + tab switch confirmation when AI template is in preview but not saved

### Task Writing Helper Phase 2 Chunk 1 (2026-02-06)
- Phase 2 Chunk 1: Created PolishButton component and polishPrompt.ts. AI Polish feature wired into ManualTemplateBuilder task descriptions with undo support.

### Task Writing Helper Phase 2 Chunk 2 (2026-02-06)
- Phase 2 Chunk 2: Wired PolishButton into AssignTaskModal and AIPlanBuilder preview task descriptions

### Gemini Reliability Update (2026-02-07)
- Increased Gemini timeout from 15s to 45s for template generation, improved error messages for timeout and network failures

### Personalize a Plan Phase 3 Chunk 1 (2026-02-07)
- Phase 3 Chunk 1: Created personalizePrompt.ts (prompt builder with ai_note fallback for bad/unrelated input) and PersonalizeDialog.tsx (dialog with modifier input, Gemini generation, editable preview with ai_note banner, save as new template)

### Personalize a Plan Phase 3 Chunk 2 (2026-02-07)
- Phase 3 Chunk 2: Wired "Personalize with AI" button into Templates.tsx. Button appears on saved templates, opens PersonalizeDialog with full template data, refreshes template list after save. Unsaved changes guard respected.

### Personalize a Plan Phase 3 Fix (2026-02-07)
- Phase 3 fix: Updated PersonalizeDialog modifier input placeholder to use template-appropriate examples instead of student-specific ones

### Weekly Summaries Phase 4 (2026-02-07)
- Phase 4: Created summaryPrompt.ts (prompt builder for weekly group summaries) and WeeklySummary.tsx (group dropdown, chained data fetching with per-step error handling, local rawStats computation, Gemini summary with raw stats fallback on AI failure, timezone-aware 7 day window). Wired into coach dashboard.

### Assign Task Modal Mobile Scroll Bug Fix (2026-02-07)
- Bug fix: AssignTaskModal mobile scroll. Added max-height and overflow-y auto to dialog content, pinned confirm button at bottom so it is always reachable on small screens.

### Email/Password Auth Chunk 1 (2026-02-07)
- Email/password auth Chunk 1: Added signup form (email, password, confirm password with validation), login form (with inline errors, failed attempt tracking, 60s lockout after 5 failures), email confirmation handling in AuthCallback.tsx, post-login profile check and role-based redirect for email users, pending join token support for QR flow. Google OAuth preserved alongside new forms.

### Delete Account Feature (2026-02-05)
- Delete Account: added Supabase Edge Function (`delete-account`) that verifies caller JWT and deletes the authenticated user via `supabase.auth.admin.deleteUser`.
- Added reusable Delete Account section in settings with warning card + type-to-confirm dialog (`DELETE`) for both coach and student settings pages.
- On successful deletion, client signs out and redirects to login; errors show destructive toast feedback.
- All data cleanup is handled by existing CASCADE / SET NULL foreign-key behavior after auth user deletion.
- Edge Function fix: replaced esm.sh import with jsdelivr CDN for supabase-js in delete-account function to fix bundle timeout on deploy
- Fixed delete account 401: added proper Authorization header with session JWT to Edge Function fetch call
- Fixed delete account 401 (part 2): added apikey header to Edge Function fetch call — Supabase gateway requires both Authorization and apikey headers
- Fixed QR code join flow: added /join route and JoinGroup page, handles auth redirect with pending token in sessionStorage, group lookup by qr_token, duplicate member check

### Excuse Status Constraint + Template Dialog Theme Fixes (2026-02-05)
- Excuse fix: added migration `20260205000001_add_excused_status.sql` to include `excused` in `task_instances` status CHECK constraint with defensive dynamic constraint discovery/drop + enum support.
- Verified `excuseTask` mutation payload in `useAssignments` sets `status: "excused"` and keeps `updated_at`/`updated_by`; `updated_by` exists in generated Supabase types for `task_instances`.
- Template dialog dark theme fix: added `coach-theme dark` class to preview and edit `DialogContent` in `Templates.tsx` so portal-rendered dialogs use coach dark tokens.
- Added `bg-secondary/30` to edit dialog task row cards for readability against dark dialog background.

### Manual Template Builder Redesign + Radix Sentinel Fix (2026-02-05)
- Manual Template Builder fix: replaced empty-string Select.Item values with sentinel strings to fix Radix crash, also fixed same pattern in RecurringSchedules.tsx. Redesigned task entry UI to card/blob layout with Add Task button. Removed due_time_offset_minutes from form. Priority stored in UI only (DB migration TODO).

### Coach Calendar Group Filter + Date Panel Fix (2026-02-05)
- Coach Calendar fix: added task_instances fetch filtered by selected group's members via group_members table, green dot indicators on dates with tasks, right panel groups tasks by name with student list underneath, removed redundant date-click modal on desktop (kept for mobile responsive view)

### Coach Calendar Task Date Rendering Fix (2026-02-05)
- Fixed coach calendar task loading bug where tasks were filtered out as orphaned due to stale `groupMap` state timing
- Replaced async `groupMap` state/effect with memoized derived map from `groups`
- Stabilized `fetchTasks` with `useCallback` and updated effect dependencies so calendar refetches with the correct group context

### Mobile Sidebar Auto-Close (2026-02-05)
- Fixed mobile sidebar: now closes automatically when a nav item is tapped

### Overview Roster Actions Restored (2026-02-05)
- Re-added "Remove Student" action to Overview tab student roster via row-level dropdown menu

### Documentation: Tasks Nav/Route Removal (2026-02-05)
- App.tsx: removed Tasks import and /dashboard/tasks route
- AppSidebar/CoachSidebar: removed Tasks nav items

### Student Dashboard Fixes (2026-02-05)
- Fixed overdue task card styling on student dashboard (improved contrast and readability)
- Fixed "New" badge on coach notes to disappear after student views the note

### Codex Context Handover Saved (2026-02-05)
- Added docs/codex-context.md with latest handover content
- Updated AGENTS.md required reads list

### Tasks Page Disconnected (2026-02-05)
- Removed Tasks nav item from CoachSidebar
- Removed /dashboard/tasks route from App.tsx
- Tasks.tsx file retained but disconnected

### Coach Dashboard Realtime Routing Fix (2026-02-05)
- Diagnosed route structure causing CoachDashboard to persist on /groups/:groupId
- Fixed routing so CoachDashboard unmounts on group detail navigation
- Added pathname guard to coach-tasks subscription enabled flag

### Realtime Hook Stabilization (2026-02-05)
- Fixed useRealtimeSubscription hook: stabilized queryKeysToInvalidate dependency to prevent subscription thrashing
- Documented all callers of useRealtimeSubscription (CoachDashboard, CoachCalendar)

### Group Detail Realtime Stability (2026-02-05)
- Fixed realtime subscription thrashing (separated subscription from data-fetch effect, used ref pattern for stable callback)

### Group Detail Realtime Stability (2026-02-05)
- Fixed realtime subscription thrashing in GroupDetail.tsx (stabilized useEffect dependencies with useCallback and serialized member IDs)

### Group Detail Crash Fix (2026-02-05)
- Fixed circular dependency crash in GroupDetail.tsx (ReferenceError: Cannot access before initialization)

### Auth Callback Hardening (2026-02-04)
- Full auth callback hardening shipped (see docs/auth-callback-hardening-summary.md)
- Metadata drift fixed for all users except one (self-heals on next login)

### Assign Task Modal Fix (2026-02-04)
- Fixed Radix Select crash: template dropdown used empty string value
- Changed to "none" sentinel value, clears template fields on selection

## In Progress

### Group Detail Restructure (2026-02-04)
- Tabs shell built with ?tab= routing (Overview | Tasks | Notes)
- Overview tab: student list, join code, delete group
- Tasks tab: placeholder
- Notes tab: migrated existing content
- Old group detail route removed (use /groups/${groupId})
- Fixed Dashboard and Tasks page navigation links to use /groups/${groupId}
- Tasks tab built: assign to group, assign to student, task instance list with status grouping
- Restructured GroupDetail: page-level assign button, gear menu for delete, Overview made read-only, actions consolidated to Tasks tab
- Tasks tab redesigned: grouped accordion view by task name, status filter, visual fixes for dark theme
- Fixed time validation in AssignTaskModal (comparison logic + re-validation on change)
- Added real-time subscription for task_instances on GroupDetail (coach sees student updates live)

## Planned
- Tasks tab build (assign modal integration, task list display)
- Notes tab build (compose + history)
- Recurring schedules (Daily/Weekly/Monthly/Custom)
- Template creation flow (AI builder + manual)
- Task edit/revoke functionality
- Minor cleanup (aria-describedby warning, PWA icon, remaining drift user)
