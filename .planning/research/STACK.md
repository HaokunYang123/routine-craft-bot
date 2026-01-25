# Technology Stack — Testing and Reliability

**Project:** Routine Craft Bot
**Researched:** 2026-01-24
**Research Mode:** Stack dimension for testing and reliability hardening

---

## Executive Summary

For a React 18 + Vite 5 + TypeScript + Supabase application, the standard 2025 testing stack is **Vitest** as the test runner (Vite-native, fast, excellent ESM support), **React Testing Library** for component testing, and **Mock Service Worker (MSW)** for network mocking. This stack provides the best DX for Vite projects and aligns with React's official testing recommendations.

**Overall Confidence:** MEDIUM — Recommendations are based on established ecosystem patterns and training data. Version numbers should be verified at install time via `npm view [package] version`.

---

## Recommended Stack

### Test Runner

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vitest** | ^2.x | Unit/integration test runner | Vite-native: uses same config, same transforms, instant HMR in watch mode. Jest-compatible API makes migration trivial. Native ESM support matches your Vite setup. | HIGH |

**Rationale:** Vitest is the de facto standard for Vite projects. Using Jest with Vite requires additional configuration to handle ESM modules, path aliases, and TypeScript transforms. Vitest shares Vite's config, so `@` path aliases and SWC transforms work automatically.

### Component Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@testing-library/react** | ^16.x | React component testing | Official React testing recommendation. Tests components the way users interact with them. Works with React 18's concurrent features. | HIGH |
| **@testing-library/jest-dom** | ^6.x | Custom DOM matchers | Provides `toBeInTheDocument()`, `toHaveTextContent()`, etc. Makes assertions readable. | HIGH |
| **@testing-library/user-event** | ^14.x | User interaction simulation | More realistic than `fireEvent`. Simulates actual user behavior (typing, clicking) including focus management. | HIGH |

**Rationale:** React Testing Library is the official recommendation from React core team. It encourages testing behavior over implementation, which makes tests resilient to refactoring.

### DOM Environment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **jsdom** | ^24.x or ^25.x | DOM simulation | Required for component tests in Node.js. Vitest uses this via `environment: 'jsdom'` config. | HIGH |
| **happy-dom** | (alternative) | Faster DOM simulation | 10x faster than jsdom but less complete. Consider for CI speed optimization later. | MEDIUM |

**Rationale:** Start with jsdom for compatibility. happy-dom is faster but occasionally has edge cases with complex DOM operations.

### API/Network Mocking

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **MSW (Mock Service Worker)** | ^2.x | Network request mocking | Intercepts at network level, not at client level. Works for Supabase REST calls, Edge Functions, and any fetch. Test code stays identical to production code. | HIGH |

**Rationale:** MSW is the modern standard for mocking HTTP requests. Unlike mocking the Supabase client directly, MSW intercepts actual network requests, which means:
1. Your test code uses the real `supabase` client
2. Tests verify the actual HTTP behavior
3. Mocks are portable across test files

### Supabase-Specific

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@supabase/supabase-js** | (existing 2.90.1) | Keep existing | No changes needed to production code | HIGH |
| **MSW handlers** | (custom) | Supabase API mocking | Create handlers for PostgREST API patterns | HIGH |

**Rationale:** Mock Supabase at the network level with MSW rather than mocking the client. This catches issues in how your code constructs queries.

### Error Handling Utilities

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **react-error-boundary** | ^4.x | Error boundary component | Production-ready, well-tested. Provides `ErrorBoundary`, `useErrorBoundary` hook, and `withErrorBoundary` HOC. | HIGH |

**Rationale:** React 18's error handling with Suspense works best with a mature error boundary library. This is simpler than hand-rolling your own.

### Code Coverage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@vitest/coverage-v8** | ^2.x | Coverage reporting | V8-native coverage is faster than Istanbul. Built-in Vitest integration. | MEDIUM |

**Rationale:** V8 coverage is faster for large codebases. Istanbul (`@vitest/coverage-istanbul`) is more accurate for edge cases but slower.

---

## Full Installation Command

```bash
# Test framework and React testing utilities
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# API mocking
npm install -D msw

# Coverage (optional but recommended)
npm install -D @vitest/coverage-v8

# Error boundary (production dependency)
npm install react-error-boundary
```

