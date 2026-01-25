---
phase: "03"
plan: "03"
subsystem: testing
tags: [vitest, react-testing-library, test-utils, factories, cn]

dependency-graph:
  requires: ["03-01"]
  provides: ["test-utils", "mock-factories", "validated-infrastructure"]
  affects: ["04-xx", "future-component-tests"]

tech-stack:
  added: []
  patterns: ["custom-render-with-providers", "factory-pattern-for-mocks"]

key-files:
  created:
    - src/test/test-utils.tsx
    - src/test/factories/index.ts
    - src/lib/utils.test.ts
  modified: []

decisions:
  - id: "03-03-01"
    decision: "Fresh QueryClient per test"
    rationale: "Prevents cache pollution between tests"
    alternatives: ["shared-queryclient", "manual-cache-clear"]
  - id: "03-03-02"
    decision: "Return userEvent from render"
    rationale: "Convenient async interaction pattern"
  - id: "03-03-03"
    decision: "TooltipProvider with delayDuration=0"
    rationale: "Faster tests without tooltip delays"

metrics:
  duration: "2min"
  completed: "2026-01-25"
---

# Phase 03 Plan 03: Test Utilities and Validation Summary

Custom render with MemoryRouter/QueryClient/TooltipProvider wrappers, mock data factories (user/group/assignment/template), and 7 passing cn utility tests validating complete infrastructure.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Create custom render with all providers | ff6b395 | Done |
| 2 | Create mock data factories | a137b7a | Done |
| 3 | Create validation test for cn utility | 520c8bd | Done |

## Artifacts Produced

### src/test/test-utils.tsx (99 lines)

Custom render function that wraps components with all necessary providers:

```tsx
function customRender(ui: ReactElement, options?: CustomRenderOptions): CustomRenderResult {
  const { initialRoute = '/', queryClient = createTestQueryClient(), ...renderOptions } = options || {};

  function AllProviders({ children }: WrapperProps) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={0}>
            {children}
          </TooltipProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }

  const user = userEvent.setup();
  return { user, ...render(ui, { wrapper: AllProviders, ...renderOptions }) };
}
```

Key features:
- Fresh QueryClient per test (retry: false, gcTime: 0)
- MemoryRouter with configurable initialRoute
- TooltipProvider with zero delay for fast tests
- Returns userEvent instance for convenient async interactions
- Re-exports all testing-library utilities for single import point

### src/test/factories/index.ts (133 lines)

Mock data factories matching database schema:

- `createMockUser()` - User with id, email, role, display_name
- `createMockGroup()` - Group with id, name, teacher_id, code
- `createMockAssignment()` - Assignment with scheduling, status
- `createMockTaskCompletion()` - Task completion records
- `createMockTemplate()` - Templates with task arrays

Pattern: Override any field via optional parameter object.

### src/lib/utils.test.ts (42 lines)

7 tests validating cn utility and entire test infrastructure:

1. merges class names
2. handles conditional classes
3. resolves Tailwind conflicts (last wins)
4. handles undefined and null
5. handles empty strings
6. handles arrays of classes
7. handles object syntax

## Decisions Made

### 03-03-01: Fresh QueryClient per test
Create new QueryClient for each test instead of sharing.
- Prevents test pollution from cached data
- Tests are isolated and reproducible
- Cost: Slight overhead per test (negligible)

### 03-03-02: Return userEvent from render
Include userEvent.setup() result in render return value.
- Allows `const { user } = render(<Component />)`
- Cleaner than importing and setting up separately
- Follows RTL best practices for async interactions

### 03-03-03: TooltipProvider with delayDuration=0
Configure tooltip delay to 0 in test environment.
- Tooltips appear immediately in tests
- No waiting for animation delays
- Tests run faster

## Test Results

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  13:33:17
   Duration  490ms
```

Coverage enabled and working with `npm run test:coverage`.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### Ready to Use
- Import `{ render, screen, userEvent }` from `@/test/test-utils`
- Import factories from `@/test/factories`
- All providers automatically wrapped

### Example Usage
```tsx
import { render, screen } from '@/test/test-utils';
import { createMockUser } from '@/test/factories';

test('displays user name', () => {
  const user = createMockUser({ displayName: 'John' });
  render(<UserCard user={user} />);
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

### Dependencies for Next Plan (03-02)
- Test utilities: Ready
- Supabase mock: 03-02 will add to src/test/mocks/
- Component tests: Can now be written
