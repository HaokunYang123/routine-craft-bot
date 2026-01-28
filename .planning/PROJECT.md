# Routine Craft Bot

## What This Is

A coach/student task management system built with React and Supabase. Coaches create task assignments with flexible scheduling, students complete tasks and track progress. Includes AI assistant for task planning, group management, and daily check-ins.

**v2.0 Performance shipped 2026-01-28** — React Query migration, optimistic updates, pagination, and render optimization for faster, smoother UX.

## Core Value

Users can reliably complete their daily workflows (task assignment, task completion, group management) without encountering errors, crashes, or unexpected behavior — with instant feedback and smooth performance.

## Current State

**Shipped: v2.0 Performance (2026-01-28)**

Tech stack: React 18 + Vite + TypeScript + Tailwind + Supabase + React Query
Test coverage: 240 tests passing (hooks + components)
Type safety: TypeScript strict mode, 0 `as any` casts in src/
Data layer: React Query with 5-min caching, optimistic updates, infinite scroll
Error handling: React Error Boundaries + handleError utility + global query error handling

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

### Active

(Ready for next milestone planning)

### Out of Scope

| Feature | Reason |
|---------|--------|
| New features | Current focus is reliability/stability |
| UI redesign | Keep user experience identical for now |
| Mobile app | Web-first approach, PWA works |
| Offline support | Complex, defer to dedicated milestone |
| 100% test coverage | Diminishing returns; critical paths covered |

### v2.1 Candidates (Deferred)

**Performance Advanced:**
- Prefetching on hover (near-instant navigation)
- Suspense integration (cleaner loading states)
- Virtualized lists for 1000+ items
- Code-splitting for heavy components

**Security:**
- Remove .env from git history
- Remove localStorage role tracking
- Rate limiting for QR validation

**Advanced Testing:**
- Integration tests for user flows
- E2E tests with Playwright
- Visual regression testing

## Context

**Codebase (post-v2.0):**
- 33,935 lines of TypeScript
- 240 tests (hooks + components)
- Zero `as any` casts
- 6 hooks migrated to React Query
- Query key factory with hierarchical keys for all entities
- Infinite scroll pagination on People page
- CoachCalendar optimized with React.memo and useCallback

**Tech Debt (from v1, carried forward):**
- CheckInModal not wired into application (tests exist)
- No explicit tests for setTimeout cleanup (verified by code review)

## Constraints

- **UI Freeze**: Keep user-facing behavior identical
- **Backward Compatibility**: Don't break Supabase functions/schema
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

---
*Last updated: 2026-01-28 after v2.0 milestone*
