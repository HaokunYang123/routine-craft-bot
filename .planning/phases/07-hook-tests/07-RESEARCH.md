# Phase 7: Hook Tests - Research

**Researched:** 2026-01-25
**Domain:** React Hook Testing (Vitest, React Testing Library, Supabase mocking)
**Confidence:** HIGH

## Summary

This research covers testing React custom hooks that interact with Supabase (auth and database), React Router navigation, and implement complex async logic with retry behavior. The project has established test infrastructure from Phase 3 including Vitest with jsdom, a chainable Supabase mock factory, and test utilities with wrapped render.

The four hooks requiring tests are:
1. **useAuth** - Auth state management with `onAuthStateChange` subscription, session persistence, and sign-out
2. **useAssignments** - CRUD operations with complex scheduling logic (once, daily, weekly, custom)
3. **useGroups** - Group CRUD and member management with joined queries
4. **useAIAssistant** - Edge function calls with timeout handling, retry logic, and cancellation

**Primary recommendation:** Use `renderHook` from `@testing-library/react` (not the deprecated `@testing-library/react-hooks`) with custom wrappers for providers. Test hooks in isolation using the established Supabase mock factory. Use `vi.useFakeTimers()` for timeout/retry testing in useAIAssistant.

## Standard Stack

The established libraries/tools for hook testing (already installed in Phase 3):

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.18 | Test runner with fake timers | Native Vite integration, `vi.useFakeTimers()` for timeout testing |
| @testing-library/react | ^16.3.2 | `renderHook` and `waitFor` utilities | Official location for hook testing since RTL v13.1 |
| @testing-library/jest-dom | ^6.9.1 | DOM assertions | Extended matchers for state verification |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/user-event | ^14.6.1 | User interaction simulation | Not needed for pure hook tests |
| jsdom | ^27.4.0 | DOM simulation | Required for hooks using DOM APIs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct mock of supabase | MSW (Mock Service Worker) | MSW intercepts HTTP - better for integration tests but more setup; direct mock is simpler for unit tests |
| `renderHook` | Render hook in test component | Test component approach is more verbose but shows real usage |

**No new installation needed** - all required packages are already installed from Phase 3.

## Architecture Patterns

### Recommended Test File Structure
```
src/
├── hooks/
│   ├── useAuth.tsx
│   ├── useAuth.test.tsx         # Co-located test file
│   ├── useAssignments.ts
│   ├── useAssignments.test.ts
│   ├── useGroups.ts
│   ├── useGroups.test.ts
│   ├── useAIAssistant.ts
│   └── useAIAssistant.test.ts
└── test/
    ├── mocks/
    │   └── supabase.ts          # Existing mock factory
    ├── test-utils.tsx           # Existing render wrapper
    └── setup.ts                 # Existing setup
```

### Pattern 1: Hook Test with Wrapper for Providers
**What:** Custom wrapper for `renderHook` that provides required context (Router, QueryClient)
**When to use:** Testing hooks that use `useNavigate`, React Query, or other context-dependent features
**Example:**
```typescript
// Source: https://testing-library.com/docs/react-testing-library/api/
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

test('hook with providers', async () => {
  const { result } = renderHook(() => useMyHook(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

### Pattern 2: Mocking Supabase Auth Subscription
**What:** Mock `onAuthStateChange` to simulate auth events in tests
**When to use:** Testing useAuth hook states (loading, authenticated, unauthenticated, session expired)
**Example:**
```typescript
// Source: Existing project mock + Vitest docs
import { vi } from 'vitest';
import { getMockSupabase, resetMockSupabase, mockSupabaseModule } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => mockSupabaseModule);

