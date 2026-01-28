# Domain Pitfalls: Testing React + Supabase Applications

**Domain:** Retrofitting tests to existing React/Supabase codebase
**Researched:** 2026-01-24
**Context:** Zero existing tests, large components, 32 `as any` casts, complex async flows

---

## Critical Pitfalls

Mistakes that cause rewrites, false confidence, or abandoned test suites.

### Pitfall 1: Testing Implementation Details Instead of Behavior

**What goes wrong:** Tests break on every refactor. Team spends more time fixing tests than writing features. Test suite becomes a liability instead of an asset.

**Why it happens:** When retrofitting tests, developers often test what the code *does* (implementation) rather than what it *should do* (behavior). This is especially tempting with large components where it's easier to assert internal state than user-visible outcomes.

**Warning signs in this codebase:**
- Testing that `setStats` was called with specific values
- Asserting on component internal state
- Mocking `useState` or `useEffect` directly
- Tests that know about `groupsWithMembers` internal structure

**Consequences:**
- Refactoring Tasks.tsx (900+ lines) breaks dozens of tests
- Tests don't catch actual bugs, just implementation changes
- Team loses confidence in tests and stops writing them

**Prevention:**
```typescript
// BAD: Testing implementation
expect(mockSetState).toHaveBeenCalledWith({ peopleCount: 5, ... });

// GOOD: Testing behavior
render(<Dashboard />);
await waitFor(() => {
  expect(screen.getByText('5')).toBeInTheDocument();
  expect(screen.getByText('People')).toBeInTheDocument();
});
```

**Phase mapping:** Address in Phase 1 (Test Foundation). Establish testing patterns document before writing any tests.

---

### Pitfall 2: Mocking Supabase at the Wrong Level

**What goes wrong:** Tests pass but production breaks. Mock doesn't match real Supabase behavior. Tests become maintenance nightmares when Supabase client API changes.

**Why it happens:** Supabase client has a fluent API (`.from().select().eq().order()`). Teams either:
1. Mock too low (every method) - brittle, doesn't test chaining
2. Mock too high (entire client) - misses real API behavior
3. Don't mock at all - tests hit real database, causing flaky tests

**Warning signs in this codebase:**
- 32 `as any` casts bypass type safety - mocks won't catch type errors
- Multiple query patterns: `supabase.from()`, `supabase.rpc()`, `supabase.auth`
- Chained queries like `.select().eq().order().maybeSingle()`

**Consequences:**
- Test says "insert succeeded" but production gets constraint violation
- Mock returns `{ data: [] }` but real API returns `{ data: null }`
- Auth state mocking misses edge cases (expired tokens, network errors)

**Prevention:**
```typescript
// Create a test utility that mimics real Supabase response shapes
const createSupabaseMock = () => ({
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        // Return EXACT shapes Supabase returns
        data: null, // NOT [] for .single() queries
        error: null,
        count: null,
      }),
      single: () => ({
        data: null,
        error: { code: 'PGRST116', message: 'not found' }, // Real error shape
      }),
    }),
  }),
});

// OR use MSW to intercept at network level (recommended)
```

**Detection:** Any test that mocks Supabase should verify mock shape matches real API.

**Phase mapping:** Address in Phase 1. Create shared Supabase mock utilities before writing integration tests.

---

### Pitfall 3: Async Test Timing Failures (act() Warnings Everywhere)

**What goes wrong:** Tests pass locally, fail in CI. Intermittent failures. Hundreds of "not wrapped in act()" warnings that mask real problems.

**Why it happens:** This codebase has multiple async patterns:
- `useEffect` that fetches on mount (`useAuth`, `useGroups`, `useRecurringSchedules`)
- Callbacks that trigger state updates (`createGroup`, `deleteSchedule`)
- Subscription cleanup (`supabase.auth.onAuthStateChange`)
- Toast notifications that update state

Each pattern needs specific handling in tests.

**Warning signs in this codebase:**
```typescript
// useAuth.tsx has multiple async state updates
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    setSession(session);        // State update 1
    setUser(session?.user);     // State update 2
    setLoading(false);          // State update 3
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);        // Another async state update
    setUser(session?.user);
    setLoading(false);
  });
}, []);
```

**Consequences:**
- Tests technically pass but with warnings that hide real issues
- State assertions happen before async updates complete
- Flaky tests lead to "just run it again" culture

**Prevention:**
```typescript
// Always use waitFor for async state
test('loads user on mount', async () => {
  render(<ComponentUsingAuth />);

  // WRONG: Synchronous assertion
  // expect(screen.getByText('Welcome')).toBeInTheDocument();

  // RIGHT: Wait for async state to settle
  await waitFor(() => {
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });
});

// For hooks, use renderHook from @testing-library/react
test('useAuth returns user after auth check', async () => {
  const { result } = renderHook(() => useAuth(), {
    wrapper: TestProviders,
  });

  // Wait for loading to complete
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.user).toBeDefined();
});
```

**Phase mapping:** Address in Phase 1. Document async testing patterns. Run tests with `--detectOpenHandles` to catch leaks.

---

### Pitfall 4: Testing Large Components Monolithically

**What goes wrong:** Tests for Tasks.tsx (900+ lines) become 500+ line test files. Impossible to understand what's being tested. Setup becomes copy-paste nightmare.

**Why it happens:** Retrofitting tests to existing large components is hard. The temptation is to write one big test that renders the whole component. But this creates:
- Massive mock setup (auth, groups, templates, assignments, toasts)
- Tests that break for unrelated changes
- No clear mapping between test and feature

**Warning signs in this codebase:**
- `Tasks.tsx`: 900+ lines with 30+ state variables
- `People.tsx`: Complex class session management
- `RecurringSchedules.tsx`: Multiple async operations

**Consequences:**
- Test file becomes unmaintainable
- Coverage numbers look good but tests are meaningless
- Bugs slip through because edge cases aren't tested

**Prevention strategy - "Test the Seams":**

1. **Identify extractable logic:** Pure functions first
```typescript
// Extract from Tasks.tsx
export const calculateCompletionRate = (completed: number, total: number) =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

// Easy to test
test('calculateCompletionRate', () => {
  expect(calculateCompletionRate(5, 10)).toBe(50);
  expect(calculateCompletionRate(0, 0)).toBe(0);
});
```

2. **Test hooks in isolation:** Before testing components that use them
```typescript
// Test useGroups before testing Tasks
test('useGroups fetches groups on mount', async () => {
  const { result } = renderHook(() => useGroups());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.groups).toHaveLength(2);
});
```

3. **Test component slices:** Don't render entire page
```typescript
// Instead of rendering <Tasks />, test the assignment dialog separately
test('AssignmentDialog shows templates', () => {
  render(<AssignmentDialog templates={mockTemplates} />);
  expect(screen.getByText('Morning Routine')).toBeInTheDocument();
});
```

**Phase mapping:** Phase 2 (Hook Testing) extracts and tests hooks. Phase 3 (Component Testing) uses tested hooks.

---

### Pitfall 5: Type-Unsafe Mocks Defeating TypeScript Protection

**What goes wrong:** Tests pass because mocks use `any`. Production fails because real types don't match. The 32 `as any` casts already bypass TypeScript - mocks shouldn't add more.

**Why it happens:** TypeScript mocking is verbose. It's tempting to write:
```typescript
const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      data: [{ id: '1', name: 'Test' }], // Is this the right shape?
    }),
  }),
} as any; // <-- Here's the problem
```

**Warning signs in this codebase:**
- 32 existing `as any` casts already bypass type safety
- Complex types like `RecurringSchedule` with multiple optional fields
- RPC calls that return dynamic shapes

**Consequences:**
- Tests confirm code works with mock shapes that don't exist
- Type errors only discovered in production
- False confidence from "100% test coverage"

