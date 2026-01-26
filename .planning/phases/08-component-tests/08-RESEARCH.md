# Phase 8: Component Tests - Research

**Researched:** 2026-01-25
**Domain:** React Component Testing (Vitest, React Testing Library, Radix UI Dialogs, Protected Routes)
**Confidence:** HIGH

## Summary

This research covers testing React components that involve authentication flows (ProtectedRoute), modal interactions with form submission (CheckInModal), and dashboard components with data display. The project has established test infrastructure from Phase 3 and Phase 7 including Vitest with jsdom, a chainable Supabase mock factory, and comprehensive hook mocking patterns.

The three component groups requiring tests are:
1. **ProtectedRoute** - Authentication guard with loading state, unauthenticated redirect, and role-based access
2. **CheckInModal** - Radix Dialog with sentiment selection, form submission, and success toast feedback
3. **Dashboard components** - Data display with stats, loading states, and user interactions

**Primary recommendation:** Use the existing `render` from `@/test/test-utils.tsx` which provides MemoryRouter, QueryClient, and TooltipProvider. For ProtectedRoute tests, set up routes with Navigate targets and verify destination renders. For CheckInModal tests, mock Supabase and useAuth, then use userEvent for interactions. Portal-based modals work in jsdom with the existing setup.

## Standard Stack

The established libraries/tools for component testing (already installed in Phase 3):

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.18 | Test runner with jsdom | Native Vite integration, fast execution |
| @testing-library/react | ^16.3.2 | `render`, `screen`, `waitFor` utilities | Official React testing utilities |
| @testing-library/user-event | ^14.6.1 | User interaction simulation | Realistic user behavior simulation |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers | Extended assertions (toBeInTheDocument, etc.) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | ^27.4.0 | DOM simulation | Required for component rendering |
| @radix-ui/react-dialog | ^1.1.14 | Dialog component (used by CheckInModal) | Already in deps, portal-based modals |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsdom | happy-dom | happy-dom is faster but jsdom has better Radix compatibility |
| Direct Radix testing | Storybook + Chromatic | Better visual testing but slower, more CI overhead |

**No new installation needed** - all required packages are already installed from Phase 3.

## Architecture Patterns

### Recommended Test File Structure
```
src/
├── components/
│   ├── ProtectedRoute.tsx
│   ├── ProtectedRoute.test.tsx      # Co-located component test
│   ├── CheckInModal.tsx
│   └── CheckInModal.test.tsx        # Co-located component test
├── pages/
│   ├── Dashboard.tsx
│   └── Dashboard.test.tsx           # Co-located page test
└── test/
    ├── mocks/
    │   └── supabase.ts              # Existing mock factory
    ├── test-utils.tsx               # Existing render wrapper
    └── setup.ts                     # Existing setup with ResizeObserver mock
```

### Pattern 1: Testing Protected Routes with Navigate Redirects
**What:** Render ProtectedRoute within Routes, verify redirect destination renders
**When to use:** Testing authentication guards that use `<Navigate />`
**Example:**
```typescript
// Source: https://testing-library.com/docs/example-react-router/
import { render, screen, waitFor } from '@/test/test-utils';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { vi } from 'vitest';

vi.mock('@/hooks/useAuth');

function renderProtectedRoute(initialRoute = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<div>Login Page</div>} />
        <Route path="/app" element={<div>Student Dashboard</div>} />
        <Route path="/dashboard" element={<div>Coach Dashboard</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows loading state while auth is checking', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      session: null,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    renderProtectedRoute();

    // Loader2 icon has role="img" with animate-spin class
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      session: null,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    renderProtectedRoute();

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' } as any,
      loading: false,
      session: {} as any,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    // Mock role fetch
    getMockSupabase().setResponse({
      data: { role: 'coach' },
      error: null,
    });

    renderProtectedRoute();

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
```