describe('useAuth', () => {
  let authStateCallback: ((event: string, session: unknown) => void) | null = null;

  beforeEach(() => {
    resetMockSupabase();
    const mock = getMockSupabase();

    // Capture the auth state change callback
    mock.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  it('transitions from loading to authenticated', async () => {
    const mockSession = { user: { id: 'user-1', email: 'test@example.com' } };
    getMockSupabase().auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user?.id).toBe('user-1');
    expect(result.current.session).toBeDefined();
  });

  it('handles session expiry via SIGNED_OUT event', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate session expiry
    act(() => {
      authStateCallback?.('SIGNED_OUT', null);
    });

    expect(result.current.sessionExpired).toBe(true);
  });
});
```

### Pattern 3: Testing Async CRUD Operations with Supabase Mock
**What:** Mock Supabase query chain responses for CRUD operations
**When to use:** Testing useAssignments and useGroups hooks
**Example:**
```typescript
// Source: Project's existing supabase mock pattern
describe('useAssignments', () => {
  beforeEach(() => {
    resetMockSupabase();
  });

  it('creates assignment with task instances', async () => {
    const mock = getMockSupabase();

    // Mock user context (useAuth dependency)
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'coach-1' } as User,
      session: {} as Session,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    // Mock assignment insert
    mock.setResponse({
      data: { id: 'assignment-1', assigned_by: 'coach-1' },
      error: null,
    });

    // Mock group members fetch
    mock.setArrayResponse({
      data: [{ user_id: 'student-1' }],
      error: null,
    });

    // Mock task instances insert
    mock.setArrayResponse({
      data: [{ id: 'task-1', assignee_id: 'student-1' }],
      error: null,
    });

    const { result } = renderHook(() => useAssignments(), { wrapper: createWrapper() });

    let assignment: unknown;
    await act(async () => {
      assignment = await result.current.createAssignment({
        group_id: 'group-1',
        schedule_type: 'once',
        start_date: '2026-01-25',
        tasks: [{ name: 'Task 1', day_offset: 0 }],
      });
    });

    expect(assignment).toBeDefined();
    expect(mock.client.from).toHaveBeenCalledWith('assignments');
    expect(mock.queryBuilder.insert).toHaveBeenCalled();
  });
});
```

### Pattern 4: Testing Timeout and Retry with Fake Timers
**What:** Use `vi.useFakeTimers()` to test timeout handling and exponential backoff
**When to use:** Testing useAIAssistant timeout and retry behavior
**Example:**
```typescript
// Source: https://vitest.dev/guide/mocking/timers
describe('useAIAssistant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMockSupabase();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries on timeout with exponential backoff', async () => {
    const mock = getMockSupabase();

    // First two calls timeout, third succeeds
    mock.client.functions = {
      invoke: vi.fn()
        .mockRejectedValueOnce({ name: 'AbortError', message: 'timeout' })
        .mockRejectedValueOnce({ name: 'AbortError', message: 'timeout' })
        .mockResolvedValueOnce({
          data: { result: 'success' },
          error: null,
        }),
    };

    const { result } = renderHook(() => useAIAssistant(), { wrapper: createWrapper() });

    // Start the request
    const requestPromise = result.current.generatePlan('test plan');

    // Advance through retry delays: 1000ms, 2000ms, 4000ms
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const response = await requestPromise;

    expect(response.success).toBe(true);
    expect(mock.client.functions.invoke).toHaveBeenCalledTimes(3);
  });

  it('cancels pending request on unmount', async () => {
    const { result, unmount } = renderHook(() => useAIAssistant(), {
      wrapper: createWrapper(),
    });

    // Start request
    const requestPromise = result.current.generatePlan('test');

    // Unmount before completion
    unmount();

    const response = await requestPromise;
    expect(response.error).toBe('Request cancelled');
  });
});
```

### Pattern 5: Mock useAuth for Dependent Hooks
**What:** Mock useAuth when testing hooks that depend on it
**When to use:** useAssignments, useGroups, useAIAssistant all depend on useAuth
**Example:**
```typescript
// Source: Vitest mocking docs
import { useAuth } from './useAuth';

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    loading: false,
    signOut: vi.fn(),
    sessionExpired: false,
    clearSessionExpired: vi.fn(),
  });
});
```

### Anti-Patterns to Avoid
- **Not wrapping state updates in `act()`:** Always use `act()` when calling hook functions that update state
- **Destructuring `result.current` too early:** Values lose reactivity when destructured; always access via `result.current.property`
- **Sharing QueryClient across tests:** Creates test pollution; use `createWrapper()` per test
- **Forgetting to reset mocks:** Call `resetMockSupabase()` in `beforeEach` to clear mock state
- **Testing internal implementation:** Test observable behavior (returned values, state changes), not internal calls

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hook test isolation | Manual cleanup | `renderHook` with fresh wrapper | RTL handles cleanup automatically |
| Async state assertions | Manual polling | `waitFor(() => expect(...))` | Handles timing automatically |
| Timer control | Real setTimeout | `vi.useFakeTimers()` | Deterministic, fast tests |
| Auth state simulation | Real Supabase calls | Mock `onAuthStateChange` callback | Controllable, no network |
| Response mocking | MSW for unit tests | Direct Supabase mock | Simpler for unit tests |

**Key insight:** The existing Supabase mock factory from Phase 3 handles the complex chaining patterns. Leverage it rather than creating new mocks.

## Common Pitfalls

### Pitfall 1: renderHook Result Destructuring
**What goes wrong:** Test assertions fail unexpectedly because values don't update
**Why it happens:** Destructuring `result.current` captures the value at that moment
**How to avoid:** Always access via `result.current.property` in assertions
**Warning signs:** Assertions fail even though hook state clearly changed
```typescript
// BAD - loses reactivity
const { loading } = result.current;
await waitFor(() => expect(loading).toBe(false)); // Always sees initial value!

