# Test Architecture Patterns

**Domain:** React 18 + Vite + Supabase Application Testing
**Researched:** 2026-01-24
**Confidence:** HIGH (based on Vitest/RTL established patterns and codebase analysis)

## Executive Summary

This document defines the test architecture for a React 18 + Vite + Supabase application with zero existing tests. The architecture prioritizes **colocated tests** for maintainability, a **layered mock strategy** for Supabase, and a **phased implementation order** that builds test infrastructure incrementally.

Key insight from codebase analysis: The hooks (e.g., `useAssignments`, `useGroups`, `useAuth`) are the critical layer containing business logic and Supabase interactions. Testing these hooks thoroughly provides the highest value with the lowest complexity.

---

## Recommended Test Architecture

```
src/
├── __mocks__/                    # Global mocks (shared across tests)
│   └── supabase.ts               # Supabase client mock factory
│
├── __tests__/                    # Integration/E2E tests (cross-cutting)
│   ├── setup.ts                  # Test setup (jsdom, global mocks)
│   └── integration/              # Full flow tests
│       └── assignment-flow.test.ts
│
├── hooks/
│   ├── useAuth.tsx
│   ├── useAuth.test.ts           # Colocated hook test
│   ├── useAssignments.ts
│   ├── useAssignments.test.ts    # Colocated hook test
│   ├── useGroups.ts
│   └── useGroups.test.ts         # Colocated hook test
│
├── components/
│   ├── ProtectedRoute.tsx
│   ├── ProtectedRoute.test.tsx   # Colocated component test
│   ├── ui/                       # shadcn/ui - DO NOT TEST
│   └── dashboard/
│       ├── TaskList.tsx
│       └── TaskList.test.tsx     # Colocated component test
│
├── lib/
│   ├── utils.ts
│   └── utils.test.ts             # Colocated utility tests
│
└── pages/
    └── student/                  # Large pages - test via hooks + key components
        └── StudentDashboard.tsx  # No direct test; covered via hook/component tests
```

---

## Component Boundaries

| Component Type | Location | Test Location | What to Test | What to Skip |
|----------------|----------|---------------|--------------|--------------|
| **Utility functions** | `src/lib/utils.ts` | `src/lib/utils.test.ts` | Pure functions, date parsing, formatting | N/A |
| **Custom hooks** | `src/hooks/*.ts` | `src/hooks/*.test.ts` | State changes, Supabase calls, error handling | Internal implementation details |
| **UI primitives** | `src/components/ui/*` | None | **Do not test** - shadcn/ui is third-party | Everything |
| **Feature components** | `src/components/**/*.tsx` | `src/components/**/*.test.tsx` | User interactions, conditional rendering | Styling |
| **Page components** | `src/pages/*.tsx` | Via hooks/components | Complex pages tested through their dependencies | Direct page tests (too brittle) |
| **Edge functions** | `supabase/functions/*` | `supabase/functions/__tests__/*` | Request/response handling | Supabase runtime |

---

## Data Flow

```
User Action
    │
    ▼
┌─────────────────┐
│  Page Component │ ◄─── Large components (e.g., CoachCalendar.tsx at 62K)
│  (1000+ lines)  │      Test indirectly via hooks and sub-components
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Feature Hooks   │ ◄─── PRIMARY TEST TARGET
│ (useAssignments,│      Contains business logic and Supabase calls
│  useGroups, etc)│      High value, moderate complexity
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase Client │ ◄─── Mock at this boundary
│ (supabase.ts)   │      Never hit real database in tests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase DB     │ ◄─── NOT IN UNIT TESTS
│ (Real backend)  │      Only E2E/integration against test DB
└─────────────────┘
```

---

## Supabase Mock Strategy

The Supabase client uses a chainable API pattern. The mock must support method chaining.

### Mock Factory Pattern

```typescript
// src/__mocks__/supabase.ts

import { vi } from 'vitest';

// Type-safe mock that supports chaining
export function createSupabaseMock() {
  const mockChain = {
    select: vi.fn(() => mockChain),
    insert: vi.fn(() => mockChain),
    update: vi.fn(() => mockChain),
    delete: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    neq: vi.fn(() => mockChain),
    in: vi.fn(() => mockChain),
    gte: vi.fn(() => mockChain),
    lte: vi.fn(() => mockChain),
    order: vi.fn(() => mockChain),
    single: vi.fn(() => mockChain),
    // Terminal methods return promises
    then: vi.fn((resolve) => resolve({ data: null, error: null })),
  };

  const mockFrom = vi.fn(() => mockChain);

  const mockAuth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
  };

  return {
    from: mockFrom,
    auth: mockAuth,
    _chain: mockChain, // Expose for test assertions
    _resetMocks: () => {
      vi.clearAllMocks();
    },
  };
}

// Singleton for import mocking
export const supabaseMock = createSupabaseMock();

// Default export matches real client structure
export const supabase = supabaseMock;
```

