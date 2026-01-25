# Routine Craft Bot — Reliability Milestone

## What This Is

A comprehensive reliability hardening milestone for the Routine Craft Bot app — a coach/student task management system built with React and Supabase. This milestone addresses all concerns from the codebase audit: fixing known bugs, implementing consistent error handling, adding test coverage, and resolving security/performance issues. The goal is pre-launch confidence that the app won't break under real user load.

## Core Value

Users can reliably complete their daily workflows (task assignment, task completion, group management) without encountering errors, crashes, or unexpected behavior.

## Requirements

### Validated

<!-- Existing features that work (shipped in previous development) -->

- ✓ Coach can create and manage student groups — existing
- ✓ Coach can create task assignments with scheduling (once/daily/weekly/custom) — existing
- ✓ Coach can view student progress and task completion — existing
- ✓ Student can view assigned tasks and mark complete — existing
- ✓ Student can join groups via class code or QR — existing
- ✓ User can authenticate via email/password or Google OAuth — existing
- ✓ AI assistant can generate task plans and provide chat support — existing
- ✓ Daily check-in modal for student sentiment tracking — existing
- ✓ Template system for reusable task sequences — existing

### Active

<!-- Current scope: reliability improvements -->

**Error Handling & User Experience:**
- [ ] Implement React Error Boundary to prevent full-app crashes
- [ ] Create consistent error handling utility (toast + log + retry pattern)
- [ ] Add loading states to all async operations
- [ ] Fix JWT error handling — show explicit messages instead of silent fallback
- [ ] Improve AI assistant timeout handling with retry logic

**Test Coverage:**
- [ ] Set up Vitest testing framework with React Testing Library
- [ ] Add unit tests for utility functions (safeParseISO, safeFormatDate, cn)
- [ ] Add tests for critical hooks (useAuth, useAssignments, useGroups)
- [ ] Add component tests for core user flows

**Bug Fixes & Code Quality:**
- [ ] Fix memory leaks from setTimeout/setInterval without cleanup
- [ ] Fix type safety — replace `as any` casts with proper Supabase types
- [ ] Fix date handling edge cases and timezone issues
- [ ] Address race conditions in task status updates

**Security Hardening:**
- [ ] Remove .env from git history and rotate exposed keys
- [ ] Remove localStorage role tracking — use server-side role verification
- [ ] Add rate limiting awareness for QR token validation

**Performance:**
- [ ] Implement React Query for data fetching (caching, deduplication)
- [ ] Add pagination for large datasets (tasks, groups)
- [ ] Optimize re-renders in calendar/task list views with memo

### Out of Scope

- New features — this milestone is stability-only
- UI changes — keep user-facing behavior identical
- Mobile-specific optimizations — defer to future milestone
- Offline support — defer to future milestone (remove PWA claims if not implementing)
- Refactoring large components — defer unless needed for testing

## Context

**Codebase State:**
- React 18 + Vite + TypeScript + Tailwind
- Supabase for auth, database, and edge functions
- Zero test coverage currently
- 76 try-catch blocks with inconsistent error handling
- 32 `as any` type casts masking potential runtime errors
- Several large components (1000+ lines) that are hard to test

**Key Files from Codebase Audit:**
- `src/hooks/useAssignments.ts` (570 lines) — complex scheduling logic
- `src/hooks/useAIAssistant.ts` — 20s timeout, no retry
- `src/components/CheckInModal.tsx` — JWT errors silently ignored
- `src/pages/CoachCalendar.tsx` (1,661 lines) — calendar with task editing
- `.planning/codebase/CONCERNS.md` — full audit of issues

**Trigger:** Pre-launch hardening before onboarding more users.

## Constraints

- **UI Freeze**: Keep all user-facing behavior identical — changes should be invisible to users
- **Backward Compatibility**: Don't break existing Supabase functions or database schema
- **Minimal Dependencies**: Prefer fixing with existing tools over adding new packages (except test framework)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Vitest over Jest | Vite-native, faster, better ESM support | — Pending |
| React Query for data fetching | Already installed, provides caching/deduplication | — Pending |
| Address all CONCERNS.md issues | Comprehensive hardening as requested | — Pending |

---
*Last updated: 2026-01-24 after initialization*
