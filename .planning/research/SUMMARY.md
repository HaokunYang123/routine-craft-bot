# Project Research Summary

**Project:** Routine Craft Bot - Testing and Reliability
**Domain:** React 18 + Vite + Supabase Application Testing Infrastructure
**Researched:** 2026-01-24
**Confidence:** HIGH

## Executive Summary

This project aims to retrofit comprehensive testing and reliability hardening to an existing React 18 + Vite + Supabase application with zero current test coverage. The research reveals a clear path forward: establish a Vitest-based testing infrastructure with React Testing Library, implement a layered error handling strategy, and address type safety issues systematically. The codebase's hook-centric architecture is actually an advantage — the business logic is concentrated in 5-6 critical hooks (useAuth, useAssignments, useGroups) that can be tested in isolation with high ROI.

The recommended approach prioritizes foundation-first: error boundaries and consistent error handling utilities before writing tests, followed by testing utilities and hooks (highest business logic density), then components (user-facing behavior), and finally integration flows. This sequencing avoids the classic pitfall of testing implementation details in large components. The key insight from codebase analysis is that 76 inconsistent try-catch blocks and 32 `as any` type casts represent both the problem (unreliable error handling, bypassed type safety) and the solution opportunity (standardize patterns through testing).

Critical risks include: (1) mocking Supabase at the wrong level — must mock at network boundary or use MSW to catch query construction bugs, (2) async test timing failures due to multiple useEffect patterns — requires comprehensive waitFor usage, (3) testing large components monolithically — must extract and test hooks first. Mitigation: establish shared test utilities and patterns document before writing any tests, create typed mock factories to prevent type-unsafe mocks, and follow a phased implementation that builds on tested foundations.

## Key Findings

### Recommended Stack

The standard 2025 testing stack for Vite projects is Vitest (Vite-native test runner), React Testing Library (official React recommendation), and MSW (network-level mocking). This provides excellent DX for Vite projects through shared config, automatic path alias resolution, and Jest-compatible API for easy migration. For production error handling, react-error-boundary is the mature choice over hand-rolled solutions.

**Core technologies:**
- **Vitest ^2.x**: Test runner with native Vite integration — shares transforms, config, and HMR
- **React Testing Library ^16.x**: Component testing focused on user behavior — official React team recommendation
- **MSW ^2.x**: Network request mocking at HTTP layer — tests real Supabase client instead of mocking it
- **jsdom ^24.x**: DOM simulation for component tests — start with this, consider happy-dom for CI speed later
- **react-error-boundary ^4.x**: Production error boundaries — simpler and better-tested than custom solutions
- **@vitest/coverage-v8 ^2.x**: Code coverage with V8-native instrumentation — faster than Istanbul

**Critical insight:** Mock Supabase at the network level with MSW rather than mocking the client. This catches bugs in query construction that client mocks miss. The existing codebase uses `.from().select().eq().order()` chaining extensively — MSW intercepts the actual HTTP POST to `/rest/v1/[table]`, validating the entire chain.

### Expected Features

**Must have (table stakes):**
- **Error Boundary** — prevents full-app crashes from single component errors (currently missing, React 18 standard)
- **Consistent Error Handling** — standardize the 76 inconsistent try-catch blocks with toast + log + retry utility
- **Type Safety** — eliminate 32 `as any` casts by generating Supabase types and using strict TypeScript
- **Loading States** — comprehensive loading feedback for all async operations (partially missing)
- **Auth Session Management** — handle JWT expiry gracefully (currently silent failures)
- **Memory Leak Prevention** — cleanup for setTimeout in sketch.tsx, MagicScheduleButton, StudentSchedule, StickerBook
- **Request Timeout + Retry** — exponential backoff for transient failures (especially AI assistant, current 20s timeout)

**Should have (competitive):**
- **React Query Integration** — already installed but unused; enables caching, deduplication, background refetch
- **Offline Detection** — Navigator.onLine + visual indicator to warn when actions will fail
- **Request Deduplication** — prevent double-submission especially for task creation
- **Retry UI** — "Try Again" buttons on failed operations instead of silent failure
- **Optimistic Updates with Rollback** — especially for task status changes (not currently implemented)