### Per-Test Mock Setup

```typescript
// Example: useGroups.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useGroups } from './useGroups';
import { supabaseMock } from '@/__mocks__/supabase';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

// Mock dependencies
vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' }, loading: false }),
}));

vi.mock('./use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('useGroups', () => {
  beforeEach(() => {
    supabaseMock._resetMocks();
  });

  it('fetches groups for authenticated user', async () => {
    // Arrange: Configure mock to return specific data
    const mockGroups = [
      { id: '1', name: 'Group A', color: '#ff0000', icon: 'users', coach_id: 'test-user-id' },
    ];

    supabaseMock._chain.then.mockImplementation((resolve) =>
      resolve({ data: mockGroups, error: null })
    );

    // Act
    const { result } = renderHook(() => useGroups());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('groups');
    expect(result.current.groups).toHaveLength(1);
  });

  it('handles fetch error gracefully', async () => {
    // Arrange: Configure mock to return error
    supabaseMock._chain.then.mockImplementation((resolve) =>
      resolve({ data: null, error: { message: 'Network error' } })
    );

    // Act
    const { result } = renderHook(() => useGroups());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groups).toEqual([]);
  });
});
```

---

## Patterns to Follow

### Pattern 1: Wrapper for Hook Tests with Router Dependencies

Many hooks use `useNavigate`. Provide a router wrapper.

```typescript
// src/__tests__/setup.ts

import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

export function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <BrowserRouter>{children}</BrowserRouter>;
  };
}
```

Usage:
```typescript
const { result } = renderHook(() => useAuth(), {
  wrapper: createWrapper(),
});
```

### Pattern 2: Test Data Factories

Create consistent test data with factory functions.

```typescript
// src/__tests__/factories.ts

export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockGroup(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Group',
    color: '#3b82f6',
    icon: 'users',
    coach_id: 'test-user-id',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockAssignment(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    template_id: null,
    group_id: null,
    assignee_id: 'test-assignee-id',
    assigned_by: 'test-user-id',
    schedule_type: 'once',
    schedule_days: [],
    start_date: '2026-01-24',
    end_date: null,
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
```

### Pattern 3: Arrange-Act-Assert Structure

Every test follows AAA pattern with clear sections.

