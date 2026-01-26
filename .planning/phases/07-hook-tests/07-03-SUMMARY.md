---
phase: 07-hook-tests
plan: 03
subsystem: testing
tags: [vitest, react-hooks, supabase, groups, members]
dependency-graph:
  requires: [07-01]
  provides: ["useGroups-test-suite"]
  affects: [08-integration]
tech-stack:
  added: []
  patterns: ["renderHook-with-wrapper", "supabase-mock-chaining", "async-act-pattern"]
key-files:
  created: ["src/hooks/useGroups.test.tsx"]
  modified: []
decisions:
  - id: "07-03-01"
    choice: "Use .tsx extension for test files with JSX wrapper"
    rationale: "Vitest/SWC requires JSX-aware file extension"
  - id: "07-03-02"
    choice: "Use async vi.mock for Supabase to avoid hoisting issues"
    rationale: "vi.mock hoists to top - async import avoids reference errors"
metrics:
  duration: "3min"
  completed: "2026-01-26"
---

# Phase 7 Plan 03: useGroups Test Suite Summary

Comprehensive test coverage for useGroups hook covering group CRUD operations and member management with Supabase mock integration.

## What Was Done

### Task 1: Group CRUD Tests
Created test suite for core group operations:
- **fetchGroups**: Tests for loading groups with member counts, handling empty states, and user-null guard
- **createGroup**: Tests for RPC join code generation, insert with correct payload, toast feedback, and error handling
- **updateGroup**: Tests for update with toast feedback and error handling
- **deleteGroup**: Tests for delete, local state update (optimistic), and error handling

### Task 2: Member Management Tests
Added tests for member operations:
- **addMember**: Tests for insert with role, duplicate member error handling
- **removeMember**: Tests for delete with compound filter (group_id + user_id), error handling
- **getGroupMembers**: Tests for display name resolution:
  - Uses display_name when available
  - Falls back to email prefix (e.g., "john@example.com" -> "john")
  - Falls back to "Student" when profile not found

## Key Implementation Details

### Mock Setup Pattern
```typescript
// Async vi.mock to avoid hoisting issues with imported mock factory
vi.mock('@/integrations/supabase/client', async () => {
  const actual = await import('@/test/mocks/supabase');
  return actual.mockSupabaseModule;
});
```

### Query Response Mocking
```typescript
// Mock chainable Supabase query with .then for array responses
mock.queryBuilder.then.mockImplementationOnce((resolve) => {
  return Promise.resolve({ data: [...], error: null }).then(resolve);
});
```

### Hook Initialization Pattern
Each test must mock the initial `fetchGroups` call that happens on mount when user is present, then mock subsequent operation-specific calls.

## Test Coverage Summary

| Operation | Success Path | Error Path | Edge Cases |
|-----------|-------------|------------|------------|
| fetchGroups | member counts | - | user null, empty groups |
| createGroup | with join code | RPC error | user null |
| updateGroup | toast feedback | error toast | - |
| deleteGroup | state update | error toast | - |
| addMember | role=member | duplicate key | - |
| removeMember | compound filter | error toast | - |
| getGroupMembers | display names | - | email fallback, Student fallback, empty |

**Total: 18 tests**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] File extension .ts to .tsx**
- **Found during:** Task 1 initial run
- **Issue:** JSX in wrapper function required .tsx extension
- **Fix:** Renamed file from .test.ts to .test.tsx
- **Files modified:** src/hooks/useGroups.test.tsx

**2. [Rule 3 - Blocking] vi.mock hoisting issue**
- **Found during:** Task 1 after extension fix
- **Issue:** vi.mock references mockSupabaseModule before import due to hoisting
- **Fix:** Changed to async vi.mock that dynamically imports
- **Files modified:** src/hooks/useGroups.test.tsx

## Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Test Suite | src/hooks/useGroups.test.tsx | 664 lines, 18 tests |

## Verification

```bash
npm run test -- src/hooks/useGroups.test.tsx --run
# 18 tests passed
```

## Next Phase Readiness

**Ready for:**
- 07-04: useAIAssistant tests (fake timers for timeout/retry)

**Dependencies met:**
- Supabase mock factory patterns established
- renderHook wrapper pattern reusable
- Toast mock pattern reusable
