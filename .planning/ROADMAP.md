# Roadmap: Routine Craft Bot Reliability Milestone

## Overview

This roadmap delivers comprehensive reliability hardening for the Routine Craft Bot app before launch. The journey follows a foundation-first approach: establish error boundaries and consistent error handling patterns, then build testing infrastructure, fix type safety issues, address memory leaks and code quality, and finally write tests for hooks and components. This sequencing ensures each phase builds on validated foundations rather than testing broken code.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Error Foundation** - React Error Boundary and error handling utility ✓
- [x] **Phase 2: Error Completion** - Loading states, JWT handling, AI retry logic ✓
- [x] **Phase 3: Test Infrastructure** - Vitest setup with mocks and test utilities ✓
- [ ] **Phase 4: Utility Tests** - Tests for pure utility functions
- [ ] **Phase 5: Type Safety** - Regenerate Supabase types, eliminate `as any` casts
- [ ] **Phase 6: Code Quality** - Memory leak fixes and structured logging
- [ ] **Phase 7: Hook Tests** - Tests for critical business logic hooks
- [ ] **Phase 8: Component Tests** - Tests for core user-facing components

## Phase Details

### Phase 1: Error Foundation
**Goal**: Users never see a blank screen from uncaught errors; errors are handled consistently throughout the app
**Depends on**: Nothing (first phase)
**Requirements**: ERR-01, ERR-02
**Success Criteria** (what must be TRUE):
  1. App renders fallback UI when any component throws an error (instead of blank screen)
  2. Errors display user-friendly toast messages with actionable recovery options
  3. All error events are logged with structured context (component, user action, timestamp)
  4. Error boundaries exist at app root and route level for granular error containment
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md - React Error Boundary implementation (ErrorFallback, AppErrorBoundary, Sonner config) ✓
- [x] 01-02-PLAN.md - Error handling utility with toast + log + retry pattern ✓

### Phase 2: Error Completion
**Goal**: All async operations provide clear feedback; JWT and AI errors are handled gracefully
**Depends on**: Phase 1 (uses error utility)
**Requirements**: ERR-03, ERR-04, ERR-05
**Success Criteria** (what must be TRUE):
  1. All buttons and forms show loading indicators during async operations
  2. Data fetching displays skeleton/spinner states
  3. JWT expiry shows explicit "Session expired" message with re-login prompt
  4. AI assistant retries failed requests with exponential backoff before showing error
  5. AI timeout errors suggest reducing request scope (not just generic failure)
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — LoadingButton component and skeleton placeholders for data loading ✓
- [x] 02-02-PLAN.md — SessionExpiredModal with Supabase auth event detection ✓
- [x] 02-03-PLAN.md — AI assistant retry logic with exponential backoff and cancel support ✓
- [x] 02-04-PLAN.md — Component adoption (LoadingButton in auth forms, skeletons in dashboards) ✓

### Phase 3: Test Infrastructure
**Goal**: Testing framework is configured and validated; mock utilities enable testing Supabase-dependent code
**Depends on**: Nothing (can run after Phase 1, parallelizable with Phase 2)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. `npm test` runs Vitest with React Testing Library successfully
  2. `npm run test:coverage` reports code coverage metrics
  3. `npm run test:watch` enables development-time test watching
  4. Supabase mock factory supports full method chaining (from/select/eq/order/single)
  5. Test utilities provide wrapped render with all providers (Router, QueryClient, Toast)
  6. At least one utility test passes, validating the entire setup
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Vitest configuration with jsdom and React Testing Library ✓
- [x] 03-02-PLAN.md — Supabase mock factory with method chaining ✓
- [x] 03-03-PLAN.md — Test utilities (providers wrapper, data factories, validation test) ✓

### Phase 4: Utility Tests
**Goal**: Pure utility functions have comprehensive test coverage, validating test infrastructure works
**Depends on**: Phase 3 (requires test infrastructure)
**Requirements**: UTIL-01, UTIL-02, UTIL-03
**Success Criteria** (what must be TRUE):
  1. safeParseISO handles valid ISO strings, invalid strings, null, and undefined
  2. safeFormatDate formats valid dates, returns fallback for invalid, accepts custom fallback
  3. cn() merges class names correctly and resolves Tailwind conflicts
  4. All utility tests pass in CI environment
**Plans**: TBD