**Defer (v2+):**
- **Graceful Degradation** — app works with reduced functionality when API down (high complexity, low immediate value)
- **Performance Monitoring** — track slow renders and API calls (optimization is separate concern from reliability)
- **Comprehensive Telemetry** — focus on error tracking only initially; defer analytics
- **E2E Tests for Everything** — unit/integration for logic; E2E for 3-5 critical paths only

**Anti-features to avoid:**
- Global error toast for every API call (noise) — only toast user-initiated actions
- Retrying non-transient errors like 401/403 — categorize errors properly
- Complex offline sync/PWA queue — simple offline banner is sufficient
- Custom logging framework — use Sentry/LogRocket/Supabase built-in
- 100% test coverage — focus on critical paths, 60-70% is realistic

### Architecture Approach

The test architecture prioritizes colocated tests for maintainability, a layered mock strategy for Supabase, and phased implementation that builds infrastructure incrementally. The hooks (useAssignments at 570 lines, useGroups, useAuth) are the critical layer containing business logic and Supabase interactions — testing these thoroughly provides highest value with lowest complexity compared to testing large page components directly.

**Major components:**
1. **Test Infrastructure** (`src/__tests__/setup.ts`, `src/__mocks__/supabase.ts`) — shared utilities, mock factory pattern for Supabase client chaining
2. **Utility Tests** (`src/lib/utils.test.ts`) — pure functions (date parsing, cn, formatters) with zero dependencies
3. **Hook Tests** (colocated `*.test.ts`) — business logic layer using renderHook with proper async handling
4. **Component Tests** (colocated `*.test.tsx`) — feature components testing user behavior, NOT shadcn/ui primitives
5. **Integration Tests** (`src/__tests__/integration/`) — cross-cutting flows like assignment creation

**Data flow:** User Action → Page Component (test indirectly) → Feature Hooks (PRIMARY TEST TARGET) → Supabase Client (MOCK HERE) → DB (not in unit tests). Large page components (CoachCalendar at 62KB) are "glue code" tested through their constituent hooks and sub-components.

**Mock strategy:** Create type-safe mock factory for Supabase that supports method chaining. Use `createSupabaseMock()` pattern with exposed `_chain` for assertions and `_resetMocks()` for cleanup. Per-test setup configures mock return values. Alternative: MSW for network-level interception of actual PostgREST API calls.

### Critical Pitfalls

1. **Testing Implementation Details Instead of Behavior** — tests break on every refactor when asserting internal state like `setStats` calls. Prevention: test what users observe (screen.getByText), not how it works. Establish patterns document in Phase 1.

2. **Mocking Supabase at Wrong Level** — mocking every method is brittle, mocking entire client misses real API behavior. The 32 `as any` casts mean mocks won't catch type errors. Prevention: mock at network boundary with MSW, or create type-safe factory that returns exact Supabase response shapes ({ data: null } for .single(), not []).

3. **Async Test Timing Failures (act warnings)** — useAuth has 3 state updates in subscription + getSession. Tests that don't use waitFor see intermittent failures. Prevention: always use waitFor for async state, renderHook for hooks, cleanup subscriptions.

4. **Testing Large Components Monolithically** — Tasks.tsx at 900+ lines would create 500+ line test file with massive mock setup. Prevention: extract utilities, test hooks in isolation, test component slices (AssignmentDialog separately), avoid testing entire pages.

5. **Type-Unsafe Mocks** — using `as any` on mocks defeats TypeScript, creating false confidence. Prevention: create typed mock factories with Partial overrides, enforce correct shapes match RecurringSchedule, Assignment, etc.

**Additional critical pitfalls:**
- **Auth edge cases not tested** — token expiry, logout cleanup, loading/authenticated/unauthenticated states
- **Toast testing requires provider** — must wrap in ToastProvider, use waitFor for animations
- **Navigation breaks without router** — useNavigate throws "outside Router"; use MemoryRouter or mock
- **RPC functions blindspot** — 6 RPC calls (validate_qr_token, generate_recurring_tasks, etc.) cast to `any`; mock shapes may not match DB function behavior
- **React Query cache pollution** — create fresh QueryClient per test with retry: false, gcTime: 0

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order: error handling foundation → testing infrastructure → hook tests → component tests → integration. This avoids rework from testing components before their hook dependencies are validated.

### Phase 1: Error Handling Foundation (Week 1, Low-Medium Complexity)
**Rationale:** Must establish error boundaries before any other reliability work. Without this, errors in subsequent features crash the app. Error handling utility enables consistent patterns for all subsequent error scenarios.