**Prevention:**
```typescript
// Create typed mock factories
import type { RecurringSchedule } from '@/hooks/useRecurringSchedules';

const createMockSchedule = (overrides?: Partial<RecurringSchedule>): RecurringSchedule => ({
  id: 'test-id',
  user_id: 'user-1',
  name: 'Test Schedule',
  description: null,
  recurrence_type: 'weekly',
  days_of_week: [1, 3, 5],
  custom_interval_days: null,
  start_date: '2026-01-01',
  end_date: null,
  is_active: true,
  assigned_student_id: null,
  class_session_id: null,
  template_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// Now TypeScript enforces correct shape
const schedule = createMockSchedule({ name: 'Custom Name' });
```

**Phase mapping:** Phase 1 creates typed mock factories. Consider running tests with `strictNullChecks` even if main code doesn't.

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or incomplete coverage.

### Pitfall 6: Not Testing Auth Edge Cases

**What goes wrong:** App crashes when token expires. Logout doesn't clean up properly. Protected routes flash wrong content.

**Why it happens:** `useAuth` hook handles multiple states: loading, authenticated, unauthenticated, error. Tests often only cover the happy path.

**Warning signs in this codebase:**
```typescript
// useAuth.tsx handles subscription + initial load
// Both can fail independently
const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
supabase.auth.getSession().then(...);
```

**Prevention - Test Auth Matrix:**

| Initial State | Event | Expected Behavior |
|--------------|-------|-------------------|
| Loading | getSession succeeds | Show authenticated UI |
| Loading | getSession fails | Show login UI |
| Loading | getSession times out | Show error state |
| Authenticated | Token expires | Redirect to login |
| Authenticated | signOut called | Clear state, redirect |
| Authenticated | Network error | Show cached state or error |

**Phase mapping:** Phase 2 (Hook Testing). Test useAuth thoroughly before testing components that depend on it.

---

### Pitfall 7: Testing Toast Messages Incorrectly

**What goes wrong:** Tests pass but toasts don't show in production. Or toasts show but with wrong content.

**Why it happens:** This codebase uses sonner (via `@/hooks/use-toast`). Toast testing requires:
1. The toast provider to be in the render tree
2. Async timing (toasts animate in)
3. Correct assertion on toast content

**Warning signs in this codebase:**
```typescript
// Multiple patterns in hooks
toast({ title: "Success", description: "...", variant: "default" });
toast({ title: "Error", description: "...", variant: "destructive" });
```

**Prevention:**
```typescript
// Create a test wrapper that includes toast provider
const TestProviders = ({ children }) => (
  <QueryClientProvider client={testClient}>
    <BrowserRouter>
      <ToastProvider>
        {children}
      </ToastProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

// Test toast appears
test('shows error toast on failure', async () => {
  mockSupabase.from().insert.mockRejectedValue(new Error('DB error'));

  render(<CreateGroupButton />, { wrapper: TestProviders });
  fireEvent.click(screen.getByText('Create'));

  await waitFor(() => {
    expect(screen.getByText('Failed to create group')).toBeInTheDocument();
  });
});
```

**Phase mapping:** Phase 3 (Component Testing). Include in test utilities setup.

---

### Pitfall 8: Ignoring Navigation/Routing in Tests

**What goes wrong:** Component tests pass but navigation breaks. `useNavigate` throws "outside Router" error.

**Why it happens:** Multiple components use `useNavigate`:
- `useAuth` redirects on signOut
- Protected routes redirect unauthenticated users
- Links throughout the app

**Warning signs in this codebase:**
```typescript
// useAuth.tsx
const navigate = useNavigate();
// ...
const signOut = async () => {
  await supabase.auth.signOut();
  navigate("/"); // <-- Tests must handle this
};
```

**Prevention:**
```typescript
// Option 1: Memory router for unit tests
import { MemoryRouter } from 'react-router-dom';

test('redirects after signout', async () => {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText('Sign Out'));

  await waitFor(() => {
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});

// Option 2: Mock useNavigate for isolation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
```

**Phase mapping:** Phase 1 (Test Foundation). Establish router testing pattern early.

---

### Pitfall 9: Supabase RPC Testing Blindspots

**What goes wrong:** RPC functions work in tests but fail in production. Test mocks return success but real DB function has different behavior.

**Why it happens:** This codebase has multiple RPC calls:
- `validate_qr_token`
- `accept_invite`
- `generate_recurring_tasks`
- `delete_class_session`
- `remove_student_from_class`
- `generate_join_code`

These are PostgreSQL functions with their own logic. Tests mock them, missing:
- Parameter validation in DB function
- Row-level security policies
- Transaction behavior

**Warning signs in this codebase:**
```typescript
// Multiple RPC calls cast to any - shape is unknown
await supabase.rpc("generate_recurring_tasks" as any, {
  p_schedule_id: scheduleId,
  p_from_date: fromDate,
  p_to_date: toDate,
});
```

**Prevention:**
1. **Document expected RPC signatures** in test utilities
2. **Create integration test suite** that hits real Supabase (separate from unit tests)
3. **Mock RPC responses with exact DB function shapes**

```typescript
// Mock factory that matches actual DB function returns
const mockGenerateRecurringTasks = (success: boolean, taskCount = 0) => ({
  data: {
    success,
    task_count: taskCount,
    message: success ? `Generated ${taskCount} tasks` : 'No tasks generated',
  },
  error: null,
});
```

**Phase mapping:** Phase 4 (Integration Testing). Consider Supabase local development for true integration tests.

---

### Pitfall 10: React Query Cache Issues in Tests

**What goes wrong:** Tests pollute each other. Second test gets cached data from first test. Flaky test order dependencies.

**Why it happens:** This codebase uses `@tanstack/react-query`. Query cache persists between tests unless explicitly cleared.

**Warning signs:**
```json
"@tanstack/react-query": "^5.83.0"
```

**Prevention:**
```typescript
// Create fresh query client per test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Don't retry in tests
      gcTime: 0, // Don't cache between tests (was cacheTime in v4)
    },
  },
});

// In each test file
let queryClient: QueryClient;

beforeEach(() => {
  queryClient = createTestQueryClient();
});

afterEach(() => {
  queryClient.clear();
});
```

**Phase mapping:** Phase 1 (Test Foundation). Part of test utilities setup.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 11: Over-Mocking Radix UI Components

**What goes wrong:** Tests mock Radix primitives (Dialog, Select, etc.) and miss real accessibility issues.

**Why it happens:** Radix components have complex internal state. Mocking them is tempting but removes the value of testing with real UI.