**Note:** Run `npm view [package] version` before installation to verify current versions match expectations.

---

## Configuration

### vitest.config.ts

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/components/ui/', // shadcn/ui components - vendor code
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### src/test/setup.ts

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => server.close());
```

### package.json scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## Supabase Mocking Strategy

### Approach: Mock at Network Level with MSW

**Do NOT** mock the Supabase client directly. Instead, intercept HTTP requests:

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://your-project.supabase.co';

export const handlers = [
  // Mock Supabase auth
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    });
  }),

  // Mock PostgREST queries (e.g., profiles table)
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    return HttpResponse.json([
      {
        id: '1',
        user_id: userId || 'test-user-id',
        display_name: 'Test User',
        role: 'coach',
      },
    ]);
  }),

  // Mock PostgREST inserts
  http.post(`${SUPABASE_URL}/rest/v1/task_instances`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      Array.isArray(body)
        ? body.map((item, i) => ({ ...item, id: `task-${i}` }))
        : { ...body, id: 'task-1' }
    );
  }),

  // Mock RPC calls
  http.post(`${SUPABASE_URL}/rest/v1/rpc/validate_qr_token`, async ({ request }) => {
    const { token } = await request.json();
    if (token === 'valid-token') {
      return HttpResponse.json({ valid: true, user_id: 'student-123' });
    }
    return HttpResponse.json({ valid: false }, { status: 400 });
  }),
];
```

### MSW Server Setup

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Why MSW Over Client Mocking

| Approach | Pros | Cons |
|----------|------|------|
| **MSW (recommended)** | Tests real HTTP behavior, catches query construction bugs, portable across tests | Requires understanding Supabase REST API format |
| Client mocking (`vi.mock`) | Simpler setup, no HTTP knowledge needed | Doesn't test actual queries, fragile to client API changes |

---

## Alternatives Considered

### Test Runners

| Option | Why Not | When to Use Instead |
|--------|---------|---------------------|
| **Jest** | Requires extra config for ESM, Vite transforms, path aliases. Slower cold start. | Only if team has deep Jest expertise and migration cost is prohibitive |
| **Cypress Component Testing** | Overkill for unit/integration tests. Better for E2E. | Add later for E2E testing |

### Mocking

| Option | Why Not | When to Use Instead |
|--------|---------|---------------------|
| **vi.mock('@/integrations/supabase/client')** | Doesn't test actual HTTP queries. If your query construction is wrong, mock won't catch it. | Quick smoke tests where HTTP behavior doesn't matter |
| **Supabase Local** | Complex setup, requires Docker, slower tests | Integration tests against real database schema |

### Error Boundaries

| Option | Why Not | When to Use Instead |
|--------|---------|---------------------|
| **Custom ErrorBoundary class** | More boilerplate, less features | Never — react-error-boundary is better |
| **Sentry ErrorBoundary** | Ties you to Sentry SDK | If you're using Sentry for error tracking |

---

## What NOT to Use

| Technology | Reason |
|------------|--------|
| **Enzyme** | Deprecated for React 18. Does not support React 18's concurrent features. |
| **@testing-library/react-hooks** | Deprecated. Hook testing is now built into `@testing-library/react` via `renderHook`. |
| **Jest** (for Vite projects) | Works but requires significant configuration. Vitest is native. |
| **nock** | Node-only HTTP mocking. MSW works in both Node and browser, better for React. |
| **Sinon** | Vitest has built-in mocking (`vi.fn()`, `vi.spyOn()`). Sinon adds complexity. |

---

## Testing Patterns for This Codebase

### Priority Order

1. **Utility functions** (`src/lib/utils.ts`) — No mocking needed, highest ROI
2. **Custom hooks** (`src/hooks/*.ts`) — Require Supabase mocking, high value
3. **Critical components** — Focus on user flows, not implementation
4. **Error boundaries** — Test that errors are caught and displayed

### Utility Function Tests (Zero Dependencies)

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { cn, safeParseISO, safeFormatDate } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('handles tailwind conflicts (last wins)', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'never', true && 'always')).toBe('base always');
  });
});