### Pattern 2: Testing Radix UI Dialog/Modal
**What:** Render modal with open=true, interact with elements via userEvent
**When to use:** Testing modal components that use Radix Dialog (CheckInModal uses this)
**Example:**
```typescript
// Source: https://testing-library.com/docs/example-react-modal/
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { CheckInModal } from './CheckInModal';
import { useAuth } from '@/hooks/useAuth';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseModule } = await import('@/test/mocks/supabase');
  return mockSupabaseModule;
});

describe('CheckInModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnCheckInComplete = vi.fn();

  beforeEach(() => {
    resetMockSupabase();
    mockOnOpenChange.mockClear();
    mockOnCheckInComplete.mockClear();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'student-1', email: 'student@example.com' } as any,
      session: {} as any,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    // Mock: no existing check-in today
    getMockSupabase().setResponse({ data: null, error: null });
  });

  it('renders dialog with title when open', async () => {
    render(
      <CheckInModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCheckInComplete={mockOnCheckInComplete}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('How are you feeling today?')).toBeInTheDocument();
  });

  it('allows sentiment selection', async () => {
    const user = userEvent.setup();

    render(
      <CheckInModal
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const greatButton = screen.getByRole('button', { name: /great/i });
    await user.click(greatButton);

    // Button should have selected styling (primary border)
    expect(greatButton).toHaveClass('border-primary');
  });

  it('shows notes textarea for tired/sore sentiments', async () => {
    const user = userEvent.setup();

    render(<CheckInModal open={true} onOpenChange={mockOnOpenChange} />);

    // Initially no textarea
    expect(screen.queryByPlaceholderText(/sleep well/i)).not.toBeInTheDocument();

    // Select "tired"
    await user.click(screen.getByRole('button', { name: /tired/i }));

    // Textarea should appear
    expect(screen.getByPlaceholderText(/sleep well/i)).toBeInTheDocument();
  });

  it('submits check-in and shows success toast', async () => {
    const user = userEvent.setup();

    // Mock successful upsert
    getMockSupabase().queryBuilder.then.mockImplementationOnce((resolve) => {
      return Promise.resolve({ data: null, error: null }).then(resolve);
    });

    render(
      <CheckInModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onCheckInComplete={mockOnCheckInComplete}
      />
    );

    // Select sentiment
    await user.click(screen.getByRole('button', { name: /great/i }));

    // Click submit
    await user.click(screen.getByRole('button', { name: /log check-in/i }));

    await waitFor(() => {
      expect(mockOnCheckInComplete).toHaveBeenCalledWith('great');
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
```

### Pattern 3: Testing Dashboard Data Display
**What:** Mock data responses, verify rendering of stats and loading states
**When to use:** Testing pages that fetch and display data
**Example:**
```typescript
// Source: Verified with existing project patterns
import { render, screen, waitFor } from '@/test/test-utils';
import Dashboard from './Dashboard';
import { useAuth } from '@/hooks/useAuth';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseModule } = await import('@/test/mocks/supabase');
  return mockSupabaseModule;
});

describe('Dashboard', () => {
  beforeEach(() => {
    resetMockSupabase();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'coach-1', email: 'coach@example.com' } as any,
      session: {} as any,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });
  });

  it('shows loading skeleton while fetching', () => {
    // Make query never resolve
    getMockSupabase().queryBuilder.maybeSingle.mockImplementation(
      () => new Promise(() => {})
    );

    render(<Dashboard />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // DashboardSkeleton
  });

  it('displays user name and stats after loading', async () => {
    const mock = getMockSupabase();

    // Mock profile response
    mock.setResponse({ data: { display_name: 'Coach Jane' }, error: null });

    // Mock stats responses (use count: "exact" pattern)
    mock.queryBuilder.then
      .mockImplementationOnce((resolve) => Promise.resolve({
        data: null, count: 5, error: null
      }).then(resolve))
      .mockImplementationOnce((resolve) => Promise.resolve({
        data: null, count: 20, error: null
      }).then(resolve))
      .mockImplementationOnce((resolve) => Promise.resolve({
        data: null, count: 15, error: null
      }).then(resolve));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, coach jane/i)).toBeInTheDocument();
    });

    // Stats cards should show counts
    expect(screen.getByText('5')).toBeInTheDocument(); // People count
    expect(screen.getByText('20')).toBeInTheDocument(); // Total tasks
    expect(screen.getByText('15')).toBeInTheDocument(); // Completed tasks
  });
});
```

