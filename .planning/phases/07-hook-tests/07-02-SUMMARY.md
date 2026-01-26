---
phase: 07
plan: 02
subsystem: hook-tests
tags: [testing, hooks, useAssignments, scheduling, CRUD]

dependency-graph:
  requires:
    - 03-02 (Supabase mock factory)
    - 03-03 (test utilities and wrappers)
  provides:
    - useAssignments hook test coverage
    - scheduling logic verification
    - group/template assignment testing
  affects:
    - 07-03 (useGroups tests - similar patterns)
    - 07-04 (useAIAssistant tests - similar patterns)

tech-stack:
  added: []
  patterns:
    - vi.mock with async factory for Supabase
    - Mock capture pattern for verifying insert calls
    - renderHook with MemoryRouter/QueryClient wrapper

key-files:
  created:
    - src/hooks/useAssignments.test.tsx
  modified: []

decisions:
  - id: 07-02-01
    summary: "Use async vi.mock factory for Supabase client"
    context: "vi.mock hoists to top, causing mockSupabaseModule reference error"
    choice: "Dynamic import inside async factory"

metrics:
  duration: 3min
  completed: 2026-01-26
---

# Phase 7 Plan 2: useAssignments Hook Tests Summary

**One-liner:** Comprehensive test coverage for useAssignments hook covering CRUD operations, all 4 schedule types, group assignments, and template-based scheduling with day_offset.

## What Was Done

Created test suite for `useAssignments` hook with 15 tests covering:

### Task 1: CRUD Tests
- `createAssignment`: returns null when no user authenticated
- `createAssignment`: creates assignment for individual assignee
- `createAssignment`: shows warning toast when no assignees found
- `getTaskInstances`: returns filtered task instances by assignee
- `getTaskInstances`: returns filtered task instances by date
- `getTaskInstances`: returns empty array on error
- `updateTaskStatus`: updates status and shows toast on completion
- `updateTaskStatus`: updates without toast for non-completed status
- `updateTaskStatus`: handles errors and shows error toast

### Task 2: Scheduling Logic Tests
- `schedule_type: 'once'` - creates single task on start_date
- `schedule_type: 'daily'` - creates tasks for each day in range
- `schedule_type: 'weekly'` - creates tasks on same day of week as start_date
- `schedule_type: 'custom'` - creates tasks only on specified days (Mon, Wed, Fri)

### Task 3: Group and Template Tests
- Group assignments: creates task instances for all group members
- Template assignments: uses template tasks with day_offset for scheduling

## Technical Details

### Mock Setup Pattern
```typescript
// Async factory to avoid hoisting issues
vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseModule } = await import('@/test/mocks/supabase');
  return mockSupabaseModule;
});
```

### Mock Capture Pattern for Verifying Inserts
```typescript
let capturedTaskInstances: Array<{ scheduled_date: string; name: string }>;

mock.queryBuilder.then.mockImplementation((resolve) => {
  const insertCalls = mock.queryBuilder.insert.mock.calls;
  const lastCall = insertCalls[insertCalls.length - 1];
  if (lastCall && Array.isArray(lastCall[0])) {
    capturedTaskInstances = lastCall[0];
  }
  return Promise.resolve({ data: capturedTaskInstances, error: null }).then(resolve);
});
```

## Artifacts

| Artifact | Details |
|----------|---------|
| Test file | `src/hooks/useAssignments.test.tsx` |
| Line count | 654 lines |
| Test count | 15 tests |
| All passing | Yes |

## Commits

| Hash | Message |
|------|---------|
| bf7f191 | test(07-02): add useAssignments CRUD tests |
| a35e3f5 | test(07-02): add scheduling logic tests |
| 7172ba9 | test(07-02): add group and template assignment tests |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] File extension changed from .ts to .tsx**
- **Found during:** Task 1
- **Issue:** Test file contained JSX for MemoryRouter wrapper but had .ts extension
- **Fix:** Renamed to .tsx for proper JSX support
- **Files modified:** src/hooks/useAssignments.test.tsx (renamed)
- **Commit:** bf7f191

## Verification

All must_haves from plan verified:
- [x] createAssignment creates assignment and task instances
- [x] getTaskInstances returns filtered task instances
- [x] updateTaskStatus updates task status and shows toast
- [x] schedule_type 'once' creates single task on start_date
- [x] schedule_type 'daily' creates tasks for each day in range
- [x] schedule_type 'weekly' creates tasks on same day of week
- [x] schedule_type 'custom' creates tasks only on specified days
- [x] File contains describe('useAssignments')
- [x] File imports useAssignments from hook
- [x] vi.mock pattern for useAuth

## Next Phase Readiness

- Pattern established for remaining hook tests (useGroups, useAIAssistant)
- Mock capture technique reusable for complex insert verification
- No blockers for 07-03
