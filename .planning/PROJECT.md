# TeachCoachConnect

## What This Is

A coach/student task management system built with React and Supabase. Coaches create task assignments with flexible scheduling, students complete tasks and track progress. Features Google OAuth authentication, realtime sync between coach and student views, and timezone-aware task scheduling.

**v4.0 Bug Fixes & Polish shipped 2026-01-31** — UI fixes, task rollover logic, form simplification, OAuth cleanup, and E2E testing infrastructure.

## Core Value

Users can reliably complete their daily workflows (task assignment, task completion, group management) without encountering errors, crashes, or unexpected behavior — with instant feedback, smooth performance, and accurate timezone handling.

## Current State

**Shipped: v4.0 Bug Fixes & Polish (2026-01-31)**

Tech stack: React 18 + Vite + TypeScript + Tailwind + Supabase + React Query
Test coverage: 285 tests passing (hooks + components + E2E infrastructure)
Type safety: TypeScript strict mode, 0 `as any` casts in src/
Data layer: React Query with 5-min caching, optimistic updates, infinite scroll
Auth: Google OAuth only with role selection landing page
Realtime: Supabase Realtime with React Query cache invalidation
Timezone: User-selectable timezone with UTC storage, day boundary detection
Task rollover: Today/overdue/yesterday sections with cross-tab session sync
E2E testing: Playwright with Page Objects, GitHub Actions CI

**Codebase:**
- 35,814 lines of TypeScript
- 23 phases completed (66 plans total)
- 4 milestones shipped (v1, v2.0, v3.0, v4.0)

## Requirements

### Validated

**Core Features (pre-v1):**
- ✓ Coach can create and manage student groups
- ✓ Coach can create task assignments with scheduling (once/daily/weekly/custom)
- ✓ Coach can view student progress and task completion
- ✓ Student can view assigned tasks and mark complete
- ✓ Student can join groups via class code or QR
- ✓ User can authenticate via email/password or Google OAuth
- ✓ AI assistant can generate task plans and provide chat support
- ✓ Daily check-in modal for student sentiment tracking
- ✓ Template system for reusable task sequences

**v1 Reliability (2026-01-25):**
- ✓ React Error Boundary prevents full-app crashes — v1
- ✓ Consistent error handling utility (toast + log + retry) — v1
- ✓ Loading states for all async operations — v1
- ✓ JWT error handling with explicit messaging — v1
- ✓ AI assistant retry logic with exponential backoff — v1
- ✓ Vitest + React Testing Library configured — v1
- ✓ Tests for utility functions (safeParseISO, safeFormatDate, cn) — v1
- ✓ Tests for hooks (useAuth, useAssignments, useGroups, useAIAssistant) — v1
- ✓ Tests for components (ProtectedRoute, CheckInModal, Dashboard) — v1
- ✓ Memory leak fixes (setTimeout cleanup) — v1
- ✓ Type safety (Supabase types, strict mode, no `as any`) — v1
- ✓ Structured logging (handleError in 23 files) — v1

**v2.0 Performance (2026-01-28):**
- ✓ React Query migration for 6 data hooks — v2.0
- ✓ 5-minute caching with background refetch on window focus — v2.0
- ✓ Optimistic updates for instant task completion feedback — v2.0
- ✓ Error rollback when mutations fail — v2.0
- ✓ Cursor-based infinite scroll pagination for People page — v2.0
- ✓ Page size selector (10/25/50) with localStorage persistence — v2.0
- ✓ Content-shaped loading skeletons with shimmer animation — v2.0
- ✓ LoadingButton with extended timeout text — v2.0
- ✓ React.memo for CoachCalendar sub-components — v2.0
- ✓ useCallback for stable event handler references — v2.0
- ✓ O(1) Map-based task lookups in calendar — v2.0
- ✓ Performance profiling infrastructure — v2.0
- ✓ 240 tests passing (137 new) — v2.0

**v3.0 Auth & Realtime (2026-01-30):**
- ✓ Role selection landing page with "I am a Coach" / "I am a Student" — v3.0
- ✓ Google OAuth only for all users — v3.0
- ✓ Database trigger `handle_new_user` for atomic profile creation — v3.0
- ✓ Role passed via OAuth redirect URL (survives redirect) — v3.0
- ✓ Role-based routing that queries database (not local state) — v3.0
- ✓ Remove email/password login — v3.0
- ✓ Remove login-via-code (keep for class joining) — v3.0
- ✓ Supabase Realtime subscriptions for task completions — v3.0
- ✓ Supabase Realtime subscriptions for new assignments — v3.0
- ✓ React Query cache invalidation on realtime events — v3.0
- ✓ Timezone handling: store UTC, display local time — v3.0
- ✓ Daily rollover logic at user's local midnight — v3.0
- ✓ User-selectable timezone in settings — v3.0
- ✓ Emergency logout buttons on error pages — v3.0