```typescript
it('creates assignment with tasks', async () => {
  // Arrange
  const mockInput = {
    assignee_id: 'user-1',
    schedule_type: 'once' as const,
    start_date: '2026-01-24',
    tasks: [{ name: 'Task 1' }],
  };
  supabaseMock._chain.then.mockImplementation((resolve) =>
    resolve({ data: createMockAssignment(), error: null })
  );

  // Act
  const { result } = renderHook(() => useAssignments(), { wrapper: createWrapper() });
  const assignment = await result.current.createAssignment(mockInput);

  // Assert
  expect(assignment).not.toBeNull();
  expect(supabaseMock.from).toHaveBeenCalledWith('assignments');
});
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Testing shadcn/ui Components

**What:** Writing tests for `src/components/ui/*` components.

**Why bad:**
- These are third-party components from shadcn/ui
- Already tested by the library maintainers
- Changes come from regenerating components, not modifying

**Instead:** Test the feature components that *use* these primitives.

### Anti-Pattern 2: Testing Implementation Details

**What:** Testing internal state, private functions, or how something works rather than what it does.

```typescript
// BAD
expect(result.current.internalState).toBe('loading');
expect(supabaseMock._chain.select).toHaveBeenCalledBefore(supabaseMock._chain.eq);
```

**Why bad:** Brittle tests that break on refactoring.

**Instead:**
```typescript
// GOOD
expect(result.current.loading).toBe(true);
await waitFor(() => expect(result.current.groups).toHaveLength(2));
```

### Anti-Pattern 3: Testing Large Page Components Directly

**What:** Writing render tests for 1000+ line page components like `CoachCalendar.tsx` (62KB).

**Why bad:**
- Too many dependencies to mock
- Tests become slow and brittle
- Changes anywhere break tests

**Instead:**
- Extract testable logic into hooks
- Extract reusable UI into feature components
- Test those smaller units
- Page component is "glue code" - covered by integration tests

### Anti-Pattern 4: Not Mocking Supabase

**What:** Letting tests hit real Supabase (even in dev).

**Why bad:**
- Tests become flaky (network issues)
- Tests become slow
- Tests pollute database
- Cannot run tests offline

**Instead:** Always mock at the `supabase` client boundary.

---

## Suggested Test Implementation Order

Based on the codebase analysis, implement tests in this order:

### Phase 1: Foundation (Week 1)

**Goal:** Test infrastructure + highest-value, lowest-complexity tests.

1. **Set up Vitest + React Testing Library**
   - Install: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`
   - Configure `vite.config.ts` with test options
   - Create `src/__tests__/setup.ts`

2. **Utility tests** (`src/lib/utils.test.ts`)
   - Pure functions, no mocks needed
   - Validates test setup works
   - Immediate confidence boost

3. **Supabase mock factory** (`src/__mocks__/supabase.ts`)
   - Foundation for all other tests
   - Block on this before hook tests

**Dependencies:** None. This phase is prerequisite for all others.

### Phase 2: Hooks (Week 2)

**Goal:** Test the business logic layer.

1. **useAuth.test.ts** - Simple hook, validates mock pattern
2. **useProfile.test.ts** - Similar pattern, profile CRUD
3. **useGroups.test.ts** - Group CRUD operations
4. **useAssignments.test.ts** - Complex logic, highest value

**Dependencies:** Phase 1 (test infra + Supabase mock).

**Priority rationale:** Hooks contain 80% of business logic. Testing these provides highest ROI.

### Phase 3: Feature Components (Week 3)

**Goal:** Test user interactions in key components.

1. **ProtectedRoute.test.tsx** - Auth flow testing
2. **CheckInModal.test.tsx** - User interaction patterns
3. **Dashboard components** - Key feature areas

**Dependencies:** Phase 2 (hook tests validate mocks work).

### Phase 4: Integration (Week 4+)

**Goal:** Cross-cutting flow tests.

1. **Assignment flow** - Create assignment, generate tasks, complete
2. **Auth flow** - Sign in, protected routes, sign out
3. **Group management flow** - Create group, add members, assign

**Dependencies:** Phases 1-3 complete.

---

## Configuration Files

### vite.config.ts (add test block)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  // ... existing config ...
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        'src/__mocks__/',
        'src/components/ui/', // shadcn - don't test
        '**/*.d.ts',
      ],
    },
  },
}));
```

### src/__tests__/setup.ts

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia (for responsive components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver (for UI components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

### package.json (add scripts)

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

## Scalability Considerations

| Concern | Initial (50 tests) | At 200 tests | At 500+ tests |
|---------|-------------------|--------------|---------------|
| **Test speed** | No action needed | Monitor parallelization | Shard test runs |
| **Mock complexity** | Single mock factory | Split by domain (auth, data) | Consider MSW for realistic mocks |
| **Test data** | Inline factories | Centralized factories | Fixtures + factories |
| **CI integration** | Run on push | Add coverage gates | Parallelized matrix |

---

## Edge Function Testing

For Supabase Edge Functions (`supabase/functions/*`):

```
supabase/
└── functions/
    ├── ai-assistant/
    │   ├── index.ts
    │   └── index.test.ts    # Colocated test
    └── ai-chat/
        ├── index.ts
        └── index.test.ts
```

Edge functions should be tested with:
- Mock Deno runtime APIs
- Mock external API calls (OpenAI, etc.)
- Use Supabase CLI test runner: `supabase functions test`

**Note:** Edge function testing is a separate concern from React app testing. Recommend deferring to Phase 4+.

---

## Sources

- Vitest documentation (official): Test configuration patterns
- React Testing Library documentation (official): Hook and component testing patterns
- Codebase analysis: `/Users/haokunyang/Downloads/MinseoCOOKS/LeahDavisWebsiteCode/routine-craft-bot/src/`
- Supabase client analysis: `src/integrations/supabase/client.ts`

**Confidence levels:**
- File organization: HIGH (established Vitest conventions)
- Supabase mock strategy: HIGH (based on actual client.ts analysis)
- Implementation order: HIGH (based on codebase dependency analysis)
- Edge function testing: MEDIUM (standard pattern, but project-specific needs may vary)
