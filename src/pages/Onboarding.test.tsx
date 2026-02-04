import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

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

import { useAuth } from '@/hooks/useAuth';
import Onboarding from './Onboarding';

function renderWithRoutes(initialRoute = '/onboarding') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<div data-testid="auth-page">Auth Page</div>} />
        <Route path="/dashboard" element={<div data-testid="coach-dashboard">Coach Dashboard</div>} />
        <Route path="/app" element={<div data-testid="student-dashboard">Student Dashboard</div>} />
        <Route path="/onboarding" element={<Onboarding />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Onboarding', () => {
  beforeEach(() => {
    resetMockSupabase();
    vi.clearAllMocks();
  });

  it('redirects signed-out user to auth page', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    renderWithRoutes();

    await waitFor(() => {
      expect(screen.getByTestId('auth-page')).toBeInTheDocument();
    });
  });

  it('redirects signed-in coach to coach dashboard', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'coach-1', email: 'coach@example.com' } as ReturnType<typeof useAuth>['user'],
      session: {} as ReturnType<typeof useAuth>['session'],
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    getMockSupabase().setResponse({ data: { role: 'coach' }, error: null });

    renderWithRoutes();

    await waitFor(() => {
      expect(screen.getByTestId('coach-dashboard')).toBeInTheDocument();
    });
  });

  it('redirects signed-in student to student dashboard', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'student-1', email: 'student@example.com' } as ReturnType<typeof useAuth>['user'],
      session: {} as ReturnType<typeof useAuth>['session'],
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    getMockSupabase().setResponse({ data: { role: 'student' }, error: null });

    renderWithRoutes();

    await waitFor(() => {
      expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
    });
  });

  it('renders role picker when role is missing', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' } as ReturnType<typeof useAuth>['user'],
      session: {} as ReturnType<typeof useAuth>['session'],
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    getMockSupabase().setResponse({ data: { role: null }, error: null });

    renderWithRoutes();

    await waitFor(() => {
      expect(screen.getByText(/finish setup/i)).toBeInTheDocument();
    });

    expect(screen.getByText("I'm a Coach")).toBeInTheDocument();
    expect(screen.getByText("I'm a Student")).toBeInTheDocument();
  });
});