// GOOD - maintains reactivity
await waitFor(() => expect(result.current.loading).toBe(false));
```

### Pitfall 2: Missing act() for State Updates
**What goes wrong:** Warning: "An update to X inside a test was not wrapped in act(...)"
**Why it happens:** Calling hook functions that trigger state updates outside of `act()`
**How to avoid:** Wrap all hook function calls in `act()` or `await act(async () => ...)`
**Warning signs:** act() warnings in console, flaky tests
```typescript
// BAD - missing act()
const response = await result.current.createAssignment(input);

// GOOD - wrapped in act()
let response;
await act(async () => {
  response = await result.current.createAssignment(input);
});
```

### Pitfall 3: useNavigate Mock Placement
**What goes wrong:** "useNavigate() may be used only in the context of a <Router> component"
**Why it happens:** useAuth uses useNavigate, but mock placement is wrong
**How to avoid:** Either wrap with MemoryRouter in test wrapper, OR mock `react-router-dom` (not `react-router`)
**Warning signs:** Router context errors in hook tests
```typescript
// Option A: Use MemoryRouter wrapper (recommended)
function createWrapper() {
  return ({ children }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );
}

// Option B: Mock useNavigate directly (if needed for assertions)
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
```

### Pitfall 4: Fake Timers with Async Code
**What goes wrong:** Tests hang or timeout when using fake timers with async operations
**Why it happens:** Fake timers freeze time, but async operations need time to resolve
**How to avoid:** Use `vi.advanceTimersByTimeAsync()` for async code, or selectively mock timers
**Warning signs:** Tests hang indefinitely with fake timers enabled
```typescript
// BAD - hangs because Promise.resolve needs microtask queue
vi.advanceTimersByTime(1000);

