# Requirements: Routine Craft Bot — Reliability Milestone

**Defined:** 2026-01-24
**Core Value:** Users can reliably complete their daily workflows without encountering errors, crashes, or unexpected behavior.

## v1 Requirements

Requirements for this reliability milestone. Each maps to roadmap phases.

### Error Handling

- [x] **ERR-01**: App has React Error Boundary that catches component errors and shows recovery UI ✓
- [x] **ERR-02**: Consistent error handling utility exists (toast + structured log + optional retry) ✓
- [x] **ERR-03**: All async operations show loading states (buttons, forms, data fetching) ✓
- [x] **ERR-04**: JWT errors are handled gracefully with explicit user messaging ✓
- [x] **ERR-05**: AI assistant has retry logic with exponential backoff for timeouts ✓

### Testing Infrastructure

- [x] **TEST-01**: Vitest is configured with React Testing Library and jsdom ✓
- [x] **TEST-02**: Supabase mock factory supports method chaining (from/select/eq/etc) ✓
- [x] **TEST-03**: Test utilities exist (wrapper with providers, factories for mock data) ✓
- [x] **TEST-04**: Test scripts added to package.json (test, test:coverage, test:watch) ✓

### Utility Tests

- [x] **UTIL-01**: safeParseISO has comprehensive tests (valid, invalid, null, undefined) ✓
- [x] **UTIL-02**: safeFormatDate has tests (valid dates, invalid dates, custom fallback) ✓
- [x] **UTIL-03**: cn() utility has tests (merging, Tailwind conflict resolution) ✓

### Hook Tests

- [x] **HOOK-01**: useAuth has tests for all states (loading, authenticated, unauthenticated, error) ✓
- [x] **HOOK-02**: useAssignments has tests for CRUD operations and scheduling logic ✓
- [x] **HOOK-03**: useGroups has tests for group management and member operations ✓
- [x] **HOOK-04**: useAIAssistant has tests for timeout handling and error states ✓

### Component Tests

- [ ] **COMP-01**: ProtectedRoute has tests for auth flow (redirect, allow, loading)
- [ ] **COMP-02**: CheckInModal has tests for user interaction (sentiment selection, submit)
- [ ] **COMP-03**: Critical dashboard components have behavior tests

### Type Safety

- [x] **TYPE-01**: Supabase types are regenerated and up-to-date ✓
- [x] **TYPE-02**: All `as any` casts in hooks are replaced with proper types ✓
- [x] **TYPE-03**: All `as any` casts in components are replaced with proper types ✓
- [x] **TYPE-04**: RPC function calls have typed responses ✓

### Code Quality

- [x] **QUAL-01**: Memory leaks fixed in sketch.tsx (setTimeout cleanup) ✓
- [x] **QUAL-02**: Memory leaks fixed in MagicScheduleButton.tsx ✓
- [x] **QUAL-03**: Memory leaks fixed in StudentSchedule.tsx ✓
- [x] **QUAL-04**: Memory leaks fixed in StickerBook.tsx ✓
- [x] **QUAL-05**: Structured logging utility replaces console.error calls ✓

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Performance

- **PERF-01**: React Query migration for data fetching (caching, deduplication)
- **PERF-02**: Optimistic updates with rollback for task status changes
- **PERF-03**: Request debouncing for search/filter operations
- **PERF-04**: Memo optimization for calendar/task list re-renders

### Advanced Testing

- **ADVT-01**: Integration tests for critical user flows (3-5 flows)
- **ADVT-02**: E2E tests with Playwright or Cypress
- **ADVT-03**: Visual regression testing for UI components

### Security Hardening

- **SEC-01**: Remove .env from git history
- **SEC-02**: Remove localStorage role tracking
- **SEC-03**: Rate limiting for QR token validation

## Out of Scope

| Feature | Reason |
|---------|--------|
| UI changes | This is reliability-only; keep user experience identical |
| New features | Focus on hardening existing functionality |
| Offline support | Complex PWA work deferred to dedicated milestone |
| Refactoring large components | Only extract if needed for testing; otherwise defer |
| 100% test coverage | Diminishing returns; focus on critical paths (60-70% target) |
| Mobile-specific optimizations | Defer to future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Phase Name | Status |
|-------------|-------|------------|--------|
| ERR-01 | 1 | Error Foundation | Complete |
| ERR-02 | 1 | Error Foundation | Complete |
| ERR-03 | 2 | Error Completion | Complete |
| ERR-04 | 2 | Error Completion | Complete |
| ERR-05 | 2 | Error Completion | Complete |
| TEST-01 | 3 | Test Infrastructure | Complete |
| TEST-02 | 3 | Test Infrastructure | Complete |
| TEST-03 | 3 | Test Infrastructure | Complete |
| TEST-04 | 3 | Test Infrastructure | Complete |
| UTIL-01 | 4 | Utility Tests | Complete |
| UTIL-02 | 4 | Utility Tests | Complete |
| UTIL-03 | 4 | Utility Tests | Complete |
| TYPE-01 | 5 | Type Safety | Complete |
| TYPE-02 | 5 | Type Safety | Complete |
| TYPE-03 | 5 | Type Safety | Complete |
| TYPE-04 | 5 | Type Safety | Complete |
| QUAL-01 | 6 | Code Quality | Complete |
| QUAL-02 | 6 | Code Quality | Complete |
| QUAL-03 | 6 | Code Quality | Complete |
| QUAL-04 | 6 | Code Quality | Complete |
| QUAL-05 | 6 | Code Quality | Complete |
| HOOK-01 | 7 | Hook Tests | Complete |
| HOOK-02 | 7 | Hook Tests | Complete |
| HOOK-03 | 7 | Hook Tests | Complete |
| HOOK-04 | 7 | Hook Tests | Complete |
| COMP-01 | 8 | Component Tests | Pending |
| COMP-02 | 8 | Component Tests | Pending |
| COMP-03 | 8 | Component Tests | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Traceability updated: 2026-01-24 (roadmap created)*
