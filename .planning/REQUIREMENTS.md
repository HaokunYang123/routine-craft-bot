# Requirements: Routine Craft Bot — Reliability Milestone

**Defined:** 2026-01-24
**Core Value:** Users can reliably complete their daily workflows without encountering errors, crashes, or unexpected behavior.

## v1 Requirements

Requirements for this reliability milestone. Each maps to roadmap phases.

### Error Handling

- [ ] **ERR-01**: App has React Error Boundary that catches component errors and shows recovery UI
- [ ] **ERR-02**: Consistent error handling utility exists (toast + structured log + optional retry)
- [ ] **ERR-03**: All async operations show loading states (buttons, forms, data fetching)
- [ ] **ERR-04**: JWT errors are handled gracefully with explicit user messaging
- [ ] **ERR-05**: AI assistant has retry logic with exponential backoff for timeouts

### Testing Infrastructure

- [ ] **TEST-01**: Vitest is configured with React Testing Library and jsdom
- [ ] **TEST-02**: Supabase mock factory supports method chaining (from/select/eq/etc)
- [ ] **TEST-03**: Test utilities exist (wrapper with providers, factories for mock data)
- [ ] **TEST-04**: Test scripts added to package.json (test, test:coverage, test:watch)

### Utility Tests

- [ ] **UTIL-01**: safeParseISO has comprehensive tests (valid, invalid, null, undefined)
- [ ] **UTIL-02**: safeFormatDate has tests (valid dates, invalid dates, custom fallback)
- [ ] **UTIL-03**: cn() utility has tests (merging, Tailwind conflict resolution)

### Hook Tests

- [ ] **HOOK-01**: useAuth has tests for all states (loading, authenticated, unauthenticated, error)
- [ ] **HOOK-02**: useAssignments has tests for CRUD operations and scheduling logic
- [ ] **HOOK-03**: useGroups has tests for group management and member operations
- [ ] **HOOK-04**: useAIAssistant has tests for timeout handling and error states

### Component Tests

- [ ] **COMP-01**: ProtectedRoute has tests for auth flow (redirect, allow, loading)
- [ ] **COMP-02**: CheckInModal has tests for user interaction (sentiment selection, submit)
- [ ] **COMP-03**: Critical dashboard components have behavior tests

### Type Safety

- [ ] **TYPE-01**: Supabase types are regenerated and up-to-date
- [ ] **TYPE-02**: All `as any` casts in hooks are replaced with proper types
- [ ] **TYPE-03**: All `as any` casts in components are replaced with proper types
- [ ] **TYPE-04**: RPC function calls have typed responses

### Code Quality

- [ ] **QUAL-01**: Memory leaks fixed in sketch.tsx (setTimeout cleanup)
- [ ] **QUAL-02**: Memory leaks fixed in MagicScheduleButton.tsx
- [ ] **QUAL-03**: Memory leaks fixed in StudentSchedule.tsx
- [ ] **QUAL-04**: Memory leaks fixed in StickerBook.tsx
- [ ] **QUAL-05**: Structured logging utility replaces console.error calls

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

| Requirement | Phase | Status |
|-------------|-------|--------|
| ERR-01 | Phase 1 | Pending |
| ERR-02 | Phase 1 | Pending |
| ERR-03 | Phase 2 | Pending |
| ERR-04 | Phase 2 | Pending |
| ERR-05 | Phase 2 | Pending |
| TEST-01 | Phase 3 | Pending |
| TEST-02 | Phase 3 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 3 | Pending |
| UTIL-01 | Phase 4 | Pending |
| UTIL-02 | Phase 4 | Pending |
| UTIL-03 | Phase 4 | Pending |
| TYPE-01 | Phase 5 | Pending |
| TYPE-02 | Phase 5 | Pending |
| TYPE-03 | Phase 5 | Pending |
| TYPE-04 | Phase 5 | Pending |
| QUAL-01 | Phase 6 | Pending |
| QUAL-02 | Phase 6 | Pending |
| QUAL-03 | Phase 6 | Pending |
| QUAL-04 | Phase 6 | Pending |
| QUAL-05 | Phase 6 | Pending |
| HOOK-01 | Phase 7 | Pending |
| HOOK-02 | Phase 7 | Pending |
| HOOK-03 | Phase 7 | Pending |
| HOOK-04 | Phase 7 | Pending |
| COMP-01 | Phase 8 | Pending |
| COMP-02 | Phase 8 | Pending |
| COMP-03 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-24 after initial definition*