**This codebase uses extensively:**
- `@radix-ui/react-dialog`
- `@radix-ui/react-select`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`
- etc.

**Prevention:** Don't mock Radix components. Test them as users would interact with them:
```typescript
// Don't mock Select, use it
fireEvent.click(screen.getByRole('combobox'));
fireEvent.click(screen.getByText('Option 1'));
```

**Phase mapping:** Phase 3 (Component Testing).

---

### Pitfall 12: Hardcoded Test Data Dates

**What goes wrong:** Tests pass today, fail tomorrow. Date comparisons break on weekends or month boundaries.

**Why it happens:** This codebase has date-dependent logic:
```typescript
const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
```

**Prevention:**
```typescript
// Mock date in tests
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-15T10:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});
```

**Phase mapping:** Phase 1 (Test Foundation). Include in test utilities.

---

### Pitfall 13: Not Testing Loading States

**What goes wrong:** Skeleton UI shows forever. Loading state never resolves. User sees flash of loading then content.

**Why it happens:** Tests wait for loaded state and never verify loading state worked.

**Prevention:**
```typescript
test('shows loading then content', async () => {
  render(<Dashboard />);

  // First, loading state
  expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

  // Then, loaded state
  await waitFor(() => {
    expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });
});
```

**Phase mapping:** Phase 3 (Component Testing).

---

## Phase-Specific Warnings Summary

| Phase | Topic | Likely Pitfalls | Mitigation |
|-------|-------|-----------------|------------|
| 1 | Test Foundation | Mocking patterns, async utilities | Create shared test utilities first |
| 2 | Hook Testing | Auth edge cases, timing issues | Test hooks in isolation with renderHook |
| 3 | Component Testing | Implementation details, large components | Test behavior, extract logic |
| 4 | Integration Testing | Supabase mocking vs real DB | Use MSW or Supabase local |

---

## Pre-Test Checklist

Before writing any test, ask:

1. **Am I testing behavior or implementation?**
   - Can a user observe this?
   - Will this test break on refactor?

2. **Is my mock type-safe?**
   - Does it match the real API shape exactly?
   - Am I using `as any`?

3. **Am I handling async correctly?**
   - Using `waitFor` for state updates?
   - Cleaning up subscriptions?

4. **What edge cases exist?**
   - Loading state?
   - Error state?
   - Empty state?
   - Auth states (loading, authenticated, unauthenticated)?

5. **Is this test isolated?**
   - Fresh query client?
   - No shared state between tests?
   - Mocks reset?

---

## Sources

- React Testing Library documentation (testing-library.dev)
- Supabase JS client source code analysis
- Codebase analysis: `/Users/haokunyang/Downloads/MinseoCOOKS/LeahDavisWebsiteCode/routine-craft-bot/src/`
- Kent C. Dodds testing principles (kentcdodds.com)
- TanStack Query testing documentation

**Confidence level:** HIGH for React/Supabase patterns, MEDIUM for RPC-specific issues (would need Supabase local testing to verify)

---
---

# ADDENDUM: React Query Migration + Performance Optimization Pitfalls

**Domain:** Migrating existing React app from useState/useEffect to React Query v5, adding pagination and memo optimization
**Researched:** 2026-01-26
**Context:** Existing 103 tests using vi.mock for hooks, custom hooks with useState/useEffect, React Query v5 already installed but not used for data fetching

---

## Critical Pitfalls (Migration-Specific)

Mistakes that cause test suite breakage, data bugs, or major regressions.

---

### Migration Pitfall M1: Test Suite Breakage from Hook Signature Changes

**What goes wrong:** When migrating hooks like `useGroups`, `useProfile`, `useAssignments` from useState/useEffect to React Query, the return signature changes (e.g., `loading` becomes `isPending`, new properties like `isError`, `refetch` appear). The existing 103 tests use `vi.mock` to mock these hooks with specific return shapes. Tests break silently or produce false positives.

**Why it happens:** Tests mock the OLD hook return value:
```typescript
// Current test pattern (from CheckInModal.test.tsx, Dashboard.test.tsx)
vi.mocked(useAuth).mockReturnValue({
  user: { id: 'coach-1' },
  loading: false,  // Will become isPending in React Query
  // ... missing: isError, isFetching, refetch, etc.
});
```

**Consequences:**
- Tests pass but don't actually test React Query behavior
- Components may work in tests but fail in production
- Race conditions and loading states go untested

**Warning signs:**
- Search for `loading: false` in test files (should become `isPending`)
- Test files don't import React Query utilities
- Tests don't await or handle loading states

**Prevention:**
1. Create a test utility factory for React Query hook mocks:
   ```typescript
   // src/test/mocks/react-query-hooks.ts
   export function createQueryHookMock<T>(data: T, overrides = {}) {
     return {
       data,
       isPending: false,
       isError: false,
       isFetching: false,
       isSuccess: true,
       refetch: vi.fn(),
       ...overrides,
     };
   }
   ```
2. Update all 103 tests incrementally as each hook migrates
3. Create a migration checklist tracking which tests need updates

**Detection:**
- Run `npm test` after each hook migration
- Look for tests that don't await or handle loading states

**Phase:** Address in the FIRST phase alongside each hook migration. Not as cleanup.

---

### Migration Pitfall M2: Duplicate Error Notifications with useEffect

**What goes wrong:** React Query v5 removed `onSuccess`/`onError` callbacks from useQuery. Developers migrate error handling to useEffect. If the custom hook is called from multiple components, each registers an independent effect, causing duplicate error toasts.

**Why it happens:** The existing `handleError` utility is called per-hook-instance:
```typescript
// Current pattern in useProfile.ts, useGroups.ts
} catch (error) {
  handleError(error, { component: 'useProfile', action: 'fetch profile' });
}
```

When migrating to React Query and using useEffect for error handling:
```typescript
// BAD: Each component instance triggers toast
const { data, error } = useProfile();
useEffect(() => {
  if (error) handleError(error);
}, [error]);
```

**Consequences:**
- User sees 2-3 identical error toasts
- Poor UX, looks like multiple things failed
- Difficult to debug which component caused error

**Warning signs:**
- Search for `useEffect.*error` patterns in migrated hooks
- Manual testing: trigger same error from multiple mounted components
- Watch for "Error" toasts that appear multiple times

**Prevention:**
1. Use React Query's global `queryCache.onError` for centralized error handling:
   ```typescript
   const queryClient = new QueryClient({
     queryCache: new QueryCache({
       onError: (error, query) => {
         handleError(error, { component: String(query.queryKey[0]) });
       },
     }),
   });
   ```
2. Keep `handleError` for mutations only (mutations don't have this duplication issue)
3. If per-query error handling needed, use query-specific `meta` for context

**Phase:** Address in FIRST phase when setting up QueryClient. Document as standard pattern.

---

### Migration Pitfall M3: Stale Closures in Memoized Callbacks

**What goes wrong:** When adding `React.memo`, `useMemo`, and `useCallback`, callbacks capture stale state because dependencies aren't updated properly. This is especially dangerous with the existing imperative fetch patterns.

**Why it happens:** Current hooks use `useCallback` but with manual state management:
```typescript
// From useAssignments.ts
const createAssignment = useCallback(async (input: CreateAssignmentInput) => {
  if (!user) return null;  // user from closure
  setLoading(true);
  // ... uses user.id inside
}, [user, toast]);
```

When migrating to React Query's `useMutation`, developers might:
```typescript
// BAD: Stale closure
const { mutate } = useMutation({
  mutationFn: async (input) => {
    // user might be stale if not in deps
    return supabase.from('assignments').insert({ ...input, assigned_by: user.id });
  }
});

const handleCreate = useCallback(() => {
  mutate(formData);  // formData might be stale
}, []);  // Missing mutate dependency
```

**Consequences:**
- Data saved with wrong user ID
- Forms submit stale data
- Intermittent bugs that are hard to reproduce

**Warning signs:**
- ESLint warnings for exhaustive-deps
- Review all `useCallback` and `useMemo` with empty `[]` dependencies
- Test by rapidly changing state and submitting

**Prevention:**
1. ALWAYS include all used values in dependency arrays
2. Prefer passing values as arguments rather than closing over them:
   ```typescript
   // GOOD
   const { mutate } = useMutation({
     mutationFn: (input: { data: Input; userId: string }) =>
       supabase.from('assignments').insert({ ...input.data, assigned_by: input.userId })
   });

   const handleCreate = useCallback(() => {
     mutate({ data: formData, userId: user.id });
   }, [mutate, formData, user.id]);
   ```
3. Enable `eslint-plugin-react-hooks` exhaustive-deps rule
4. Consider React 19 compiler (if upgrading) which auto-memoizes

**Phase:** Address in memo optimization phase. Add ESLint rule BEFORE starting optimization.

---

### Migration Pitfall M4: Cache Invalidation Key Mismatch

**What goes wrong:** After mutations, the UI doesn't update because `invalidateQueries` uses a key that doesn't match the query's actual key structure.

**Why it happens:** Query keys are hierarchical but invalidation often uses exact match:
```typescript
// Query defined as:
useQuery({ queryKey: ['groups', { coachId: user.id }], ... });

