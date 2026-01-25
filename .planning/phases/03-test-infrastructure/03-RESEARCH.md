# Phase 3: Test Infrastructure - Research

**Researched:** 2026-01-25
**Domain:** Testing (Vitest, React Testing Library, Supabase mocking)
**Confidence:** HIGH

## Summary

This research covers setting up a comprehensive test infrastructure for a Vite + React + TypeScript application that uses Supabase for backend services. The established approach uses Vitest as the test runner (native Vite integration, faster than Jest for ESM), React Testing Library for component testing, and jsdom for DOM simulation.

The project requires test utilities that wrap components with all necessary providers (BrowserRouter/MemoryRouter, QueryClientProvider, TooltipProvider, ThemeProvider) and a Supabase mock factory supporting method chaining for database queries (`from().select().eq().order().single()`).

**Primary recommendation:** Use Vitest with `globals: true`, `environment: 'jsdom'`, and a setup file that extends expect with jest-dom matchers. Create a chainable Supabase mock factory using `mockReturnThis()` for intermediate methods and `mockResolvedValue()` for terminal methods.

## Standard Stack

The established libraries/tools for testing Vite + React + TypeScript applications:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.18 | Test runner | Native Vite integration, ESM support, 10-20x faster than Jest |
| @testing-library/react | ^16.3.2 | React component testing | Industry standard, user-centric testing approach |
| @testing-library/jest-dom | ^6.9.1 | DOM assertions | Provides `toBeInTheDocument`, `toHaveTextContent`, etc. |
| jsdom | ^27.4.0 | DOM simulation | Simulates browser environment in Node.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/user-event | ^14.6.1 | User interaction simulation | Testing clicks, typing, form interactions |
| @vitest/coverage-v8 | ^4.0.18 | Code coverage | Running coverage reports with `npm run test:coverage` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsdom | happy-dom | Faster but less spec-accurate; use jsdom for better compatibility |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | Istanbul works on any runtime but is slower due to instrumentation |
| Direct Supabase mocking | MSW (Mock Service Worker) | MSW intercepts HTTP; better for integration tests but more setup |

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── test/                    # Test utilities and setup
│   ├── setup.ts             # Vitest setup file (extends expect, cleanup)
│   ├── test-utils.tsx       # Custom render with providers
│   ├── mocks/               # Mock factories
│   │   ├── supabase.ts      # Supabase client mock factory
│   │   └── next-themes.ts   # Theme provider mock
│   └── factories/           # Test data factories
│       └── index.ts         # Mock data generators
├── components/
│   └── __tests__/           # Co-located component tests (optional)
└── **/*.test.ts(x)          # Test files alongside source (preferred)
```

### Pattern 1: Custom Render with All Providers
**What:** A wrapper function that wraps components with all necessary providers
**When to use:** Every component test that needs routing, queries, or theming
**Example:**
```typescript
// src/test/test-utils.tsx
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import userEvent from '@testing-library/user-event';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();
  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { initialRoute = '/', ...renderOptions } = options || {};
  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[initialRoute]}>
          <QueryClientProvider client={createTestQueryClient()}>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </QueryClientProvider>
        </MemoryRouter>
      ),
      ...renderOptions,
    }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };
```

### Pattern 2: Chainable Supabase Mock Factory
**What:** A factory function that creates Supabase client mocks with full method chaining support
**When to use:** Testing any code that calls Supabase database methods
**Example:**
```typescript
// src/test/mocks/supabase.ts
import { vi } from 'vitest';

type SupabaseResponse<T> = { data: T | null; error: Error | null };

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

export function createMockSupabaseClient<T = unknown>(
  defaultResponse: SupabaseResponse<T> = { data: null, error: null }
) {
  const mockQueryBuilder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(defaultResponse),
    maybeSingle: vi.fn().mockResolvedValue(defaultResponse),
  };

  // Make each method return the builder for chaining
  Object.keys(mockQueryBuilder).forEach((key) => {
    const k = key as keyof MockQueryBuilder;
    if (k !== 'single' && k !== 'maybeSingle') {
      mockQueryBuilder[k].mockReturnValue(mockQueryBuilder);
    }
  });

  const mockClient = {
    from: vi.fn(() => mockQueryBuilder),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    client: mockClient,
    queryBuilder: mockQueryBuilder,
    // Helper to set response for the next query
    setResponse: (response: SupabaseResponse<T>) => {
      mockQueryBuilder.single.mockResolvedValueOnce(response);
      mockQueryBuilder.maybeSingle.mockResolvedValueOnce(response);
    },
    // Helper to set array response (for select without single)
    setArrayResponse: (response: SupabaseResponse<T[]>) => {
      // For non-single queries, the promise resolves on select
      mockQueryBuilder.select.mockResolvedValueOnce(response);
    },
  };
}
```

### Pattern 3: next-themes Mock
**What:** Mock for useTheme hook from next-themes
**When to use:** Testing components that use theme-aware styling (like the Sonner toaster)
**Example:**
```typescript
// src/test/mocks/next-themes.ts
import { vi } from 'vitest';

export const mockUseTheme = vi.fn(() => ({
  theme: 'light',
  setTheme: vi.fn(),
  resolvedTheme: 'light',
  themes: ['light', 'dark', 'system'],
  systemTheme: 'light',
  forcedTheme: undefined,
}));

// In test setup or individual tests:
vi.mock('next-themes', () => ({
  useTheme: mockUseTheme,
}));
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Don't assert on class names, internal state, or component internals. Test what users see and do.
- **Not awaiting user events:** Always `await user.click()`, `await user.type()`. user-event v14+ is async.
- **Creating QueryClient once for all tests:** Creates test pollution. Create fresh QueryClient per test.
- **Forgetting cleanup:** Though Vitest auto-cleans DOM, explicit cleanup in setup ensures consistency.
- **Importing from `@testing-library/react` directly:** Import from your `test-utils` to get wrapped render.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM assertions | Custom expect matchers | @testing-library/jest-dom | Comprehensive, well-tested matchers |
| User interactions | Manual event dispatching | @testing-library/user-event | Simulates real user behavior |
| Method chaining mocks | Complex mock objects | `mockReturnThis()` pattern | Vitest provides this built-in |
| Test isolation | Manual cleanup | Vitest afterEach + RTL cleanup | Automatic and reliable |
| Coverage reporting | Custom coverage tools | @vitest/coverage-v8 | Native integration, accurate |

**Key insight:** Testing libraries have solved these problems with edge cases considered. Custom solutions often miss subtle issues like event bubbling, focus management, or async state updates.

## Common Pitfalls

### Pitfall 1: TypeScript Errors for Globals
**What goes wrong:** `Cannot find name 'beforeEach'` or `'describe'` errors in test files
**Why it happens:** TypeScript doesn't recognize Vitest globals without configuration
**How to avoid:**
1. Set `globals: true` in vitest.config.ts
2. Add `"types": ["vitest/globals"]` to tsconfig.json or create tsconfig.test.json
**Warning signs:** Red squiggles under test functions in IDE

### Pitfall 2: Missing DOM Matchers
**What goes wrong:** `Property 'toBeInTheDocument' does not exist on type 'Assertion'`
**Why it happens:** jest-dom matchers not extended on Vitest's expect
**How to avoid:**
1. Import `@testing-library/jest-dom/vitest` in setup file, OR
2. Manually extend: `expect.extend(matchers)` from `@testing-library/jest-dom/matchers`
3. Add `"@testing-library/jest-dom"` to TypeScript types
**Warning signs:** DOM assertion methods not available

### Pitfall 3: act() Warnings
**What goes wrong:** "Warning: The current testing environment is not configured to support act(...)"
**Why it happens:** Known compatibility issue between React 18.3.1 + RTL 16.x + Vitest 2.x+
**How to avoid:** Tests still work; warnings are noise. Can suppress with `console.error` filtering if needed, but usually safe to ignore.
**Warning signs:** Console warnings during test runs (tests still pass)

### Pitfall 4: Supabase Mock Chain Breaking
**What goes wrong:** `TypeError: Cannot read property 'eq' of undefined`
**Why it happens:** Each chained method must return the mock object for chaining
**How to avoid:** Use `mockReturnThis()` or `mockReturnValue(mockQueryBuilder)` for ALL intermediate methods
**Warning signs:** Errors at second or third method in chain

### Pitfall 5: MemoryRouter vs BrowserRouter
**What goes wrong:** `useNavigate() may be used only in the context of a <Router> component`
**Why it happens:** Components tested outside of routing context
**How to avoid:** Always wrap with MemoryRouter in test utils; use `initialEntries` for specific routes
**Warning signs:** Routing hook errors in tests

### Pitfall 6: QueryClient Test Pollution
**What goes wrong:** Tests pass individually but fail when run together
**Why it happens:** Shared QueryClient caches data between tests
**How to avoid:** Create fresh QueryClient for each test in the wrapper function
**Warning signs:** Flaky tests, order-dependent failures

## Code Examples

Verified patterns from official sources:

### Vitest Configuration
```typescript
// vite.config.ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
});
```
Source: [Vitest Configuration Docs](https://vitest.dev/config/)

### Setup File
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock next-themes globally
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
    themes: ['light', 'dark', 'system'],
  }),
}));

// Mock matchMedia (not available in jsdom)
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

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver (not available in jsdom)
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```
Source: [React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup), [DEV Community Guide](https://dev.to/cristiansifuentes/mastering-vitest-react-testing-library-fixing-beforeeach-tobeinthedocument-and-jsdom-2379)

### Example Component Test
```typescript
// src/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test/test-utils';
import { Button } from './button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```
Source: [Testing Library Docs](https://testing-library.com/docs/react-testing-library/example-intro)

### TypeScript Test Configuration
```json
// tsconfig.test.json (or add to tsconfig.json compilerOptions.types)
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**/*"]
}
```
Source: [Vitest TypeScript Guide](https://vitest.dev/guide/)

### Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```
Source: [Vitest CLI Reference](https://vitest.dev/guide/cli.html)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest + Babel transform | Vitest native ESM | Vitest 1.0 (2023) | No babel config needed, faster |
| user-event sync API | user-event async API (v14+) | 2022 | Must await all interactions |
| `render()` destructure queries | `screen` object | RTL 9+ | Cleaner, more consistent tests |
| `@testing-library/jest-dom` manual extend | `@testing-library/jest-dom/vitest` | 2024 | One-line setup |
| Coverage via Jest | @vitest/coverage-v8 | Vitest 1.0 | Native V8 coverage, faster |

**Deprecated/outdated:**
- `jest.fn()`: Use `vi.fn()` in Vitest
- `fireEvent`: Prefer `userEvent` for realistic interactions
- `waitForElementToBeRemoved`: Use `waitFor` with negation
- Enzyme: Completely deprecated, use React Testing Library

## Open Questions

Things that couldn't be fully resolved:

1. **act() Warning Suppression**
   - What we know: Warning appears but tests work; known RTL+Vitest issue
   - What's unclear: Whether React 19 or future RTL versions will resolve
   - Recommendation: Accept warnings for now; suppress in CI if noisy

2. **Browser Mode vs jsdom**
   - What we know: Vitest Browser Mode provides more accurate testing
   - What's unclear: Setup complexity and whether it's needed for this project
   - Recommendation: Start with jsdom; consider Browser Mode for Phase 2 if issues arise

3. **MSW vs Direct Mocking for Supabase**
   - What we know: MSW intercepts HTTP requests; direct mocking is simpler
   - What's unclear: Which is better long-term for this codebase
   - Recommendation: Start with direct mocking; consider MSW for integration tests later

## Sources

### Primary (HIGH confidence)
- [Vitest Official Docs - Getting Started](https://vitest.dev/guide/) - Installation, configuration
- [Vitest Official Docs - Configuration](https://vitest.dev/config/) - Test options, coverage
- [Vitest Official Docs - Mock Functions](https://vitest.dev/api/mock) - mockReturnThis, mockResolvedValue
- [React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup) - Custom render, providers
- [React Router Testing](https://testing-library.com/docs/example-react-router/) - MemoryRouter usage

### Secondary (MEDIUM confidence)
- [DEV Community - React Testing Setup](https://dev.to/kevinccbsg/react-testing-setup-vitest-typescript-react-testing-library-42c8) - Practical setup guide
- [DEV Community - Vitest TypeScript Gotchas](https://dev.to/cristiansifuentes/mastering-vitest-react-testing-library-fixing-beforeeach-tobeinthedocument-and-jsdom-2379) - TypeScript configuration fixes
- [Herman Nygaard - Testing Supabase with MSW](https://nygaard.dev/blog/testing-supabase-rtl-msw) - Supabase mock patterns

### Tertiary (LOW confidence)
- Various Medium articles on Supabase mocking - Pattern examples, not officially verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm, official docs consulted
- Architecture patterns: HIGH - Based on official RTL and Vitest documentation
- Pitfalls: HIGH - Well-documented issues with community consensus
- Supabase mocking: MEDIUM - Pattern is sound but specific to this project's needs

**Research date:** 2026-01-25
**Valid until:** 2026-03-25 (60 days - testing ecosystem is stable)
