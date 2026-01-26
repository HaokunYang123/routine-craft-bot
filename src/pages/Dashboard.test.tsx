import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import Dashboard from './Dashboard';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

// Mock useAuth
vi.mock('@/hooks/useAuth');

// Mock Supabase client (same pattern as other tests)
vi.mock('@/integrations/supabase/client', async () => {
  const { getMockSupabase: getSupabase } = await import('@/test/mocks/supabase');
  return {
    supabase: new Proxy({}, {
      get: (_target: unknown, prop: string) => {
        const mock = getSupabase();
        return (mock?.client as Record<string, unknown>)?.[prop];
      },
    }),
  };
});

// Import useAuth after mocks
import { useAuth } from '@/hooks/useAuth';

describe('Dashboard', () => {
  beforeEach(() => {
    resetMockSupabase();
    // Mock useAuth with authenticated coach user
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'coach-1', email: 'coach@example.com' } as any,
      session: {} as any,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });
  });

  describe('loading state', () => {
    it('shows loading skeleton while fetching data', () => {
      // Make profile query never resolve
      getMockSupabase().queryBuilder.maybeSingle.mockImplementation(
        () => new Promise(() => {})
      );

      render(<Dashboard />);

      // Verify skeleton is visible via animate-pulse class
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('data display', () => {
    it('displays welcome message with user name after loading', async () => {
      const mock = getMockSupabase();

      // Mock profile response
      mock.queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { display_name: 'Coach Jane' },
        error: null,
      });

      // Mock stats responses using then() for Promise.all queries
      // Dashboard.tsx uses { count: "exact", head: true } which puts result in count field
      mock.queryBuilder.then
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 5, error: null }).then(resolve))   // people count
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 20, error: null }).then(resolve))  // total tasks count
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 15, error: null }).then(resolve)); // completed count

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back.*coach jane/i)).toBeInTheDocument();
      });
    });

    it('displays stats counts', async () => {
      const mock = getMockSupabase();

      // Mock profile response
      mock.queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { display_name: 'Coach Jane' },
        error: null,
      });

      // Mock stats responses
      mock.queryBuilder.then
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 5, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 20, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 15, error: null }).then(resolve));

      render(<Dashboard />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify stats display
      expect(screen.getByText('5')).toBeInTheDocument(); // People count
      expect(screen.getByText('20')).toBeInTheDocument(); // Total tasks
      expect(screen.getByText('15')).toBeInTheDocument(); // Completed tasks
    });
  });

  describe('UI elements', () => {
    it('renders stat cards with correct labels', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { display_name: 'Coach Jane' },
        error: null,
      });

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 5, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 20, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 15, error: null }).then(resolve));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    });

    it('calculates and displays completion rate', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { display_name: 'Coach Jane' },
        error: null,
      });

      // Mock stats: 20 total, 15 completed (= 75%)
      mock.queryBuilder.then
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 5, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 20, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 15, error: null }).then(resolve));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('renders quick action cards with links', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { display_name: 'Coach Jane' },
        error: null,
      });

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 5, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 20, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 15, error: null }).then(resolve));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      });

      expect(screen.getByText('Add a Person')).toBeInTheDocument();

      // Verify links exist
      const assistantLink = screen.getByRole('link', { name: /open chat/i });
      expect(assistantLink).toHaveAttribute('href', '/dashboard/assistant');

      const addPersonLink = screen.getByRole('link', { name: /add person/i });
      expect(addPersonLink).toHaveAttribute('href', '/dashboard/people');
    });
  });

  describe('edge cases', () => {
    it('shows 0% completion when no tasks', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { display_name: 'Coach Jane' },
        error: null,
      });

      // Mock stats: 0 total, 0 completed
      mock.queryBuilder.then
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 3, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 0, error: null }).then(resolve))
        .mockImplementationOnce((resolve) => Promise.resolve({ data: null, count: 0, error: null }).then(resolve));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });
  });
});