Plans:
- [ ] 04-01: Date utility tests (safeParseISO, safeFormatDate)
- [ ] 04-02: Class name utility tests (cn)

### Phase 5: Type Safety
**Goal**: TypeScript catches Supabase query errors at compile time; no runtime type surprises
**Depends on**: Nothing (can run in parallel with Phases 3-4)
**Requirements**: TYPE-01, TYPE-02, TYPE-03, TYPE-04
**Success Criteria** (what must be TRUE):
  1. Supabase types match current database schema (regenerated)
  2. No `as any` casts remain in hook files
  3. No `as any` casts remain in component files
  4. RPC function calls have typed request and response signatures
  5. TypeScript strict mode passes with no type errors
**Plans**: TBD

Plans:
- [ ] 05-01: Regenerate Supabase types from schema
- [ ] 05-02: Replace `as any` casts in hooks with proper types
- [ ] 05-03: Replace `as any` casts in components with proper types
- [ ] 05-04: Type RPC function signatures

### Phase 6: Code Quality
**Goal**: No memory leaks from timers; errors logged with structure for debugging
**Depends on**: Phase 1 (structured logging uses error utility patterns)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05
**Success Criteria** (what must be TRUE):
  1. sketch.tsx setTimeout cleanup in useEffect
  2. MagicScheduleButton.tsx setTimeout cleanup in useEffect
  3. StudentSchedule.tsx setTimeout cleanup in useEffect
  4. StickerBook.tsx setTimeout cleanup in useEffect
  5. console.error calls replaced with structured logging utility
  6. Log entries include context (component, action, user ID when available)
**Plans**: TBD

Plans:
- [ ] 06-01: Memory leak fixes (setTimeout cleanup in 4 files)
- [ ] 06-02: Structured logging utility and migration

### Phase 7: Hook Tests
**Goal**: Critical business logic hooks have comprehensive test coverage
**Depends on**: Phase 3 (test infrastructure), Phase 5 (type safety for accurate mocks)
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):
  1. useAuth tests cover loading, authenticated, unauthenticated, and error states
  2. useAuth tests verify session persistence across page refreshes
  3. useAssignments tests cover CRUD operations (create, read, update, delete)
  4. useAssignments tests verify scheduling logic (once, daily, weekly, custom)
  5. useGroups tests cover group creation and member management
  6. useAIAssistant tests verify timeout handling and retry behavior
**Plans**: TBD

Plans:
- [ ] 07-01: useAuth tests (auth flow states)
- [ ] 07-02: useAssignments tests (CRUD and scheduling)
- [ ] 07-03: useGroups tests (group management)
- [ ] 07-04: useAIAssistant tests (timeout and retry)

### Phase 8: Component Tests
**Goal**: Core user-facing components have behavior tests
**Depends on**: Phase 7 (hooks tested before components that use them)
**Requirements**: COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. ProtectedRoute redirects unauthenticated users to login
  2. ProtectedRoute allows authenticated users to access protected content
  3. ProtectedRoute shows loading state during auth check
  4. CheckInModal allows sentiment selection and submission
  5. CheckInModal shows success feedback after submission
  6. Dashboard components render correct data and respond to user interactions
**Plans**: TBD

Plans:
- [ ] 08-01: ProtectedRoute tests (auth flow)
- [ ] 08-02: CheckInModal tests (user interaction)
- [ ] 08-03: Dashboard component tests

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
(Phases 3-4 and 5-6 can potentially run in parallel based on dependencies)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Error Foundation | 2/2 | ✓ Complete | 2026-01-24 |
| 2. Error Completion | 4/4 | ✓ Complete | 2026-01-25 |
| 3. Test Infrastructure | 3/3 | ✓ Complete | 2026-01-25 |
| 4. Utility Tests | 0/2 | Not started | - |
| 5. Type Safety | 0/4 | Not started | - |
| 6. Code Quality | 0/2 | Not started | - |
| 7. Hook Tests | 0/4 | Not started | - |
| 8. Component Tests | 0/3 | Not started | - |

**Total:** 9/24 plans complete

---
*Roadmap created: 2026-01-24*
*Phase 1 planned: 2026-01-24*
*Phase 2 planned: 2026-01-25*
*Phase 3 planned: 2026-01-25*
*Milestone: Reliability Hardening*