### Pattern 4: Using Existing Test Utils Wrapper
**What:** Import `render` from `@/test/test-utils` which includes MemoryRouter, QueryClient, TooltipProvider
**When to use:** All component tests to ensure consistent provider setup
**Example:**
```typescript
// The custom render already provides:
// - MemoryRouter (for routing)
// - QueryClientProvider (for React Query)
// - TooltipProvider (for Radix Tooltip)
import { render, screen, waitFor } from '@/test/test-utils';

// Custom options for routing
const { user } = render(<MyComponent />, {
  initialRoute: '/dashboard',
});

// userEvent instance is returned for interactions
await user.click(screen.getByRole('button'));
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Test what the user sees, not internal state
- **Not waiting for async updates:** Always use `waitFor` or `findBy` for async operations
- **Skipping cleanup:** Tests clean up automatically with RTL, but reset mock state in beforeEach
- **Over-mocking:** Mock at the boundary (useAuth, supabase) not internal functions
- **Testing Radix internals:** Don't test portal mechanics, test visible behavior

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Provider wrapping | Manual provider nesting | `@/test/test-utils` render | Already configured with all providers |
| Route testing | Mock Navigate | Real Routes with destinations | Actual routing behavior tested |
| User clicks | fireEvent.click | userEvent.click | More realistic, handles focus/events |
| Async waiting | setTimeout | waitFor/findBy | Handles timing automatically |
| Dialog detection | querySelector | screen.getByRole('dialog') | Accessible, stable selector |

**Key insight:** The existing test-utils.tsx provides a solid foundation. Extend it if needed for specific component test patterns, but don't recreate providers.

## Common Pitfalls

### Pitfall 1: Radix Dialog Not Rendering in Tests
**What goes wrong:** Dialog content doesn't appear in test DOM
**Why it happens:** Radix Dialog renders to a portal by default; jsdom needs proper body setup
**How to avoid:** The current setup.ts already mocks ResizeObserver. Dialog portals work in jsdom.
**Warning signs:** `screen.queryByRole('dialog')` returns null even when open=true
```typescript
// Works with current setup
render(<CheckInModal open={true} onOpenChange={vi.fn()} />);
expect(screen.getByRole('dialog')).toBeInTheDocument();
```

### Pitfall 2: Navigate Redirect Not Testable
**What goes wrong:** Can't verify that Navigate redirected correctly
**Why it happens:** Navigate changes routes but doesn't render anything itself
**How to avoid:** Set up complete route tree with destination components, verify destination renders
**Warning signs:** Tests pass but don't verify actual redirect behavior
```typescript
// BAD - doesn't verify redirect
render(<ProtectedRoute><Child /></ProtectedRoute>);
// Can't tell if redirected or rendered

// GOOD - verifies redirect destination
render(
  <MemoryRouter initialEntries={['/protected']}>
    <Routes>
      <Route path="/" element={<div>Login</div>} />
      <Route path="/protected" element={<ProtectedRoute><Child /></ProtectedRoute>} />
    </Routes>
  </MemoryRouter>
);
// After redirect: screen.getByText('Login') visible
```

### Pitfall 3: ProtectedRoute Role Fetching
**What goes wrong:** Role-based tests fail or flake
**Why it happens:** ProtectedRoute fetches role from supabase in useEffect
**How to avoid:** Mock supabase.from('profiles').select('role').eq().single() response
**Warning signs:** Tests pass without role mock (default null = redirect)
```typescript
// Must mock role fetch for role-based tests
getMockSupabase().setResponse({
  data: { role: 'coach' },
  error: null,
});
```

### Pitfall 4: userEvent Not Awaited
**What goes wrong:** Clicks don't register, state doesn't update
**Why it happens:** userEvent v14+ methods are async and must be awaited
**How to avoid:** Always await userEvent calls
**Warning signs:** Inconsistent test results, state seems to not update
```typescript
// BAD - not awaited
user.click(button);
expect(something).toHaveChanged(); // May fail

// GOOD - awaited
await user.click(button);
expect(something).toHaveChanged();
```

### Pitfall 5: Testing Loading State After Async Completion
**What goes wrong:** Can't test that loading state appeared
**Why it happens:** By the time assertion runs, loading is complete
**How to avoid:** Mock async operations to never resolve, or use findBy to catch transient states
**Warning signs:** Loading state tests always pass/fail
```typescript
// Test loading state by making async never resolve
getMockSupabase().auth.getSession.mockImplementation(
  () => new Promise(() => {}) // Never resolves
);
render(<ProtectedRoute><Child /></ProtectedRoute>);
expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
```

### Pitfall 6: localStorage Mock in CheckInModal
**What goes wrong:** Test behavior doesn't match real behavior due to localStorage checks
**Why it happens:** CheckInModal uses localStorage to track daily check-ins
**How to avoid:** Clear localStorage in beforeEach, or spy on Storage.prototype
**Warning signs:** Tests pass but real behavior differs
```typescript
beforeEach(() => {
  localStorage.clear();
  // Or use spy for more control
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
});
```

## Code Examples

Verified patterns from official sources and project context:

### Complete ProtectedRoute Test Suite
```typescript
// src/components/ProtectedRoute.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