**v4.0 Bug Fixes & Polish (2026-01-31):**
- ✓ Fix color picker double-dot in Create Group modal — v4.0
- ✓ Remove empty state "No group yet" button — v4.0
- ✓ Remove Delete Account from student settings — v4.0
- ✓ Consistent three-box layout (My Group, Tasks to Do, Coach's Notes) — v4.0
- ✓ Color-coded dashboard boxes — v4.0
- ✓ Task rollover: completed tasks gone next day — v4.0
- ✓ Task rollover: daily tasks show correct state — v4.0
- ✓ Remove duplicate start/due date in task assignment — v4.0
- ✓ Remove Change Password UI/backend — v4.0
- ✓ Remove 2FA UI/backend — v4.0
- ✓ Remove Download Data UI/backend — v4.0
- ✓ Supabase scalability audit (100+ users) — v4.0
- ✓ E2E tests with Playwright — v4.0

### Active

(None — planning next milestone)

### Out of Scope

| Feature | Reason |
|---------|--------|
| Custom OAuth domain branding | GoDaddy access pending, defer to later |
| Mobile app | Web-first approach, PWA works |
| Offline support | Complex, defer to dedicated milestone |
| 100% test coverage | Diminishing returns; critical paths covered |
| One user with multiple roles | Will never happen per user requirement |
| Server-side daily rollover | Client-side calculation is simpler, no cron needed |

### Future Candidates (Deferred)

**Performance Advanced:**
- Prefetching on hover (near-instant navigation)
- Suspense integration (cleaner loading states)
- Virtualized lists for 1000+ items
- Code-splitting for heavy components

**Realtime Advanced:**
- Presence indicators ("User X is online")
- Typing indicators for chat/comments

**Timezone Advanced:**
- Multi-timezone classroom support (coach views student times in student's timezone)

**Security:**
- Remove .env from git history
- Rate limiting for QR validation

**Advanced Testing:**
- Integration tests for user flows
- E2E tests with Playwright
- Visual regression testing

## Context

**Tech Debt (accumulated):**
- CheckInModal not wired into application (tests exist)
- Pre-existing test failure in useProfile.test.tsx (role assertion)
- 2 test failures in useGroups.test.tsx (deleteGroup cache invalidation)
- Custom domain DNS pending (teachcoachconnect.com needs GoDaddy A record)
- Student pages use inline subscriptions instead of useRealtimeSubscription hook

## Constraints

- **Fresh Start**: No existing users to migrate (clean slate for auth)
- **Google Only**: Single auth provider simplifies flow
- **Backward Compatibility**: Don't break existing Supabase data schema
- **Minimal Dependencies**: Prefer existing tools over new packages

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Vitest over Jest | Vite-native, faster, better ESM | ✓ Good — 103 tests run in 1.9s |
| Two-level error boundaries | Root + route for granular containment | ✓ Good — users never see blank screens |
| AI retry: 1s, 2s, 4s backoff | Balance responsiveness with server load | ✓ Good — transparent to users |
| Only retry transient errors | Fail fast on auth/rate-limit (4xx) | ✓ Good — clear error messages |
| Tables<'name'> type helper | Supabase convention for row types | ✓ Good — consistent typing |
| Map for concurrent timeouts | StudentSchedule has per-task animations | ✓ Good — no memory leaks |
| Dynamic vi.mock imports | Workaround for hoisting issues | ✓ Good — tests pass reliably |
| React Query for data fetching | Already installed, caching/dedup | ✓ Good — v2.0 shipped |
| 5-min staleTime | Balance API calls vs freshness | ✓ Good — navigation feels instant |
| Optimistic task updates | Instant checkbox feedback | ✓ Good — responsive UX |
| Cursor-based pagination | Stable ordering with concurrent inserts | ✓ Good — handles large lists |
| React.memo for sub-components | Reduce parent re-render propagation | ✓ Good — calendar smoother |
| Map-based task lookup | O(1) vs O(n) filtering per date | ✓ Good — month view faster |
| Google OAuth only | Simplifies auth, one provider | ✓ Good — v3.0 shipped |
| Role via redirectTo URL | Survives OAuth redirect | ✓ Good — reliable role passing |
| Database trigger for profile | Atomic creation, zero latency | ✓ Good — no race conditions |
| invalidateQueries for realtime | Simpler than setQueryData | ✓ Good — consistent cache |
| Denormalized coach_id | Realtime filter requires direct column | ✓ Good — events delivered |
| IANA timezone names | Handles DST automatically | ✓ Good — correct times |
| Simplified timezone selector | User feedback: too many options | ✓ Good — 6 US timezones |

---
*Last updated: 2026-01-31 after v4.0 milestone shipped*