// GOOD - advances timers AND flushes promises
await vi.advanceTimersByTimeAsync(1000);
```

### Pitfall 5: Testing Hook Dependencies vs Hook Itself
**What goes wrong:** Tests for useAssignments fail because useAuth returns null user
**Why it happens:** Hooks often depend on other hooks (useAuth, useToast)
**How to avoid:** Mock dependent hooks OR test them in isolation first
**Warning signs:** "Cannot read property of null" errors in hook tests
```typescript
// Mock useAuth for hooks that depend on it
vi.mock('./useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    loading: false,
  })),
}));
```

### Pitfall 6: Supabase Mock Chaining Order
**What goes wrong:** `setResponse` doesn't work, queries return unexpected results
**Why it happens:** `setResponse` uses `mockResolvedValueOnce` - order matters
**How to avoid:** Set responses in the order they'll be called, or use `mockResolvedValue` for default
**Warning signs:** First query works, subsequent queries return null

## Code Examples

Verified patterns from official sources and project context:

### Complete useAuth Test Suite Structure
```typescript
// src/hooks/useAuth.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from './useAuth';
import { getMockSupabase, resetMockSupabase, mockSupabaseModule, createMockSession } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => mockSupabaseModule);

// Mock useNavigate to capture navigation calls
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );
}