// Invalidation attempts:
queryClient.invalidateQueries({ queryKey: ['groups'] });  // Works (partial match)
queryClient.invalidateQueries({ queryKey: ['groups', 'list'] });  // FAILS (wrong structure)
```

With the existing hooks structure (useGroups fetches with coach_id filter), key management becomes complex.

**Consequences:**
- User creates/updates/deletes item but list doesn't refresh
- Manual page refresh required
- Appears as a "data not saving" bug

**Warning signs:**
- After mutation, check if list updates without manual refresh
- Use React Query DevTools to see if queries are invalidated
- Search for `invalidateQueries` calls and verify key matches

**Prevention:**
1. Create a centralized query key factory:
   ```typescript
   // src/lib/query-keys.ts
   export const queryKeys = {
     groups: {
       all: ['groups'] as const,
       list: (coachId: string) => ['groups', 'list', { coachId }] as const,
       detail: (groupId: string) => ['groups', 'detail', groupId] as const,
     },
     // ... other entities
   };
   ```
2. Use `queryKeys.groups.all` for broad invalidation after mutations
3. Document invalidation strategy in each mutation

**Phase:** Establish query key factory in FIRST phase before any migrations.

---

### Migration Pitfall M5: Infinite Scroll Loading Entire Dataset

**What goes wrong:** When adding pagination with `useInfiniteQuery`, the `getNextPageParam` function doesn't return `undefined` when there are no more pages, causing infinite requests or loading all data at once.

**Why it happens:** Supabase pagination with `.range(from, to)` returns partial data even on last page. Without checking actual count, you can't tell when to stop:
```typescript
// BAD: Never stops fetching
getNextPageParam: (lastPage, allPages) => {
  return allPages.length; // Always returns next page number
}
```

**Consequences:**
- Hundreds of API requests for large datasets
- Browser memory exhaustion
- Server overload
- Supabase rate limiting

**Warning signs:**
- Network tab shows repeated requests to same endpoint
- DevTools memory usage grows continuously
- React Query DevTools shows pages array growing indefinitely

**Prevention:**
1. Include total count in query response:
   ```typescript
   const { data, count } = await supabase
     .from('task_instances')
     .select('*', { count: 'exact' })
     .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

   return { data, count, page };
   ```
2. Calculate if more pages exist:
   ```typescript
   getNextPageParam: (lastPage, allPages) => {
     const totalFetched = allPages.flatMap(p => p.data).length;
     return totalFetched < lastPage.count ? allPages.length : undefined;
   }
   ```
3. Set `initialPageParam: 0` explicitly (v5 requirement)

**Phase:** Address when implementing pagination. Create a standard pagination helper.

---

## Moderate Pitfalls (Migration-Specific)

Mistakes that cause delays, technical debt, or degraded UX.

---

### Migration Pitfall M6: React.memo on Components with Non-Primitive Props

**What goes wrong:** Wrapping components in `React.memo` but passing inline objects/arrays/functions as props, defeating memoization.

**Why it happens:** Easy to miss inline definitions:
```typescript
// BAD: New object every render, memo useless
<TaskCard
  task={task}
  onComplete={() => handleComplete(task.id)}  // New function every render
  style={{ margin: 10 }}  // New object every render
/>
```

The existing codebase passes callbacks inline in many places (e.g., `ManualTemplateBuilder.tsx`, `Dashboard.tsx`).

**Consequences:**
- Performance optimization has no effect
- False confidence in optimization
- Wasted development time

**Warning signs:**
- React DevTools shows component re-rendering despite memo
- Search for `React.memo` components and check their parent's JSX for inline definitions
- Profile before/after to verify improvement

**Prevention:**
1. Use `useCallback` for all callbacks passed to memoized components
2. Define static objects outside component or with `useMemo`
3. Audit props before applying `React.memo`:
   ```typescript
   // GOOD
   const handleComplete = useCallback((id: string) => {
     updateTaskStatus(id, 'completed');
   }, [updateTaskStatus]);

   const cardStyle = useMemo(() => ({ margin: 10 }), []);
   ```
4. Consider using React DevTools Profiler to verify memo is working

**Phase:** Must establish useCallback/useMemo patterns BEFORE adding React.memo.

---

### Migration Pitfall M7: Premature Optimization with useMemo

**What goes wrong:** Adding `useMemo` to simple calculations where the overhead of memoization exceeds the calculation cost.

**Why it happens:** Defensive programming - "memoize everything to be safe":
```typescript
// BAD: Memoization cost > calculation cost
const displayName = useMemo(() =>
  profile?.display_name || 'Coach',
  [profile?.display_name]
);
```

**Consequences:**
- Slightly slower initial render
- More memory usage
- Harder to read code
- No measurable performance benefit

**Warning signs:**
- Code review: `useMemo` with simple expressions
- React DevTools Profiler shows no improvement
- Look for useMemo with primitive return values (strings, numbers, booleans)

**Prevention:**
1. Profile FIRST, optimize SECOND
2. Only memoize:
   - Expensive calculations (array sorting/filtering of 100+ items)
   - Object/array references passed to memoized children
   - Values used in other hooks' dependency arrays
3. Rule of thumb: if calculation is O(1) or O(n) where n < 50, don't memoize

**Phase:** Address in memo optimization phase with clear guidelines.

---

### Migration Pitfall M8: gcTime (cacheTime) Misconfiguration

**What goes wrong:** Setting `gcTime` too short causes repeated fetches; too long causes memory bloat and stale data.

**Why it happens:** Misunderstanding what `gcTime` means:
- `staleTime`: How long data is considered fresh (won't refetch)
- `gcTime`: How long UNUSED queries stay in cache before garbage collection

The project's current test-utils.tsx sets `gcTime: 0` for tests, which is correct. But production config needs thought.

**Consequences:**
- Short gcTime: User navigates away and back, data refetches unnecessarily
- Long gcTime: Memory grows with many queries, stale data shows after logout

**Warning signs:**
- Memory profiling over extended use
- Check if data refetches on navigation
- Review React Query DevTools cache state

**Prevention:**
1. Set appropriate defaults in QueryClient:
   ```typescript
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 1000 * 60 * 5,  // 5 minutes
         gcTime: 1000 * 60 * 30,    // 30 minutes
       },
     },
   });
   ```
2. Shorter gcTime for frequently-changing data (task instances)
3. Longer gcTime for stable data (user profile)
4. Clear cache on logout

**Phase:** Configure in FIRST phase when setting up QueryClient.

---

### Migration Pitfall M9: Test QueryClient Cache Pollution

**What goes wrong:** Tests share QueryClient state, causing test interdependencies and flaky tests.

**Why it happens:** The current test-utils.tsx correctly creates fresh QueryClient per test, but developers might reuse clients:
```typescript
// BAD: Shared client
const queryClient = new QueryClient();

