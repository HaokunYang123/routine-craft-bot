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