describe('safeParseISO', () => {
  it('parses valid ISO date', () => {
    const result = safeParseISO('2026-01-24');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2026);
  });

  it('returns null for invalid date', () => {
    expect(safeParseISO('not-a-date')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(safeParseISO(null)).toBeNull();
    expect(safeParseISO(undefined)).toBeNull();
  });
});

describe('safeFormatDate', () => {
  it('formats valid date', () => {
    expect(safeFormatDate('2026-01-24', 'MMMM d, yyyy')).toBe('January 24, 2026');
  });

  it('returns fallback for invalid date', () => {
    expect(safeFormatDate('invalid', 'yyyy-MM-dd')).toBe('No date');
  });

  it('uses custom fallback', () => {
    expect(safeFormatDate(null, 'yyyy-MM-dd', 'N/A')).toBe('N/A');
  });
});
```

### Hook Testing Pattern

```typescript
// src/hooks/useAuth.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from './useAuth';

// Wrapper with required providers
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useAuth', () => {
  it('starts with loading true', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('resolves to user after session check', async () => {
    // MSW will return the mocked user
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeDefined();
  });
});
```

### Component Testing Pattern

```typescript
// src/components/SparkyNudge.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SparkyNudge } from './SparkyNudge';

describe('SparkyNudge', () => {
  it('renders nudge message', () => {
    render(<SparkyNudge message="You're doing great!" />);
    expect(screen.getByText(/You're doing great!/)).toBeInTheDocument();
  });

  it('calls onDismiss when closed', async () => {
    const onDismiss = vi.fn();
    render(<SparkyNudge message="Test" onDismiss={onDismiss} />);

    // Assuming there's a close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(onDismiss).toHaveBeenCalled();
  });
});
```

---

## Error Handling Stack

### Production Dependencies

```bash
npm install react-error-boundary
```

### Error Boundary Setup

```typescript
// src/components/ErrorBoundary.tsx
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6">
      <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      <Button onClick={resetErrorBoundary} className="mt-4">
        Try again
      </Button>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        // Log to your error service here
        console.error('Error caught by boundary:', error, info);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

### Error Handling Utility

```typescript
// src/lib/error-handling.ts
import { toast } from '@/hooks/use-toast';

interface ErrorOptions {
  title?: string;
  retry?: () => void;
  silent?: boolean;
}

export function handleError(error: unknown, options: ErrorOptions = {}) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  // Always log
  console.error('[Error]', error);

  // Show toast unless silent
  if (!options.silent) {
    toast({
      title: options.title || 'Error',
      description: message,
      variant: 'destructive',
      action: options.retry ? (
        <Button variant="outline" size="sm" onClick={options.retry}>
          Retry
        </Button>
      ) : undefined,
    });
  }

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
}
```

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Vitest as test runner | HIGH | Industry consensus for Vite projects, widely adopted |
| React Testing Library | HIGH | Official React team recommendation |
| MSW for mocking | HIGH | Standard for modern React apps, well-documented |
| Exact version numbers | LOW | Based on training data; verify with `npm view` |
| react-error-boundary | HIGH | Most popular error boundary package, stable API |
| V8 coverage | MEDIUM | Works well but Istanbul is sometimes more accurate |

---

## Open Questions for Phase Implementation

1. **Coverage threshold:** What minimum coverage percentage should block CI? (Recommend: 60% for hooks, 40% overall to start)
2. **E2E testing:** Should Playwright or Cypress be added later for critical user flows?
3. **Snapshot testing:** Are snapshot tests desired for UI components? (Recommend: avoid, prefer explicit assertions)
4. **Visual regression:** Is visual regression testing needed? (Recommend: defer unless UI-critical)

---

## Sources

- Training data knowledge (Vitest, RTL, MSW ecosystem patterns) — MEDIUM confidence
- Codebase analysis of existing `package.json`, hooks, and Supabase integration — HIGH confidence
- Existing `.planning/codebase/CONCERNS.md` and `.planning/codebase/TESTING.md` — HIGH confidence

**Note:** Version numbers and specific API details should be verified against official documentation at implementation time. Run `npm view [package] version` to confirm current stable versions.

---

*Stack research: 2026-01-24*