describe('tests', () => {
  it('test 1', () => {
    render(<Component />, { queryClient }); // Pollutes cache
  });

  it('test 2', () => {
    render(<Component />, { queryClient }); // Sees test 1's cached data
  });
});
```

**Consequences:**
- Tests pass individually but fail when run together
- Test order matters (flaky CI)
- Cache from one test affects another

**Warning signs:**
- Tests pass with `npm test -- path/to/test` but fail with `npm test`
- Random test failures in CI

**Prevention:**
1. Keep using `createTestQueryClient()` pattern from test-utils.tsx
2. Never share QueryClient between tests
3. Clear cache in afterEach if client is reused:
   ```typescript
   afterEach(() => {
     queryClient.clear();
   });
   ```

**Phase:** Already handled in existing test-utils.tsx. Document as standard.

---

### Migration Pitfall M10: keepPreviousData Migration Confusion

**What goes wrong:** Migrating from v4's `keepPreviousData: true` to v5's `placeholderData: keepPreviousData` but losing the `dataUpdatedAt` timestamp.

**Why it happens:** Different behavior between options:
- v4 `keepPreviousData`: Provided `dataUpdatedAt` of previous data
- v5 `placeholderData: keepPreviousData`: `dataUpdatedAt` stays at 0

**Consequences:**
- UI shows "last updated: never" or incorrect timestamps
- Confusing UX when showing data freshness indicators

**Warning signs:**
- UI shows "Updated: Invalid Date" or "0"
- Check components that display data freshness

**Prevention:**
1. If showing data timestamps, track manually:
   ```typescript
   const [lastFetched, setLastFetched] = useState<Date | null>(null);

   const { data, isFetching } = useQuery({
     queryKey: ['groups'],
     queryFn: fetchGroups,
     placeholderData: keepPreviousData,
   });

   useEffect(() => {
     if (!isFetching && data) setLastFetched(new Date());
   }, [isFetching, data]);
   ```
2. Don't display timestamps that rely on `dataUpdatedAt` with placeholder data

**Phase:** Address if/when showing data timestamps. Low priority for this app.

---

## Minor Pitfalls (Migration-Specific)

Mistakes that cause annoyance but are easily fixable.

---

### Migration Pitfall M11: isLoading vs isPending Confusion

**What goes wrong:** Using `isLoading` when meaning `isPending`, or vice versa, causing incorrect loading states.

**Why it happens:** React Query v5 renamed `isLoading` to `isPending`. Then added a NEW `isLoading` that means `isPending && isFetching` (same as old `isInitialLoading`).

```typescript
// Confusing:
isPending  // Query has no data yet (loading OR error possible)
isLoading  // Query has no data AND is currently fetching (truly loading)
isFetching // Query is fetching (could be background refetch)
```

**Consequences:**
- Loading spinner shows during background refetches (wrong)
- Loading spinner doesn't show during initial load (wrong)

**Warning signs:**
- Loading spinner appears on every refetch
- No loading state on initial render

**Prevention:**
1. Use `isPending` for "no data yet, show skeleton"
2. Use `isLoading` for "actively loading for first time"
3. Use `isFetching` for "any fetch in progress" (for spinners)
4. Create typed wrapper hooks that expose clear names:
   ```typescript
   const { isInitialLoad, isRefreshing } = useGroupsQuery();
   ```

**Phase:** Document naming convention early. Apply consistently.

---

### Migration Pitfall M12: Suspense Hooks vs Regular Hooks Confusion

**What goes wrong:** Using `useQuery` with `suspense: true` instead of the new `useSuspenseQuery`, causing TypeScript issues and unexpected behavior.

**Why it happens:** v4 pattern was `useQuery({ ..., suspense: true })`. v5 introduces dedicated hooks.

**Consequences:**
- Data might be `undefined` when Suspense should guarantee it
- TypeScript types don't narrow correctly

**Warning signs:**
- TypeScript errors about data possibly being undefined inside Suspense boundary
- Console warnings about deprecated suspense option

**Prevention:**
1. Use `useSuspenseQuery` when component is wrapped in Suspense
2. Use `useQuery` for components handling their own loading states
3. Never mix approaches in same component tree

**Phase:** Decide upfront whether to use Suspense. If not using, ignore this.

---

### Migration Pitfall M13: Forgetting initialPageParam in Infinite Queries

**What goes wrong:** v5 requires `initialPageParam` for `useInfiniteQuery`. Omitting it causes runtime error.

**Why it happens:** v4 defaulted to `undefined`, v5 requires explicit value.

```typescript
// BAD: v5 throws error
useInfiniteQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  // Missing initialPageParam!
});

