# Routine Craft Bot

## What This Is

A coach/student task management system built with React and Supabase. Coaches create task assignments with flexible scheduling, students complete tasks and track progress. Includes AI assistant for task planning, group management, and daily check-ins.

**v1 Reliability Hardening shipped 2026-01-25** — comprehensive error handling, test coverage, type safety, and code quality improvements.

## Core Value

Users can reliably complete their daily workflows (task assignment, task completion, group management) without encountering errors, crashes, or unexpected behavior.

## Current State

**Shipped: v1 Reliability Hardening (2026-01-25)**

Tech stack: React 18 + Vite + TypeScript + Tailwind + Supabase
Test coverage: 103 tests passing (hooks + components)
Type safety: TypeScript strict mode, 0 `as any` casts in src/
Error handling: React Error Boundaries + handleError utility (53 call sites)

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

### Active

## Current Milestone: v2.0 Performance

**Goal:** Optimize data fetching, rendering, and large dataset handling for faster, smoother user experience.

**Target features:**
- Full React Query migration (replace all useState/useEffect data fetching)
- Pagination for large lists (clients, check-ins, assignments)
- Memo optimization (React.memo, useMemo, useCallback for expensive renders)

### Out of Scope

| Feature | Reason |
|---------|--------|
| New features | Current focus is reliability/stability |
| UI redesign | Keep user experience identical for now |
| Mobile app | Web-first approach, PWA works |
| Offline support | Complex, defer to dedicated milestone |
| 100% test coverage | Diminishing returns; critical paths covered |

### v2 Candidates (Deferred)

**Performance:**
- React Query migration for data fetching
- Pagination for large datasets
- Memo optimization for re-renders

**Security:**
- Remove .env from git history
- Remove localStorage role tracking
- Rate limiting for QR validation

**Advanced Testing:**
- Integration tests for user flows
- E2E tests with Playwright
- Visual regression testing

## Context

**Codebase (post-v1):**
- 28,286 lines of TypeScript
- 103 tests (hooks + components)
- Zero `as any` casts
- 23 files using handleError utility
- 4 components with setTimeout cleanup

**Tech Debt (from v1):**
- CheckInModal not wired into application (tests exist)
- No explicit tests for setTimeout cleanup (verified by code review)
- Large components (CoachCalendar 1,661 lines) not refactored

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
| React Query for data fetching | Already installed, caching/dedup | — Deferred to v2 |

---
*Last updated: 2026-01-25 — v2.0 Performance milestone started*
