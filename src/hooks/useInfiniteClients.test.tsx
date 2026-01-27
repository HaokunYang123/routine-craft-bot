import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';
import React from 'react';

// Mock modules before imports that use them
vi.mock('@/integrations/supabase/client', async () => {
  const actual = await import('@/test/mocks/supabase');
  return actual.mockSupabaseModule;
});

vi.mock('./useAuth');

// Now import the modules after mocks are set up
import { useInfiniteClients } from './useInfiniteClients';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';
import { useAuth } from './useAuth';
import { queryKeys } from '@/lib/queries/keys';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useInfiniteClients', () => {
  const mockUser = {
    id: 'coach-1',
    email: 'coach@example.com',
  } as User;

  const mockClients = [
    {
      id: 'client-1',
      name: 'Client A',
      join_code: 'ABC123',
      is_active: true,
      default_template_id: null,
      created_at: '2026-01-15T10:00:00Z',
      coach_id: 'coach-1',
    },
    {
      id: 'client-2',
      name: 'Client B',
      join_code: 'DEF456',
      is_active: true,
      default_template_id: 'template-1',
      created_at: '2026-01-14T10:00:00Z',
      coach_id: 'coach-1',
    },
    {
      id: 'client-3',
      name: 'Client C',
      join_code: 'GHI789',
      is_active: true,
      default_template_id: null,
      created_at: '2026-01-13T10:00:00Z',
      coach_id: 'coach-1',
    },
  ];

  beforeEach(() => {
    resetMockSupabase();

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { access_token: 'mock-token' } as Session,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });
  });

  describe('query key', () => {
    it('uses correct query key with userId and pageSize', () => {
      // Verify query key structure
      const key = queryKeys.clients.infinite('coach-1', 25);
      expect(key).toEqual(['clients', 'infinite', 'coach-1', 25]);
    });

    it('generates different keys for different page sizes', () => {
      const key25 = queryKeys.clients.infinite('coach-1', 25);
      const key50 = queryKeys.clients.infinite('coach-1', 50);
      expect(key25).not.toEqual(key50);
    });
  });

  describe('fetching first page', () => {
    it('returns empty data when user not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const mock = getMockSupabase();
      const { result } = renderHook(() => useInfiniteClients(), {
        wrapper: createWrapper(),
      });

      // Give time for any async operations
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not have called from('class_sessions')
      expect(mock.client.from).not.toHaveBeenCalledWith('class_sessions');
      expect(result.current.data).toBeUndefined();
    });

    it('fetches first page successfully', async () => {
      const mock = getMockSupabase();

      // Mock query response with count
      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: mockClients.slice(0, 2),
            error: null,
            count: 3,
          }).then(resolve);
        }
      );

      const { result } = renderHook(() => useInfiniteClients(2), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.pages).toHaveLength(1);
      expect(result.current.data?.pages[0].data).toHaveLength(2);
      expect(result.current.data?.pages[0].totalCount).toBe(3);
    });

    it('builds correct query with coach_id and is_active filters', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: [],
            error: null,
            count: 0,
          }).then(resolve);
        }
      );

      renderHook(() => useInfiniteClients(25), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mock.client.from).toHaveBeenCalledWith('class_sessions');
      });

      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('coach_id', 'coach-1');
      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(mock.queryBuilder.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(mock.queryBuilder.limit).toHaveBeenCalledWith(25);
    });
  });

  describe('pagination', () => {
    it('returns hasNextPage true when page is full', async () => {
      const mock = getMockSupabase();

      // Return exactly pageSize items (2) - indicates more may exist
      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: mockClients.slice(0, 2),
            error: null,
            count: 3,
          }).then(resolve);
        }
      );

      const { result } = renderHook(() => useInfiniteClients(2), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.data?.pages[0].nextCursor).toBe(
        '2026-01-14T10:00:00Z'
      );
    });

    it('returns hasNextPage false when fewer items than pageSize', async () => {
      const mock = getMockSupabase();

      // Return fewer than pageSize items (1 out of 2) - no more pages
      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: [mockClients[0]],
            error: null,
            count: 1,
          }).then(resolve);
        }
      );

      const { result } = renderHook(() => useInfiniteClients(2), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.data?.pages[0].nextCursor).toBeNull();
    });

    it('fetches subsequent pages with cursor', async () => {
      const mock = getMockSupabase();

      // First page - setup before hook renders
      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: mockClients.slice(0, 2),
            error: null,
            count: 3,
          }).then(resolve);
        }
      );

      // Second page - queue it immediately after first
      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: [mockClients[2]],
            error: null,
            count: 3,
          }).then(resolve);
        }
      );

      const { result } = renderHook(() => useInfiniteClients(2), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify first page loaded with hasNextPage
      expect(result.current.hasNextPage).toBe(true);

      // Fetch next page
      await act(async () => {
        await result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.data?.pages).toHaveLength(2);
      });

      // Verify cursor was used (lt filter with last item's created_at)
      expect(mock.queryBuilder.lt).toHaveBeenCalledWith(
        'created_at',
        '2026-01-14T10:00:00Z'
      );

      // Second page has remaining item
      expect(result.current.data?.pages[1].data).toHaveLength(1);
      expect(result.current.data?.pages[1].data[0].id).toBe('client-3');
    });

    it('includes totalCount in response', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: mockClients,
            error: null,
            count: 100, // Total in database
          }).then(resolve);
        }
      );

      const { result } = renderHook(() => useInfiniteClients(25), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.pages[0].totalCount).toBe(100);
    });
  });

  describe('error handling', () => {
    it('handles Supabase errors', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' },
            count: null,
          }).then(resolve);
        }
      );

      const { result } = renderHook(() => useInfiniteClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('returns empty data array when query returns null', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: null,
            error: null,
            count: 0,
          }).then(resolve);
        }
      );

      const { result } = renderHook(() => useInfiniteClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.pages[0].data).toEqual([]);
      expect(result.current.data?.pages[0].totalCount).toBe(0);
    });
  });

  describe('loading states', () => {
    it('exposes isFetchingNextPage during page fetch', async () => {
      const mock = getMockSupabase();

      // First page
      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return Promise.resolve({
            data: mockClients.slice(0, 2),
            error: null,
            count: 3,
          }).then(resolve);
        }
      );

      const { result } = renderHook(() => useInfiniteClients(2), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // isFetchingNextPage should be false initially
      expect(result.current.isFetchingNextPage).toBe(false);

      // Setup slow second page
      let resolveSecondPage: ((value: unknown) => void) | null = null;
      mock.queryBuilder.then.mockImplementationOnce(
        (resolve: (value: unknown) => unknown) => {
          return new Promise((r) => {
            resolveSecondPage = r;
          }).then(resolve);
        }
      );

      // Start fetching next page
      act(() => {
        result.current.fetchNextPage();
      });

      // Should be fetching
      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(true);
      });

      // Complete the fetch
      await act(async () => {
        resolveSecondPage?.({
          data: [mockClients[2]],
          error: null,
          count: 3,
        });
      });

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false);
      });
    });
  });
});