**Delivers:**
- React error boundary at app root + route level with fallback UI
- Standardized error handling utility (toast + log + optional retry)
- Structured logging service integration (replace console.error)

**Addresses (from FEATURES.md):**
- Error Boundary (table stakes, currently missing)
- Consistent Error Handling (76 try-catch blocks to standardize)
- Structured Logging (production debugging foundation)

**Avoids (from PITFALLS.md):**
- Testing without error boundaries (Pitfall 1) — establishes patterns before tests
- Inconsistent error patterns that make testing harder

**Research flag:** No deeper research needed — established React 18 patterns, well-documented.

### Phase 2: Testing Infrastructure (Week 1, Low Complexity)
**Rationale:** Prerequisite for all subsequent test phases. Vitest setup validates with simple utility tests before tackling complex hooks. Supabase mock factory is critical blocker for hook tests.

**Delivers:**
- Vitest + React Testing Library configuration
- Test setup file with jsdom, cleanup, global mocks
- Supabase mock factory supporting method chaining
- Test data factories (createMockUser, createMockGroup, createMockAssignment)
- Router wrapper for navigation testing
- Utility function tests (utils.test.ts) as validation

**Uses (from STACK.md):**
- Vitest ^2.x as test runner
- @testing-library/react ^16.x for component testing
- jsdom ^24.x for DOM simulation
- MSW ^2.x for network mocking (optional, defer if complex)

**Implements (from ARCHITECTURE.md):**
- Test Infrastructure component
- Typed mock factory pattern
- Colocated test structure

**Avoids (from PITFALLS.md):**
- Mocking Supabase incorrectly (Pitfall 2) — establish correct pattern upfront
- Type-unsafe mocks (Pitfall 5) — create typed factories from start
- React Query cache issues (Pitfall 10) — configure fresh client per test

**Research flag:** No deeper research needed — Vitest patterns are well-established for Vite projects.

### Phase 3: Type Safety Hardening (Week 2, High Complexity)
**Rationale:** Generate Supabase types before writing hook tests. The 32 `as any` casts will cause type errors in tests that would be caught at build time. Fixing types first makes tests more valuable.

**Delivers:**
- Generated TypeScript types from Supabase schema
- Elimination of 32 `as any` casts
- Type-safe Supabase client usage throughout codebase
- Typed RPC function signatures

**Addresses (from FEATURES.md):**
- Type Safety (table stakes) — prevents runtime errors that tests should catch

**Avoids (from PITFALLS.md):**
- Type-unsafe mocks defeating TypeScript (Pitfall 5)
- RPC testing blindspots from `as any` casts (Pitfall 9)

**Research flag:** May need `/gsd:research-phase` if Supabase type generation has issues. RPC function typing may require schema analysis.

### Phase 4: Hook Testing (Week 2, Medium Complexity)
**Rationale:** Hooks contain 80% of business logic. Testing useAuth, useAssignments (570 lines), useGroups provides highest ROI. These are isolated units that can be tested with renderHook once mock factory exists.

**Delivers:**
- useAuth.test.ts — auth flow + session management + edge cases
- useProfile.test.ts — profile CRUD operations
- useGroups.test.ts — group management
- useAssignments.test.ts — complex scheduling logic, highest value
- useAIAssistant.test.ts — error-prone timeout handling
- useTemplates.test.ts — deferred table creation handling

**Addresses (from FEATURES.md):**
- Auth Session Management — test JWT expiry, logout cleanup
- Loading States — verify hooks show loading correctly
- Request Timeout + Retry — test AI assistant timeout scenarios

**Avoids (from PITFALLS.md):**
- Testing implementation details (Pitfall 1) — focus on hook return values, not internals
- Async timing failures (Pitfall 3) — comprehensive waitFor usage
- Auth edge cases not tested (Pitfall 6) — test matrix of states
- Testing large components first (Pitfall 4) — hooks before components

**Research flag:** Standard React Testing Library patterns. Possibly need deeper research on testing Supabase subscriptions (onAuthStateChange).

### Phase 5: Memory Leak Prevention (Week 2, Medium Complexity)
**Rationale:** Can run in parallel with Phase 4. Four identified setTimeout leaks need useEffect cleanup. Tests verify cleanup happens.

