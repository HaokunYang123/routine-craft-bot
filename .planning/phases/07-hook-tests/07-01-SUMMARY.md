---
phase: "07-hook-tests"
plan: "01"
subsystem: "testing"
tags: ["vitest", "react-testing-library", "renderHook", "useAuth", "supabase-mock"]

depends_on:
  requires:
    - "03-test-infrastructure"  # Vitest, supabase mock, test-utils
    - "02-02"  # Session expiry detection via onAuthStateChange
  provides:
    - "useAuth hook test suite with 7 tests"
    - "Pattern for testing hooks with Supabase auth subscription"
    - "vi.mock hoisting workaround using dynamic import"
  affects:
    - "07-02 through 07-04"  # Other hook tests can use same mock pattern

tech_stack:
  added: []
  patterns:
    - "renderHook with MemoryRouter wrapper"
    - "Capturing onAuthStateChange callback for test control"
    - "Dynamic import inside vi.mock factory for hoisting workaround"

key_files:
  created:
    - "src/hooks/useAuth.test.tsx"
  modified: []

decisions:
  - id: "HOOK-TEST-01"
    choice: "Use dynamic import inside vi.mock factory"
    reason: "vi.mock is hoisted before imports; using dynamic import inside factory avoids 'Cannot access before initialization' error"
    alternatives: ["mockSupabaseModule directly (fails with hoisting)", "require() (fails with path aliases)"]

metrics:
  duration: "3min"
  completed: "2026-01-26"
---

# Phase 7 Plan 01: useAuth Hook Tests Summary

**One-liner:** Comprehensive useAuth hook test suite using renderHook with captured auth subscription callback for state transition testing.

## What Was Built

Created `src/hooks/useAuth.test.tsx` with 7 tests covering all authentication states and transitions:

### Test Structure

```
describe('useAuth')
  ├── describe('loading state')
  │   └── it('starts in loading state')
  ├── describe('authenticated state')
  │   └── it('sets user when session exists')
  ├── describe('unauthenticated state')
  │   └── it('sets user to null when no session')
  ├── describe('session expiry')
  │   ├── it('sets sessionExpired on SIGNED_OUT event')
  │   └── it('clears sessionExpired on TOKEN_REFRESHED')
  ├── describe('signOut')
  │   └── it('navigates to home and signs out')
  └── describe('cleanup')
      └── it('unsubscribes on unmount')
```

### Key Implementation Details

1. **Mock Pattern for Hoisting Issue**
   - `vi.mock('@/integrations/supabase/client', async () => { const { getMockSupabase } = await import(...); ... })`
   - Proxy pattern lazily accesses getMockSupabase() at runtime
   - Avoids "Cannot access before initialization" error

2. **Auth State Callback Capture**
   - `authStateCallback` variable captures the callback passed to `onAuthStateChange`
   - Allows tests to simulate auth events like SIGNED_OUT, TOKEN_REFRESHED
   - Enables testing session expiry detection without real Supabase

3. **Test Patterns Used**
   - `renderHook(() => useAuth(), { wrapper: createWrapper() })` for hook isolation
   - `waitFor(() => expect(result.current.loading).toBe(false))` for async assertions
   - `act(() => authStateCallback?.('SIGNED_OUT', null))` for state transitions
   - `await act(async () => await result.current.signOut())` for async hook methods

## Verification Results

```
npm run test -- src/hooks/useAuth.test.tsx --run

 ✓ src/hooks/useAuth.test.tsx (7 tests) 291ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

All 7 tests pass with no act() warnings.

## Decisions Made

### HOOK-TEST-01: Dynamic Import Inside vi.mock Factory

**Problem:** vi.mock is hoisted to top of file before any imports execute. Referencing imported `mockSupabaseModule` in factory causes "Cannot access before initialization" error.

**Solution:** Use dynamic import inside async factory:
```typescript
vi.mock('@/integrations/supabase/client', async () => {
  const { getMockSupabase } = await import('@/test/mocks/supabase');
  return { supabase: new Proxy({}, { get: (_, prop) => getMockSupabase().client[prop] }) };
});
```

**Why This Works:** Factory runs at mock execution time (after imports), not at parse time.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/hooks/useAuth.test.tsx` | 206 | Complete test suite for useAuth hook |

## Commits

| Hash | Message |
|------|---------|
| f0d5456 | test(07-01): add useAuth hook test suite with state tests |
| ff2470b | test(07-01): add subscription cleanup test for useAuth |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- **Ready for 07-02:** Same mock pattern can be used for useAssignments tests
- **Pattern established:** Hook testing with Supabase auth works, documented in decisions
- **No blockers:** All tests pass, no warnings
