import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';

import {
  getMockSupabase,
  resetMockSupabase,
} from '@/test/mocks/supabase';

// Mock useAuth at module level
vi.mock('@/hooks/useAuth');

// Mock Supabase client using dynamic import pattern for hoisting
vi.mock('@/integrations/supabase/client', async () => {
  const { getMockSupabase: getSupabase } = await import('@/test/mocks/supabase');
  return {
    supabase: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          const mock = getSupabase();
          return (mock?.client as Record<string, unknown>)?.[prop];
        },
      }
    ),
  };
});

// Import component and hook after mocks are declared
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

type UserRole = 'coach' | 'student';

/**
 * Helper function to render ProtectedRoute within a routing context.
 * Sets up routes for login, student dashboard, coach dashboard, and protected content.
 */
function renderWithRoutes(initialRoute: string, requiredRole?: UserRole) {
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

      renderWithRoutes('/protected');

      // Verify loading spinner is displayed
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      // Verify protected content is not shown
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('shows loading spinner while role is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' } as ReturnType<typeof useAuth>['user'],
        loading: false,
        session: {} as ReturnType<typeof useAuth>['session'],
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      // Mock supabase single() to return a promise that never resolves (role loading)
      getMockSupabase().queryBuilder.single.mockImplementation(() => new Promise(() => {}));

      renderWithRoutes('/protected', 'coach');

      // Verify loading spinner is displayed (role fetch in progress)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
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

      renderWithRoutes('/protected');

      // Wait for redirect to login page
      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      // Verify protected content is not shown
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    it('renders children when user is authenticated (no role required)', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' } as ReturnType<typeof useAuth>['user'],
        loading: false,
        session: {} as ReturnType<typeof useAuth>['session'],
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      // Mock role fetch response
      getMockSupabase().setResponse({ data: { role: 'coach' }, error: null });

      renderWithRoutes('/protected');

      // Wait for protected content to be visible
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });

  describe('role-based access', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' } as ReturnType<typeof useAuth>['user'],
        loading: false,
        session: {} as ReturnType<typeof useAuth>['session'],
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });
    });

    it('allows access when role matches required role', async () => {
      getMockSupabase().setResponse({ data: { role: 'coach' }, error: null });

      renderWithRoutes('/protected', 'coach');

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('redirects coach to /dashboard when accessing student route', async () => {
      getMockSupabase().setResponse({ data: { role: 'coach' }, error: null });

      renderWithRoutes('/protected', 'student');

      await waitFor(() => {
        expect(screen.getByTestId('coach-dashboard')).toBeInTheDocument();
      });
    });

    it('redirects student to /app when accessing coach route', async () => {
      getMockSupabase().setResponse({ data: { role: 'student' }, error: null });

      renderWithRoutes('/protected', 'coach');

      await waitFor(() => {
        expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
      });
    });

    it('redirects to login when role is null', async () => {
      getMockSupabase().setResponse({ data: { role: null }, error: null });

      renderWithRoutes('/protected', 'coach');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });
  });
});