**Delivers:**
- Fix setTimeout leaks in sketch.tsx, MagicScheduleButton, StudentSchedule, StickerBook
- useEffect cleanup tests
- Subscription cleanup verification

**Addresses (from FEATURES.md):**
- Memory Leak Prevention (table stakes)

**Avoids (from PITFALLS.md):**
- Async test timing failures from uncleaned subscriptions

**Research flag:** No research needed — standard useEffect cleanup pattern.

### Phase 6: Component Testing (Week 3, Medium Complexity)
**Rationale:** Test user-facing behavior after hooks are validated. Focus on feature components, not shadcn/ui primitives. ProtectedRoute and CheckInModal are high-value targets.

**Delivers:**
- ProtectedRoute.test.tsx — auth flow integration
- CheckInModal.test.tsx — user interaction patterns
- Key dashboard component tests
- Loading state component tests

**Addresses (from FEATURES.md):**
- Loading States — visible skeleton UI behavior
- Retry UI — "Try Again" button interactions

**Avoids (from PITFALLS.md):**
- Testing shadcn/ui components (Pitfall 11) — skip src/components/ui/*
- Over-mocking Radix primitives — test real Dialog, Select, etc.
- Toast testing incorrectly (Pitfall 7) — use ToastProvider wrapper
- Navigation testing issues (Pitfall 8) — use MemoryRouter
- Not testing loading states (Pitfall 13)

**Research flag:** No research needed — React Testing Library component patterns are standard.

### Phase 7: React Query Migration (Week 3-4, Medium Complexity)
**Rationale:** React Query already installed but unused. Migrating from raw useEffect enables caching, deduplication, stale-while-revalidate. Do after hooks are tested so migration can be validated.

**Delivers:**
- Migrate useGroups to useQuery
- Migrate useAssignments to useQuery + useMutation
- Query client configuration with error handling integration
- Optimistic update patterns

**Addresses (from FEATURES.md):**
- React Query Integration (differentiator)
- Optimistic Updates with Rollback (differentiator)
- Request Deduplication (differentiator)

**Uses (from STACK.md):**
- Existing @tanstack/react-query ^5.83.0

**Avoids (from PITFALLS.md):**
- React Query cache pollution in tests (Pitfall 10) — already handled in Phase 2

**Research flag:** Likely needs `/gsd:research-phase` for React Query + Supabase integration patterns, optimistic update strategies.

### Phase 8: Integration Testing (Week 4+, Medium-High Complexity)
**Rationale:** Cross-cutting flow tests after all units are validated. Focus on 3-5 critical user journeys. Consider MSW for realistic network mocking or Supabase local for true integration.

**Delivers:**
- Assignment flow test (create → generate tasks → complete)
- Auth flow test (sign in → protected routes → sign out)
- Group management flow (create → add members → assign)
- AI assistant integration test
- QR code validation flow

**Addresses (from FEATURES.md):**
- Integration coverage of complete user journeys

**Avoids (from PITFALLS.md):**
- RPC testing blindspots (Pitfall 9) — integration tests hit closer to real DB functions
- Testing everything E2E — limit to 3-5 critical flows

**Research flag:** May need `/gsd:research-phase` for Supabase local development setup, MSW PostgREST API mocking patterns.

### Phase Ordering Rationale

1. **Error handling first** — Foundation that catches all other failures. Tests written in later phases benefit from consistent error patterns.
2. **Test infrastructure before tests** — Avoid rework from wrong mocking patterns. Utility tests validate setup works.
3. **Types before hook tests** — 32 `as any` casts will cause false test passes. Fix types so tests catch real issues.
4. **Hooks before components** — Hooks contain business logic. Testing components that use untested hooks creates fragile tests.
5. **Memory leaks in parallel** — Independent of testing, can run alongside hook tests.
6. **Components after hooks** — Component tests use already-validated hooks, reducing mock complexity.
7. **React Query after hook tests** — Migration is validated by existing tests showing same behavior.
8. **Integration last** — Requires all units working correctly first.

This avoids the pitfall of testing large components monolithically (Pitfall 4) and ensures mocking patterns are established correctly before widespread use (Pitfall 2).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Type Safety):** Supabase type generation process, RPC function typing — may hit schema-specific issues
- **Phase 7 (React Query):** Optimistic update patterns with Supabase, cache invalidation strategies — needs API-specific research
- **Phase 8 (Integration):** MSW PostgREST mocking patterns or Supabase local setup — integration testing approach needs validation

Phases with standard patterns (skip research-phase):
- **Phase 1 (Error Handling):** React error boundaries and error utility patterns are well-documented
- **Phase 2 (Test Infrastructure):** Vitest + RTL setup is established Vite ecosystem pattern
- **Phase 4 (Hook Testing):** React Testing Library hook patterns are standard, extensive documentation
- **Phase 5 (Memory Leaks):** useEffect cleanup is basic React pattern
- **Phase 6 (Component Testing):** RTL component testing patterns are well-established

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Vitest/RTL is standard for Vite projects; versions should be verified at install time with `npm view` |
| Features | HIGH | Based on direct codebase analysis (CONCERNS.md, TESTING.md, 76 try-catch blocks, 32 `as any` casts) |
| Architecture | HIGH | Test architecture patterns are established; colocated tests + layered mocking is proven approach |
| Pitfalls | HIGH | Pitfalls identified from actual codebase issues (large components, async patterns, type casts) |

**Overall confidence:** HIGH

The research is grounded in concrete codebase analysis rather than generic testing advice. The 900-line Tasks.tsx, 570-line useAssignments, 76 try-catch blocks, and 32 type casts are real artifacts that inform specific recommendations. The Supabase + React Query combination is well-traveled territory with established patterns.

### Gaps to Address

- **MSW vs Supabase mock factory:** Research recommends both approaches. Phase 2 should pick one or create path for both. Decision impacts Phase 4 hook test complexity. **Handle in Phase 2 planning** by prototyping both approaches and choosing based on test complexity.

- **RPC function testing strategy:** The 6 RPC functions (validate_qr_token, generate_recurring_tasks, accept_invite, delete_class_session, remove_student_from_class, generate_join_code) have unknown DB function implementations. Mocks may not match real behavior. **Handle in Phase 8** by considering Supabase local for true integration tests, or **defer** RPC validation to manual testing if complex.

- **Coverage thresholds:** Research recommends 60-70% overall, higher for hooks. **Handle in Phase 2** when configuring Vitest coverage options. Set CI gates after Phase 4 when hook tests establish baseline.

- **E2E testing scope:** Research defers comprehensive E2E. **Validate in Phase 8** which 3-5 flows are truly critical. Candidates: coach creates assignment, student completes task, QR code login, class session management, AI assistant interaction.

- **React Query migration complexity:** Unsure if all hooks should migrate or just data-fetching ones. useAuth might stay as-is. **Research during Phase 7 planning** which hooks benefit from React Query vs staying as useEffect.

- **Error tracking service choice:** Research mentions Sentry/LogRocket/Supabase built-in. **Decide in Phase 1** based on budget/requirements. Can start with structured console logging and upgrade later.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:** Direct audit of /Users/haokunyang/Downloads/MinseoCOOKS/LeahDavisWebsiteCode/routine-craft-bot/src/
  - CONCERNS.md: 76 try-catch blocks, 32 `as any` casts, memory leaks identified
  - TESTING.md: Zero test coverage, hook complexity analysis
  - package.json: @tanstack/react-query ^5.83.0 installed but unused, Vite 5 + React 18
  - src/hooks/: useAssignments (570 lines), useAuth, useGroups, useAIAssistant
  - src/pages/: Tasks.tsx (900+ lines), CoachCalendar (62KB)
- **Vitest documentation:** Official test configuration for Vite projects
- **React Testing Library documentation:** Hook and component testing patterns, official React recommendation
- **Supabase client analysis:** src/integrations/supabase/client.ts method chaining patterns

### Secondary (MEDIUM confidence)
- **MSW documentation:** Network-level mocking for REST APIs including PostgREST
- **react-error-boundary:** Popular error boundary library, React 18 compatible
- **TanStack Query (React Query) documentation:** Query + mutation patterns with Supabase

### Tertiary (LOW confidence, needs validation)
- **Supabase type generation:** Assumes standard `supabase gen types` workflow works for this schema
- **RPC function signatures:** Unknown actual DB function implementations, mocks based on usage patterns
- **Exact version numbers:** Based on training data; verify with `npm view [package] version` at install time

---
*Research completed: 2026-01-24*
*Ready for roadmap: yes*