// GOOD
useInfiniteQuery({
  queryKey: ['tasks'],
  queryFn: fetchTasks,
  initialPageParam: 0,  // Required in v5
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

**Consequences:**
- Runtime error on component mount
- Easy to miss in development if not testing pagination

**Warning signs:**
- TypeScript error at definition
- Runtime error "initialPageParam is required"

**Phase:** Will be caught by TypeScript. Document in pagination guidelines.

---

## Migration Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| QueryClient Setup | Error handling duplication (M2) | Use queryCache.onError, not useEffect |
| Query Key Strategy | Cache invalidation mismatch (M4) | Create query key factory first |
| First Hook Migration | Test suite breakage (M1) | Update tests alongside hook |
| Mutation Patterns | Stale closures (M3) | Pass values as arguments, verify deps |
| Pagination | Infinite loading (M5) | Include count, return undefined |
| React.memo | Non-primitive props (M6) | Audit props before memoizing |
| useMemo/useCallback | Premature optimization (M7) | Profile first, optimize second |
| Cache Configuration | gcTime confusion (M8) | Set sensible defaults, document |

---

## Migration Pre-Flight Checklist

Before migrating a hook to React Query:

1. **Do tests exist for this hook?**
   - If yes: plan to update mocks simultaneously
   - If no: consider writing tests first

2. **What loading/error UI does this hook drive?**
   - Map `loading` to `isPending`
   - Plan error handling (global vs local)

3. **What invalidates this data?**
   - Identify all mutations that should refetch this query
   - Plan query key structure

4. **What's the stale/cache time?**
   - How often does this data change?
   - How fresh does it need to be?

5. **Are there closure dependencies?**
   - Audit useCallback/useMemo in consuming components
   - Check for stale values

---

## Sources (Migration-Specific)

### Official Documentation (HIGH confidence)
- [TanStack Query v5 Migration Guide](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
- [TanStack Query Testing Guide](https://tanstack.com/query/v4/docs/framework/react/guides/testing)
- [TanStack Query Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking)

### Community Sources (MEDIUM confidence)
- [TkDodo: Testing React Query](https://tkdodo.eu/blog/testing-react-query)
- [TkDodo: Automatic Query Invalidation](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations)
- [Migrating to TanStack Query v5 (BigBinary)](https://www.bigbinary.com/blog/migrating-to-tanstack-query-v5)
- [React Query Cache Invalidation (Stackademic)](https://blog.stackademic.com/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1)
- [Stop Misusing Memoization in React (Medium)](https://medium.com/@dipanshushukla50/stop-misusing-memoization-in-react-react-memo-vs-usememo-vs-usecallback-explained-simply-902699eca267)
- [How to useMemo and useCallback: you can remove most of them (developerway.com)](https://www.developerway.com/posts/how-to-use-memo-use-callback)

### Codebase Analysis (HIGH confidence)
- Examined existing hooks: `useAssignments.ts`, `useGroups.ts`, `useProfile.ts`
- Examined existing tests: `CheckInModal.test.tsx`, `Dashboard.test.tsx`, `useAssignments.test.tsx`
- Examined test utilities: `test-utils.tsx`, `supabase.ts` mock
- Verified React Query v5 already installed (`@tanstack/react-query: ^5.83.0`)

---
---

# ADDENDUM: v3.0 Auth & Realtime Pitfalls

**Domain:** Adding auth triggers, realtime sync, and timezone handling to existing React Query app
**Researched:** 2026-01-28
**Confidence:** HIGH (verified with official docs and community issues)
**Context:** Coach/student task management with existing React Query caching, users span multiple timezones, daily recurring tasks need correct rollover

---

## Database Trigger Pitfalls

### CRITICAL: Trigger Failure Blocks User Signup (A1)

**What goes wrong:** If the `on_auth_user_created` trigger fails (constraint violation, null field, permission error), the entire signup transaction fails. Users see "Database error saving new user" but cannot sign up.

**Warning signs:**
- Intermittent signup failures
- Error message mentions "Database error" but OAuth succeeded
- Works in development, fails in production

**Root cause:** Triggers run within the auth transaction. Any unhandled error rolls back the entire signup.

**Prevention:**
```sql
-- WRONG: Fails if any field is null or constraint violated
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'student'); -- Will fail if email null!
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RIGHT: Handle nulls gracefully, use COALESCE
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, created_at)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'requested_role', 'student'),
    NOW()
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail signup
  RAISE WARNING 'Profile creation failed: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

**Phase to address:** Phase 1 (Auth Foundation) - Must be correct before any users created

**Sources:**
- [Supabase Discussion #6518](https://github.com/orgs/supabase/discussions/6518)
- [Supabase Issue #37497](https://github.com/supabase/supabase/issues/37497)

---

### CRITICAL: SECURITY DEFINER Without search_path (A2)

**What goes wrong:** Functions with `SECURITY DEFINER` execute with creator privileges. Without setting `search_path = ''`, malicious actors could exploit schema resolution to execute unintended code.

**Warning signs:**
- Supabase Database Advisor warning: "Function Search Path Mutable"
- RLS policies behaving unexpectedly
- Security audit failures

**Prevention:**
```sql
-- WRONG: Vulnerable to search_path injection
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RIGHT: Explicit search_path and fully qualified names
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

**Phase to address:** Phase 1 (Auth Foundation)

**Sources:**
- [Supabase Discussion #23170](https://github.com/orgs/supabase/discussions/23170)
- [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)

---

### MODERATE: Foreign Key Race Condition (A3)

**What goes wrong:** When inserting into tables that reference `auth.users`, occasional foreign key violations occur because the trigger runs before the user row is fully committed.

**Warning signs:**
- Flaky "foreign key constraint violation" errors (~1 in 10 signups)
- Works most of the time but occasionally fails
- Error mentions parent row doesn't exist

**Prevention:**
```sql
-- Use AFTER INSERT, not BEFORE INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users  -- AFTER, not BEFORE
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Phase to address:** Phase 1 (Auth Foundation)

**Sources:**
- [Supabase Discussion #30334](https://github.com/orgs/supabase/discussions/30334)

---

### MODERATE: Unique Constraint on Nullable Fields (A4)

**What goes wrong:** Setting username or display_name as UNIQUE + NOT NULL causes signup failures when OAuth doesn't provide these fields.

**Warning signs:**
- "duplicate key value violates unique constraint" errors
- OAuth signups fail but email/password works
- Works for some Google accounts but not others

**Prevention:**
- Make display_name NULLABLE or provide default
- Generate unique usernames if needed (e.g., `user_${uuid_short}`)
- Don't enforce uniqueness on profile creation; let users set unique names later

**Phase to address:** Phase 1 (Auth Foundation)

---

## OAuth / Auth Flow Pitfalls

### CRITICAL: user_metadata Not Available from Google OAuth (B1)

**What goes wrong:** Assuming `raw_user_meta_data` will always contain `full_name`, `avatar_url`, or `email` from Google OAuth. Some Google accounts don't provide these fields.

**Warning signs:**
- Trigger fails for some Google accounts but not others
- `user_metadata` is empty or missing expected fields
- Works with test accounts, fails with real users

**Root cause:** Google OAuth scopes, account settings, and privacy configurations affect what data is returned. Some organizational Google accounts restrict profile data.

**Prevention:**
```sql
-- WRONG: Assumes fields exist
INSERT INTO public.profiles (id, name, avatar)
VALUES (
  new.id,
  new.raw_user_meta_data->>'full_name',  -- Might be NULL!
  new.raw_user_meta_data->>'avatar_url'   -- Might be NULL!
);

-- RIGHT: Always use COALESCE with sensible defaults
INSERT INTO public.profiles (id, display_name, avatar_url)
VALUES (
  new.id,
  COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'User'
  ),
  COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    NULL
  )
);
```

**Phase to address:** Phase 1 (Auth Foundation)

**Sources:**
- [Supabase Discussion #4047](https://github.com/orgs/supabase/discussions/4047)
- [Supabase Auth-JS Issue #670](https://github.com/supabase/auth-js/issues/670)

---

### CRITICAL: Using user_metadata for Role-Based Access (B2)

**What goes wrong:** Storing user roles in `user_metadata` and using them in RLS policies. Users can modify their own `user_metadata` via `updateUser()`, escalating privileges.

**Warning signs:**
- Users can access coach-only features
- RLS policies use `auth.jwt()->>'user_metadata'->>'role'`
- Security audit finds privilege escalation

**Prevention:**
```sql
-- WRONG: user_metadata is user-modifiable!
CREATE POLICY "Coaches only" ON tasks
  FOR ALL
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'coach'  -- INSECURE!
  );

-- RIGHT: Use app_metadata (server-only) or separate profiles table
CREATE POLICY "Coaches only" ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- OR: Use Custom Access Token Hook with app_metadata
-- app_metadata can only be set server-side
```

**Phase to address:** Phase 1 (Auth Foundation) - Must be correct from start

**Sources:**
- [Supabase RBAC Guide](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase Discussion #13091](https://github.com/orgs/supabase/discussions/13091)

---

### MODERATE: Custom Claims Don't Update Automatically (B3)

**What goes wrong:** After assigning a user a new role via custom claims, they still have old permissions until they log out and back in.

**Warning signs:**
- Admin promotes user to coach, but user still sees student UI
- Role changes require page refresh or re-login
- Inconsistent behavior between users

**Prevention:**
- Document that role changes require re-login
- Implement "force re-auth" flow when role changes
- Consider using database-based roles (profiles table) instead of JWT claims for frequently changing roles

**Phase to address:** Phase 2 (Role Management)

**Sources:**
- [Supabase Custom Claims Guide](https://github.com/supabase-community/supabase-custom-claims)

---

### MODERATE: Reserved Claim Names (B4)

**What goes wrong:** Using `exp`, `role`, `provider`, or `providers` as custom claim names breaks Supabase functionality.

**Warning signs:**
- Realtime subscriptions fail
- Auth errors with cryptic messages
- JWT validation failures

**Prevention:**
- Never use: `exp`, `role`, `provider`, `providers`
- Use namespaced claims: `app_role`, `user_role`, `custom_role`

**Phase to address:** Phase 1 (Auth Foundation)

---

## Realtime Subscription Pitfalls

### CRITICAL: Memory Leak from Missing Unsubscribe (C1)

**What goes wrong:** Creating Realtime subscriptions without cleanup causes memory leaks. Each mount creates new subscription, unmount doesn't clean up.

**Warning signs:**
- Browser memory usage grows over time
- "WebSocket connection limit exceeded" errors
- App becomes sluggish after extended use
- Multiple duplicate events firing

**Prevention:**
```typescript
// WRONG: No cleanup
useEffect(() => {
  const channel = supabase
    .channel('tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
      (payload) => console.log(payload))
    .subscribe();
  // Missing cleanup!
}, []);

// RIGHT: Proper cleanup
useEffect(() => {
  const channel = supabase
    .channel('tasks-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => handleChange(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

**Phase to address:** Phase 2 (Realtime Foundation)

**Sources:**
- [DrDroid: Supabase Realtime Memory Leak](https://drdroid.io/stack-diagnosis/supabase-realtime-client-side-memory-leak)
- [Supabase Docs: Remove Channel](https://supabase.com/docs/reference/javascript/v1/removesubscription)

---

### CRITICAL: React StrictMode Double Subscription (C2)

**What goes wrong:** In development with StrictMode, effects run twice. If subscription ID changes between mounts, first subscription never gets cleaned up.

**Warning signs:**
- Double events in development only
- Memory grows in development
- Works in production, buggy in development

**Root cause:** React StrictMode intentionally double-mounts to catch cleanup bugs. If your subscription uses generated IDs, the cleanup function references the wrong subscription.

**Prevention:**
```typescript
// WRONG: Dynamic channel name changes between mounts
useEffect(() => {
  const channel = supabase
    .channel(`tasks-${Date.now()}`)  // Different ID each mount!
    .on('postgres_changes', ...)
    .subscribe();

  return () => supabase.removeChannel(channel);  // Removes wrong channel!
}, []);

// RIGHT: Stable channel name or use ref
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  // Remove any existing channel first
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current);
  }

  const channel = supabase
    .channel('tasks-realtime')  // Stable name
    .on('postgres_changes', ...)
    .subscribe();

  channelRef.current = channel;

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, []);
```

**Phase to address:** Phase 2 (Realtime Foundation)

**Sources:**
- [React Issue #30835](https://github.com/facebook/react/issues/30835)
- [LogRocket: useEffect Cleanup](https://blog.logrocket.com/understanding-react-useeffect-cleanup-function/)

---

### CRITICAL: onAuthStateChange Subscription Leak (C3)

**What goes wrong:** Not unsubscribing from `onAuthStateChange` causes GoTrueClient memory leak that persists even after component unmount.

**Warning signs:**
- Memory grows with each page navigation
- Auth state callbacks fire multiple times
- setInterval persists after logout

**Prevention:**
```typescript
// WRONG: No cleanup
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    setUser(session?.user ?? null);
  });
}, []);

// RIGHT: Proper v2 cleanup pattern
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setUser(session?.user ?? null);
    }
  );

  return () => {
    subscription?.unsubscribe();
  };
}, []);
```

**Phase to address:** Phase 1 (Auth Foundation)

**Sources:**
- [Supabase Discussion #5282](https://github.com/orgs/supabase/discussions/5282)
- [Supabase Auth-JS Issue #856](https://github.com/supabase/auth-js/issues/856)

---

### MODERATE: Channel Already Subscribed Error (C4)

**What goes wrong:** Attempting to subscribe to a channel that's already active causes redundant WebSocket connections and potential race conditions.

**Warning signs:**
- Console warning about "Channel Already Subscribed"
- Duplicate events
- Performance degradation

**Prevention:**
```typescript
// Check if channel exists before creating
const existingChannel = supabase.getChannels()
  .find(c => c.topic === 'tasks-realtime');

if (existingChannel) {
  return existingChannel;  // Reuse existing
}

// Create new channel only if none exists
const channel = supabase.channel('tasks-realtime');
```

**Phase to address:** Phase 2 (Realtime Foundation)

**Sources:**
- [DrDroid: Channel Already Subscribed](https://drdroid.io/stack-diagnosis/supabase-realtime-channel-already-subscribed)

---

### MODERATE: Postgres Changes Performance at Scale (C5)

**What goes wrong:** Each Realtime change event requires RLS check per subscribed user. 100 users watching a table = 100 RLS checks per insert.

**Warning signs:**
- Database bottleneck with many concurrent users
- Realtime delays under load
- Timeouts with filtered subscriptions

**Prevention:**
- Use broadcast for non-sensitive data (no RLS check)
- Create separate "public" tables for frequently changing data
- Filter server-side with Realtime Broadcast instead of Postgres Changes
- Consider subscription limits per plan

**Phase to address:** Phase 3 (Optimization) - Not critical for MVP

**Sources:**
- [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)

---

## Timezone Pitfalls

### CRITICAL: Double Timezone Conversion (D1)

**What goes wrong:** Converting timezone twice: once in JavaScript, once by PostgreSQL, resulting in times that are off by the timezone offset (or double the offset).

**Warning signs:**
- Times are off by exactly your timezone offset (e.g., 5 hours)
- Works correctly for UTC users, wrong for everyone else
- Database shows correct time, UI shows wrong time

**Root cause:** node-postgres converts `timestamp without time zone` to JavaScript Date as if it's local time, but it's actually UTC.

**Prevention:**
```sql
-- WRONG: timestamp without time zone
CREATE TABLE tasks (
  due_date timestamp  -- Ambiguous! Is this UTC or local?
);

-- RIGHT: Always use timestamptz
CREATE TABLE tasks (
  due_date timestamptz  -- Stored as UTC, converted on retrieval
);
```

```typescript
// WRONG: Double conversion
const dueDate = new Date(task.due_date);  // Already converted once
const localDate = utcToZonedTime(dueDate, userTimezone);  // Converted again!

// RIGHT: Store display timezone, convert once
const dueDate = new Date(task.due_date);  // Already UTC
const displayDate = formatInTimeZone(dueDate, userTimezone, 'PPP p');
```

**Phase to address:** Phase 3 (Timezone Foundation)

**Sources:**
- [node-postgres Issue #993](https://github.com/brianc/node-postgres/issues/993)
- [PostgreSQL Don't Do This](https://wiki.postgresql.org/wiki/Don't_Do_This)

---

### CRITICAL: Daily Task Rollover at Wrong Time (D2)

**What goes wrong:** Daily recurring tasks roll over at UTC midnight instead of user's local midnight. Users in PST see tasks roll over at 4 PM.

**Warning signs:**
- Tasks appear on wrong day for non-UTC users
- "Today's tasks" include yesterday's tasks
- Rollover happens during user's afternoon

**Prevention:**
```typescript
// WRONG: Compare dates without timezone
const isToday = task.due_date.toDateString() === new Date().toDateString();

// RIGHT: Compare in user's timezone
const isToday = isSameDay(
  utcToZonedTime(task.due_date, userTimezone),
  utcToZonedTime(new Date(), userTimezone)
);
```

Store user's timezone in profile and use it consistently:
```typescript
// User profile
interface Profile {
  timezone: string;  // IANA format: 'America/New_York'
}

// Task filtering
const getUserLocalDay = (timestamp: Date, timezone: string) => {
  return startOfDay(utcToZonedTime(timestamp, timezone));
};
```

**Phase to address:** Phase 3 (Timezone Foundation)

**Sources:**
- [Sunsama Task Rollover](https://help.sunsama.com/docs/task-rollover-and-recurring-tasks-the-basics)
- [Amazing Marvin Rollover](https://help.amazingmarvin.com/en/articles/3670563-rollover-scheduled-tasks)

---

### CRITICAL: DST Transition Bugs (D3)

**What goes wrong:** Recurring tasks scheduled for times that don't exist (2:30 AM on spring forward) or exist twice (1:30 AM on fall back) cause unpredictable behavior.

**Warning signs:**
- Tasks skip a day twice a year
- Tasks fire twice on fall back
- Different behavior for users in different DST regions

**Prevention:**
```typescript
// WRONG: Naive recurrence
const nextOccurrence = addDays(lastOccurrence, 1);

// RIGHT: Use timezone-aware library
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

const getNextOccurrence = (
  lastOccurrence: Date,
  scheduledTime: string,  // '09:00'
  timezone: string
) => {
  // Get next day in user's timezone
  const nextDay = addDays(utcToZonedTime(lastOccurrence, timezone), 1);
  const [hours, minutes] = scheduledTime.split(':').map(Number);

  // Set time in user's timezone (handles DST automatically)
  const nextInTimezone = set(nextDay, { hours, minutes });

  // Convert back to UTC for storage
  return zonedTimeToUtc(nextInTimezone, timezone);
};
```

**Phase to address:** Phase 3 (Timezone Foundation)

**Sources:**
- [dayjs DST Issue #1260](https://github.com/iamkun/dayjs/issues/1260)
- [Sling Academy: DST Handling](https://www.slingacademy.com/article/handling-daylight-saving-time-shifts-gracefully-in-javascript/)

---

### MODERATE: Storing Local Time Instead of UTC (D4)

**What goes wrong:** Storing task times as local time strings ("2024-03-15 09:00") instead of UTC timestamps. When user changes timezone, all their tasks show wrong times.

**Warning signs:**
- User travels to different timezone, tasks show wrong time
- User changes timezone preference, history is wrong
- Can't compare times across users in different timezones

**Prevention:**
- Always store as UTC (`timestamptz` in Postgres)
- Store user's display timezone in their profile
- Convert to display timezone only at render time
- Never store "09:00 AM" - always store full UTC timestamp

**Phase to address:** Phase 3 (Timezone Foundation)

---

### MODERATE: JavaScript Date Object Inconsistency (D5)

**What goes wrong:** JavaScript Date uses current year's DST rules for historical dates, causing incorrect times for past events.

**Warning signs:**
- Historical task times off by 1 hour
- Date calculations for past events incorrect
- Works for recent dates, fails for dates months ago

**Prevention:**
- Use Luxon or date-fns-tz instead of native Date for timezone operations
- These libraries use IANA timezone database with historical DST data
- Never rely on `Date.getTimezoneOffset()` for historical dates

**Phase to address:** Phase 3 (Timezone Foundation)

**Sources:**
- [Illuminated Computing: JS DST](https://illuminatedcomputing.com/posts/2017/11/javascript-timezones/)

---

## Integration Pitfalls (with existing React Query)

### CRITICAL: Realtime Updates Bypass React Query Cache (E1)

**What goes wrong:** Realtime updates from Supabase don't automatically update React Query cache. UI shows stale data until manual refetch.

**Warning signs:**
- Real-time changes visible after page refresh only
- React Query devtools show old data
- Other users' changes not reflected

**Prevention:**
```typescript
// WRONG: Realtime updates state directly, bypassing cache
useEffect(() => {
  const channel = supabase
    .channel('tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        setTasks(prev => [...prev, payload.new]);  // Bypasses React Query!
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);

// RIGHT: Invalidate React Query cache
const queryClient = useQueryClient();

useEffect(() => {
  const channel = supabase
    .channel('tasks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        // Option 1: Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ['tasks'] });

        // Option 2: Optimistic update to cache
        queryClient.setQueryData(['tasks'], (old: Task[]) => {
          if (payload.eventType === 'INSERT') {
            return [...old, payload.new];
          }
          if (payload.eventType === 'UPDATE') {
            return old.map(t => t.id === payload.new.id ? payload.new : t);
          }
          if (payload.eventType === 'DELETE') {
            return old.filter(t => t.id !== payload.old.id);
          }
          return old;
        });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [queryClient]);
```

**Phase to address:** Phase 2 (Realtime Foundation)

**Sources:**
- [MakerKit: Supabase React Query](https://makerkit.dev/blog/saas/supabase-react-query)
- [Supabase Blog: React Query Cache Helpers](https://supabase.com/blog/react-query-nextjs-app-router-cache-helpers)

---

### MODERATE: Conflicting Cache Invalidation (E2)

**What goes wrong:** Realtime listener invalidates cache while mutation is in flight, causing race condition where optimistic update is overwritten.

**Warning signs:**
- Optimistic updates "flash" - appear then disappear
- UI flickers between states
- Works most of the time, occasionally shows wrong data

**Prevention:**
```typescript
// Use mutation callbacks to coordinate with realtime
const mutation = useMutation({
  mutationFn: updateTask,
  onMutate: async (newTask) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['tasks'] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['tasks']);

    // Optimistically update
    queryClient.setQueryData(['tasks'], (old) => ...);

    return { previous };
  },
  onError: (err, newTask, context) => {
    // Rollback on error
    queryClient.setQueryData(['tasks'], context.previous);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});

// In realtime listener, debounce invalidations
const debouncedInvalidate = useMemo(
  () => debounce(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }, 100),
  [queryClient]
);
```

**Phase to address:** Phase 2 (Realtime Foundation)

**Sources:**
- [TanStack Query: Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)

---

### MINOR: Query Key Mismatch (E3)

**What goes wrong:** Realtime invalidates `['tasks']` but component uses `['tasks', { personId: 123 }]`. Cache isn't properly invalidated.

**Warning signs:**
- Some views update, others don't
- Filtered views show stale data
- Works on main list, fails on filtered views

**Prevention:**
```typescript
// Centralize query keys
export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    byPerson: (personId: string) => ['tasks', { personId }] as const,
    byDate: (date: string) => ['tasks', { date }] as const,
  },
};

// In realtime listener, invalidate parent key
queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
// This invalidates all tasks queries due to partial matching
```

**Phase to address:** Phase 2 (Realtime Foundation)

---

## Phase Recommendations

| Pitfall Category | Phase | Priority |
|-----------------|-------|----------|
| Database trigger setup (A1, A3, A4) | Phase 1: Auth Foundation | MUST - blocks all user creation |
| SECURITY DEFINER search_path (A2) | Phase 1: Auth Foundation | MUST - security vulnerability |
| user_metadata fallbacks (B1) | Phase 1: Auth Foundation | MUST - OAuth will fail otherwise |
| Role storage (not in user_metadata) (B2) | Phase 1: Auth Foundation | MUST - security vulnerability |
| Reserved claim names (B4) | Phase 1: Auth Foundation | MUST - breaks Realtime |
| onAuthStateChange cleanup (C3) | Phase 1: Auth Foundation | SHOULD - memory leak |
| Custom claims updates (B3) | Phase 2: Role Management | SHOULD - UX issue |
| Realtime subscription cleanup (C1, C2) | Phase 2: Realtime | MUST - memory leak |
| Channel reuse (C4) | Phase 2: Realtime | SHOULD - performance |
| React Query cache integration (E1, E2, E3) | Phase 2: Realtime | MUST - data consistency |
| timestamptz for all dates (D1) | Phase 3: Timezone | MUST - data integrity |
| User timezone in profile (D2) | Phase 3: Timezone | MUST - correct display |
| DST-aware recurrence (D3) | Phase 3: Timezone | SHOULD - edge case handling |
| date-fns-tz usage (D5) | Phase 3: Timezone | SHOULD - historical accuracy |
| Storing local time (D4) | Phase 3: Timezone | MUST - data integrity |
| Realtime performance at scale (C5) | Post-MVP | COULD - optimization |

---

## Testing Checklist

Before each phase is complete, verify:

**Phase 1 (Auth):**
- [ ] Signup works with Google accounts that have minimal profile data
- [ ] Trigger doesn't block signup on any failure
- [ ] Role cannot be escalated via updateUser()
- [ ] No Supabase Database Advisor warnings
- [ ] onAuthStateChange properly cleaned up in React components

**Phase 2 (Realtime):**
- [ ] Browser memory stable after 10 page navigations
- [ ] No duplicate events in StrictMode
- [ ] Realtime updates appear in React Query devtools
- [ ] Optimistic updates don't flicker
- [ ] No "Channel Already Subscribed" warnings

**Phase 3 (Timezone):**
- [ ] User in different timezone sees correct "today"
- [ ] Tasks rollover at user's midnight, not UTC
- [ ] Historical task times are correct
- [ ] Time displays correctly after DST transition

---

## Sources (v3.0)

### Official Documentation (HIGH confidence)
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)
- [Supabase RBAC Guide](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime/postgres-changes)
- [PostgreSQL Don't Do This](https://wiki.postgresql.org/wiki/Don't_Do_This)

### Community Sources (MEDIUM confidence)
- [Supabase Discussion #6518 - Trigger Signup Failures](https://github.com/orgs/supabase/discussions/6518)
- [Supabase Issue #37497 - Misleading OAuth Errors](https://github.com/supabase/supabase/issues/37497)
- [Supabase Discussion #4047 - Missing user_metadata](https://github.com/orgs/supabase/discussions/4047)
- [Supabase Discussion #13091 - user_metadata Security](https://github.com/orgs/supabase/discussions/13091)
- [Supabase Discussion #5282 - onAuthStateChange Cleanup](https://github.com/orgs/supabase/discussions/5282)
- [DrDroid Supabase Realtime Diagnostics](https://drdroid.io/stack-diagnosis/supabase-realtime-client-side-memory-leak)
- [MakerKit: Supabase React Query](https://makerkit.dev/blog/saas/supabase-react-query)

---

*v3.0 Pitfalls research: 2026-01-28*
*Confidence: HIGH - verified with official docs and community issue discussions*