// Mock dependencies
vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseModule } = await import('@/test/mocks/supabase');
  return mockSupabaseModule;
});

function renderWithRoutes(
  initialRoute = '/protected',
  requiredRole?: 'coach' | 'student'
) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<div data-testid="login-page">Login Page</div>} />
        <Route path="/app" element={<div data-testid="student-dashboard">Student Dashboard</div>} />
        <Route path="/dashboard" element={<div data-testid="coach-dashboard">Coach Dashboard</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute requiredRole={requiredRole}>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    resetMockSupabase();
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner while auth is checking', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        loading: true,
        session: null,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      renderWithRoutes();

      // Loader2 from lucide-react renders as SVG
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows loading spinner while role is loading', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' } as any,
        loading: false,
        session: {} as any,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      // Role fetch never resolves
      getMockSupabase().queryBuilder.single.mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRoutes('/protected', 'coach');

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('unauthenticated state', () => {
    it('redirects to login (/) when no user', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        loading: false,
        session: null,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      renderWithRoutes();

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    it('renders children when user is authenticated (no role required)', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' } as any,
        loading: false,
        session: {} as any,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      // Role fetch returns coach
      getMockSupabase().setResponse({
        data: { role: 'coach' },
        error: null,
      });

      renderWithRoutes();

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });

  describe('role-based access', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' } as any,
        loading: false,
        session: {} as any,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });
    });

    it('allows access when role matches required role', async () => {
      getMockSupabase().setResponse({
        data: { role: 'coach' },
        error: null,
      });

      renderWithRoutes('/protected', 'coach');

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('redirects coach to /dashboard when accessing student route', async () => {
      getMockSupabase().setResponse({
        data: { role: 'coach' },
        error: null,
      });

      renderWithRoutes('/protected', 'student');

      await waitFor(() => {
        expect(screen.getByTestId('coach-dashboard')).toBeInTheDocument();
      });
    });

    it('redirects student to /app when accessing coach route', async () => {
      getMockSupabase().setResponse({
        data: { role: 'student' },
        error: null,
      });

      renderWithRoutes('/protected', 'coach');

      await waitFor(() => {
        expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
      });
    });

    it('redirects to login when role is null', async () => {
      getMockSupabase().setResponse({
        data: { role: null },
        error: null,
      });

      renderWithRoutes('/protected', 'coach');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });
  });
});
```
Source: [React Testing Library - React Router Example](https://testing-library.com/docs/example-react-router/)

### Complete CheckInModal Test Suite
```typescript
// src/components/CheckInModal.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { CheckInModal } from './CheckInModal';
import { useAuth } from '@/hooks/useAuth';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseModule } = await import('@/test/mocks/supabase');
  return mockSupabaseModule;
});