describe('useAuth', () => {
  let authStateCallback: ((event: string, session: unknown) => void) | null = null;

  beforeEach(() => {
    resetMockSupabase();
    mockNavigate.mockClear();

    const mock = getMockSupabase();
    mock.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  describe('loading state', () => {
    it('starts in loading state', () => {
      getMockSupabase().auth.getSession.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });
  });

  describe('authenticated state', () => {
    it('sets user when session exists', async () => {
      const mockSession = createMockSession({ userId: 'user-1' });
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.id).toBe('user-1');
      expect(result.current.session).toBeDefined();
    });
  });

  describe('unauthenticated state', () => {
    it('sets user to null when no session', async () => {
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('session expiry', () => {
    it('sets sessionExpired on SIGNED_OUT event', async () => {
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        authStateCallback?.('SIGNED_OUT', null);
      });

      expect(result.current.sessionExpired).toBe(true);
    });

    it('clears sessionExpired on TOKEN_REFRESHED', async () => {
      // Setup with expired session
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => authStateCallback?.('SIGNED_OUT', null));
      expect(result.current.sessionExpired).toBe(true);

      // Simulate token refresh
      const newSession = createMockSession();
      act(() => authStateCallback?.('TOKEN_REFRESHED', newSession));

      expect(result.current.sessionExpired).toBe(false);
    });
  });

  describe('signOut', () => {
    it('navigates to home and signs out', async () => {
      const mockSession = createMockSession();
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(getMockSupabase().auth.signOut).toHaveBeenCalled();
    });
  });
});
```
Source: [React Testing Library renderHook API](https://testing-library.com/docs/react-testing-library/api/)

### useAIAssistant Timeout Testing with Fake Timers
```typescript
// src/hooks/useAIAssistant.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAIAssistant } from './useAIAssistant';
import { useAuth } from './useAuth';
import { getMockSupabase, resetMockSupabase, mockSupabaseModule } from '@/test/mocks/supabase';

vi.mock('@/integrations/supabase/client', () => mockSupabaseModule);
vi.mock('./useAuth');

describe('useAIAssistant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMockSupabase();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    } as ReturnType<typeof useAuth>);

    // Add functions mock to supabase client
    const mock = getMockSupabase();
    mock.client.functions = {
      invoke: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timeout handling', () => {
    it('returns timeout error after max retries', async () => {
      const mock = getMockSupabase();
      mock.client.functions.invoke.mockRejectedValue({
        name: 'AbortError',
        message: 'The operation was aborted',
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: { success: boolean; error?: string };

      act(() => {
        result.current.generatePlan('test').then(r => { response = r; });
      });

      // Advance through all retry delays: 1s + 2s + 4s = 7s total
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000); // First retry
        await vi.advanceTimersByTimeAsync(2000); // Second retry
        await vi.advanceTimersByTimeAsync(4000); // Third retry (exhausted)
      });

      await waitFor(() => {
        expect(response).toBeDefined();
      });

      expect(response!.success).toBe(false);
      expect(response!.error).toContain('timed out');
    });

    it('succeeds after retry on transient error', async () => {
      const mock = getMockSupabase();
      mock.client.functions.invoke
        .mockRejectedValueOnce({ name: 'AbortError', message: 'timeout' })
        .mockResolvedValueOnce({
          data: { result: { name: 'Test Plan', tasks: [] } },
          error: null,
        });

      const { result } = renderHook(() => useAIAssistant());

      let response: unknown;
      act(() => {
        result.current.generatePlan('test').then(r => { response = r; });
      });

      // Advance past first retry delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      await waitFor(() => {
        expect(response).toBeDefined();
      });

      expect((response as { success: boolean }).success).toBe(true);
    });
  });

  describe('cancellation', () => {
    it('cancels pending request when cancel() called', async () => {
      const mock = getMockSupabase();
      mock.client.functions.invoke.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAIAssistant());

      let response: unknown;
      act(() => {
        result.current.generatePlan('test').then(r => { response = r; });
      });

      act(() => {
        result.current.cancel();
      });

      await waitFor(() => {
        expect(response).toBeDefined();
      });

      expect((response as { error: string }).error).toBe('Request cancelled');
    });
  });

  describe('non-retryable errors', () => {
    it('does not retry auth errors (401)', async () => {
      const mock = getMockSupabase();
      mock.client.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized', status: 401 },
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: unknown;
      await act(async () => {
        response = await result.current.generatePlan('test');
      });

      expect(mock.client.functions.invoke).toHaveBeenCalledTimes(1); // No retry
      expect((response as { error: string }).error).toContain('Session expired');
    });
  });
});
```
Source: [Vitest Fake Timers](https://vitest.dev/guide/mocking/timers)

### useAssignments Scheduling Logic Tests
```typescript
// src/hooks/useAssignments.test.ts (partial - scheduling tests)
describe('useAssignments scheduling logic', () => {
  describe('schedule_type: once', () => {
    it('creates single task on start_date', async () => {
      // Setup mocks...
      const input = {
        assignee_id: 'student-1',
        schedule_type: 'once' as const,
        start_date: '2026-01-25',
        tasks: [{ name: 'One-time task', day_offset: 0 }],
      };

      await act(async () => {
        await result.current.createAssignment(input);
      });

      // Verify task_instances insert
      expect(mock.queryBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            scheduled_date: '2026-01-25',
            name: 'One-time task',
          }),
        ])
      );
    });
  });

  describe('schedule_type: daily', () => {
    it('creates tasks for each day in range', async () => {
      const input = {
        assignee_id: 'student-1',
        schedule_type: 'daily' as const,
        start_date: '2026-01-25',
        end_date: '2026-01-27', // 3 days
        tasks: [{ name: 'Daily task', day_offset: 0 }],
      };

      await act(async () => {
        await result.current.createAssignment(input);
      });

      // Verify 3 task instances created
      const insertCalls = mock.queryBuilder.insert.mock.calls;
      const taskInstances = insertCalls.find(call =>
        Array.isArray(call[0]) && call[0][0]?.scheduled_date
      )?.[0];

      expect(taskInstances).toHaveLength(3);
      expect(taskInstances.map(t => t.scheduled_date)).toEqual([
        '2026-01-25',
        '2026-01-26',
        '2026-01-27',
      ]);
    });
  });

  describe('schedule_type: weekly', () => {
    it('creates tasks on same day of week as start_date', async () => {
      // 2026-01-25 is Sunday
      const input = {
        assignee_id: 'student-1',
        schedule_type: 'weekly' as const,
        start_date: '2026-01-25', // Sunday
        end_date: '2026-02-08', // 2 weeks
        tasks: [{ name: 'Weekly task', day_offset: 0 }],
      };

      await act(async () => {
        await result.current.createAssignment(input);
      });

      // Verify tasks on Sundays only
      const taskInstances = /* extract from mock */;
      expect(taskInstances.map(t => t.scheduled_date)).toEqual([
        '2026-01-25', // Sunday
        '2026-02-01', // Sunday
        '2026-02-08', // Sunday
      ]);
    });
  });

  describe('schedule_type: custom', () => {
    it('creates tasks only on specified days', async () => {
      const input = {
        assignee_id: 'student-1',
        schedule_type: 'custom' as const,
        schedule_days: [1, 3, 5], // Mon, Wed, Fri
        start_date: '2026-01-26', // Monday
        end_date: '2026-02-01', // Sunday
        tasks: [{ name: 'Custom task', day_offset: 0 }],
      };

      await act(async () => {
        await result.current.createAssignment(input);
      });

      // Verify only Mon/Wed/Fri
      const taskInstances = /* extract from mock */;
      expect(taskInstances.map(t => t.scheduled_date)).toEqual([
        '2026-01-26', // Monday
        '2026-01-28', // Wednesday
        '2026-01-30', // Friday
      ]);
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@testing-library/react-hooks` | `@testing-library/react` renderHook | RTL v13.1 (2022) | One less dependency, same API |
| Sync `vi.advanceTimersByTime` | Async `vi.advanceTimersByTimeAsync` | Vitest 1.0+ | Required for async code with fake timers |
| `result.current.waitFor` | RTL `waitFor` import | RTL v13+ | waitFor no longer on renderHook result |
| `waitForNextUpdate()` | `waitFor(() => ...)` | RTL v13+ | More explicit, same effect |

**Deprecated/outdated:**
- `@testing-library/react-hooks`: Deprecated, use `@testing-library/react` instead
- `result.waitForNextUpdate()`: Removed in RTL v13+, use `waitFor(() => expect(...))` pattern
- Sync timer advances with async code: Use `advanceTimersByTimeAsync` for async operations

## Open Questions

Things that couldn't be fully resolved:

1. **Edge function mock vs real invocation**
   - What we know: Supabase `functions.invoke()` can be mocked directly
   - What's unclear: Whether to mock at functions level or HTTP level (MSW)
   - Recommendation: Mock `functions.invoke()` directly for unit tests; consider MSW for integration tests if needed

2. **Toast verification in hook tests**
   - What we know: useAssignments and useGroups call `toast()` for feedback
   - What's unclear: Whether to verify toast calls in hook tests or just in integration tests
   - Recommendation: Mock useToast and verify it was called with expected messages for important flows

3. **Testing useAuth subscription cleanup**
   - What we know: useAuth returns unsubscribe function in useEffect cleanup
   - What's unclear: How to reliably test subscription cleanup
   - Recommendation: Verify unsubscribe mock is called on unmount via `renderHook` unmount callback

## Sources

### Primary (HIGH confidence)
- [React Testing Library API - renderHook](https://testing-library.com/docs/react-testing-library/api/) - Official RTL docs for hook testing
- [Vitest Fake Timers Guide](https://vitest.dev/guide/mocking/timers) - Official Vitest timer mocking
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) - Official vi.mock, vi.fn, vi.spyOn docs
- [Testing React Query](https://tkdodo.eu/blog/testing-react-query) - Best practices for QueryClient in tests

### Secondary (MEDIUM confidence)
- [Test React Hooks with Vitest](https://mayashavin.com/articles/test-react-hooks-with-vitest) - Practical patterns for hook testing
- [Testing React Router useNavigate](https://blog.logrocket.com/testing-react-router-usenavigate-hook-react-testing-library/) - Mock patterns for navigation
- [This Dot Labs - Vitest Custom Hooks](https://www.thisdot.co/blog/how-to-test-react-custom-hooks-and-components-with-vitest) - Additional hook testing patterns

### Tertiary (LOW confidence)
- Community discussions on mocking Supabase auth - Patterns vary, adapt to project's existing mock factory

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already established in Phase 3, versions verified
- Architecture patterns: HIGH - Based on official RTL/Vitest docs and project context
- Pitfalls: HIGH - Common issues well-documented across sources
- Supabase-specific mocking: MEDIUM - Patterns adapted from project's existing mock factory

**Research date:** 2026-01-25
**Valid until:** 2026-03-25 (60 days - testing patterns are stable)