// Mock useToast to capture toast calls
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('CheckInModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onCheckInComplete: vi.fn(),
  };

  beforeEach(() => {
    resetMockSupabase();
    localStorage.clear();
    mockToast.mockClear();
    defaultProps.onOpenChange.mockClear();
    defaultProps.onCheckInComplete.mockClear();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'student-1', email: 'student@example.com' } as any,
      session: {} as any,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    // Default: no check-in exists for today
    getMockSupabase().setResponse({ data: null, error: null });
  });

  describe('rendering', () => {
    it('renders dialog with title when open', async () => {
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      expect(screen.getByText('How are you feeling today?')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<CheckInModal {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows all sentiment options', async () => {
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /great/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /okay/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tired/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sore/i })).toBeInTheDocument();
    });
  });

  describe('sentiment selection', () => {
    it('highlights selected sentiment', async () => {
      const user = userEvent.setup();
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const greatButton = screen.getByRole('button', { name: /great/i });
      await user.click(greatButton);

      expect(greatButton).toHaveClass('border-primary');
    });

    it('shows notes field for tired sentiment', async () => {
      const user = userEvent.setup();
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /tired/i }));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/sleep well/i)).toBeInTheDocument();
    });

    it('shows notes field for sore sentiment', async () => {
      const user = userEvent.setup();
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sore/i }));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('disables submit button until sentiment selected', async () => {
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /log check-in/i });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button after sentiment selection', async () => {
      const user = userEvent.setup();
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /great/i }));

      const submitButton = screen.getByRole('button', { name: /log check-in/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('submits check-in and calls callbacks on success', async () => {
      const user = userEvent.setup();

      // Mock successful upsert
      getMockSupabase().queryBuilder.then.mockImplementationOnce((resolve) =>
        Promise.resolve({ data: null, error: null }).then(resolve)
      );

      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /great/i }));
      await user.click(screen.getByRole('button', { name: /log check-in/i }));

      await waitFor(() => {
        expect(defaultProps.onCheckInComplete).toHaveBeenCalledWith('great');
      });
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows success toast with encouragement for great/okay', async () => {
      const user = userEvent.setup();

      getMockSupabase().queryBuilder.then.mockImplementationOnce((resolve) =>
        Promise.resolve({ data: null, error: null }).then(resolve)
      );

      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /great/i }));
      await user.click(screen.getByRole('button', { name: /log check-in/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining("Let's go"),
          })
        );
      });
    });

    it('shows supportive toast for tired/sore sentiments', async () => {
      const user = userEvent.setup();

      getMockSupabase().queryBuilder.then.mockImplementationOnce((resolve) =>
        Promise.resolve({ data: null, error: null }).then(resolve)
      );

      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /tired/i }));
      await user.click(screen.getByRole('button', { name: /log check-in/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Take it easy'),
          })
        );
      });
    });
  });

  describe('already checked in', () => {
    it('returns null and closes when already checked in today', async () => {
      // Already checked in today (localStorage)
      localStorage.setItem('check_in_student-1', new Date().toISOString().split('T')[0]);

      const { container } = render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });
});
```
Source: [Testing Library - Modal Example](https://testing-library.com/docs/example-react-modal/)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| fireEvent.click | userEvent.click | RTL ~2023 | More realistic, async events |
| getByTestId primary | getByRole primary | RTL best practices | Accessibility-focused testing |
| Manual provider wrapping | Custom render wrapper | Project convention | Consistent, less boilerplate |
| Mock router entirely | Use real Routes | React Router v6+ | Tests actual routing behavior |

**Deprecated/outdated:**
- `fireEvent` for most interactions: Use `userEvent` for realistic behavior
- `waitForElementToBeRemoved`: Still valid but `waitFor(() => expect())` is more flexible
- Testing internal state: Test what user sees, not component internals

## Open Questions

Things that couldn't be fully resolved:

1. **Dashboard stats mock complexity**
   - What we know: Dashboard makes multiple parallel queries with count: "exact"
   - What's unclear: Best pattern for mocking parallel queries with different responses
   - Recommendation: Use sequential mockImplementationOnce calls for then(), in order of execution

2. **Toast assertion approach**
   - What we know: CheckInModal shows toast on success
   - What's unclear: Whether to mock useToast or check actual toast rendering
   - Recommendation: Mock useToast and verify it was called with expected messages (simpler, faster)

3. **Radix pointer-events: none issue**
   - What we know: Radix Dialog sets pointer-events: none on body during modal
   - What's unclear: Whether this causes userEvent issues in current setup
   - Recommendation: If clicks fail, add `{ pointerEvents: 'auto' }` style override in test setup or use fireEvent as fallback

## Sources

### Primary (HIGH confidence)
- [React Testing Library - React Router Example](https://testing-library.com/docs/example-react-router/) - Official route testing patterns
- [Testing Library - Modal Example](https://testing-library.com/docs/example-react-modal/) - Portal modal testing
- [userEvent Documentation](https://testing-library.com/docs/user-event/intro/) - User interaction simulation

### Secondary (MEDIUM confidence)
- [Testing React Router useNavigate](https://blog.logrocket.com/testing-react-router-usenavigate-hook-react-testing-library/) - Navigate testing patterns
- [Radix Dialog Testing Discussion](https://github.com/radix-ui/primitives/discussions/1130) - Portal element testing
- [Vitest localStorage Mock](https://runthatline.com/vitest-mock-localstorage/) - Storage mocking patterns

### Tertiary (LOW confidence)
- [Using RadixUI with RTL](https://www.luisball.com/blog/using-radixui-with-react-testing-library) - Community patterns for Radix + RTL

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already established in Phase 3, no new dependencies
- ProtectedRoute patterns: HIGH - Based on official RTL router example
- CheckInModal patterns: MEDIUM - Radix Dialog + portal testing has some edge cases
- Dashboard patterns: HIGH - Standard data display testing

**Research date:** 2026-01-25
**Valid until:** 2026-03-25 (60 days - testing patterns are stable)
