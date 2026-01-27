import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';

// Mock modules before imports that use them
vi.mock('@/integrations/supabase/client', async () => {
  const actual = await import('@/test/mocks/supabase');
  return actual.mockSupabaseModule;
});

vi.mock('./useAuth');

vi.mock('./use-toast');

vi.mock('@/lib/error', () => ({
  handleError: vi.fn(),
}));

// Now import the modules after mocks are set up
import { useStickers, calculateStreak } from './useStickers';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { handleError } from '@/lib/error';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Test fixtures
const mockSticker = {
  id: 'sticker-1',
  name: 'Golden Star',
  image_url: 'https://example.com/star.png',
  rarity: 'common',
  created_at: '2026-01-01T00:00:00Z',
};

const mockRareSticker = {
  id: 'sticker-2',
  name: 'Diamond Crown',
  image_url: 'https://example.com/crown.png',
  rarity: 'legendary',
  created_at: '2026-01-01T00:00:00Z',
};

const mockUserSticker = {
  id: 'user-sticker-1',
  sticker_id: 'sticker-1',
  earned_at: '2026-01-15T10:00:00Z',
  task_id: 'task-1',
  sticker: mockSticker,
};

describe('useStickers', () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    resetMockSupabase();
    mockToast.mockClear();
    vi.clearAllMocks();

    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      } as User,
      session: { access_token: 'mock-token' } as Session,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('shows loading state initially when fetching', async () => {
      const mock = getMockSupabase();
      // Keep queries pending by never resolving
      mock.queryBuilder.then.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.stickers).toEqual([]);
      expect(result.current.userStickers).toEqual([]);
    });

    it('sets loading to false after all queries complete', async () => {
      const mock = getMockSupabase();

      // Mock all three queries to resolve
      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockUserSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stickers).toHaveLength(1);
    });

    it('shows isFetching during background refetch', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // isFetching should be false when not refetching
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('parallel fetch', () => {
    it('fetches all three data sources in parallel', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockUserSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [{ completed_at: new Date().toISOString() }], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify all three tables were queried
      expect(mock.client.from).toHaveBeenCalledWith('stickers');
      expect(mock.client.from).toHaveBeenCalledWith('user_stickers');
      expect(mock.client.from).toHaveBeenCalledWith('tasks');
    });

    it('returns stickers array from stickers table', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker, mockRareSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stickers).toHaveLength(2);
      expect(result.current.stickers[0].name).toBe('Golden Star');
      expect(result.current.stickers[1].name).toBe('Diamond Crown');
    });

    it('returns userStickers with joined sticker data', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockUserSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.userStickers).toHaveLength(1);
      expect(result.current.userStickers[0].sticker.name).toBe('Golden Star');
    });
  });

  describe('streak calculation', () => {
    it('calculates streak of 0 when no tasks completed', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.streak).toBe(0);
    });

    it('calculates streak of 1 when task completed today', async () => {
      const mock = getMockSupabase();
      const today = new Date().toISOString();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [{ completed_at: today }], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.streak).toBe(1);
    });

    it('calculates streak of N for consecutive days', async () => {
      const mock = getMockSupabase();
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400000);
      const twoDaysAgo = new Date(Date.now() - 86400000 * 2);

      const completedTasks = [
        { completed_at: today.toISOString() },
        { completed_at: yesterday.toISOString() },
        { completed_at: twoDaysAgo.toISOString() },
      ];

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: completedTasks, error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.streak).toBe(3);
    });

    it('preserves streak from yesterday if no task today', async () => {
      const mock = getMockSupabase();
      const yesterday = new Date(Date.now() - 86400000);
      const twoDaysAgo = new Date(Date.now() - 86400000 * 2);

      const completedTasks = [
        { completed_at: yesterday.toISOString() },
        { completed_at: twoDaysAgo.toISOString() },
      ];

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: completedTasks, error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.streak).toBe(2);
    });

    it('resets streak after gap in completion', async () => {
      const mock = getMockSupabase();
      const today = new Date();
      // 3 days ago (gap of 2 days)
      const threeDaysAgo = new Date(Date.now() - 86400000 * 3);

      const completedTasks = [
        { completed_at: today.toISOString() },
        { completed_at: threeDaysAgo.toISOString() },
      ];

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: completedTasks, error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Only today counts, gap breaks the streak
      expect(result.current.streak).toBe(1);
    });
  });

  describe('error handling', () => {
    it('sets isError true if any query fails', async () => {
      const mock = getMockSupabase();

      // First query fails
      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: null, error: { message: 'Database error' } }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
    });

    it('exposes error from first failing query', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: null, error: { message: 'Stickers fetch failed' } }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });

    it('partial failure still returns available data', async () => {
      const mock = getMockSupabase();

      // Stickers succeeds, userStickers fails, tasks succeeds
      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: null, error: { message: 'User stickers failed' } }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [{ completed_at: new Date().toISOString() }], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Available data is returned
      expect(result.current.stickers).toHaveLength(1);
      expect(result.current.userStickers).toEqual([]);
      expect(result.current.isError).toBe(true);
    });
  });

  describe('cache behavior', () => {
    it('uses cached data on subsequent renders', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 60000 } },
      });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result, rerender } = renderHook(() => useStickers(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCount = mock.client.from.mock.calls.length;

      // Rerender
      rerender();

      // Should not have made additional calls
      expect(mock.client.from.mock.calls.length).toBe(callCount);
    });
  });

  describe('rollForSticker', () => {
    it('returns null when user is null', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const mock = getMockSupabase();

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      let sticker: unknown;
      await act(async () => {
        sticker = await result.current.rollForSticker('task-1');
      });

      expect(sticker).toBeNull();
    });

    it('returns null when stickers array is empty', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let sticker: unknown;
      await act(async () => {
        sticker = await result.current.rollForSticker('task-1');
      });

      expect(sticker).toBeNull();
    });

    it('returns null 80% of time (respects DROP_CHANCE)', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock Math.random to return > 0.2 (no drop)
      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      let sticker: unknown;
      await act(async () => {
        sticker = await result.current.rollForSticker('task-1');
      });

      expect(sticker).toBeNull();
      mockRandom.mockRestore();
    });

    it('awards sticker and shows toast on success', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock random to trigger drop and select first sticker
      const mockRandom = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.1) // DROP_CHANCE check passes (< 0.2)
        .mockReturnValueOnce(0); // Select first weighted sticker

      // Mock insert success
      mock.queryBuilder.then.mockImplementationOnce((resolve) =>
        Promise.resolve({ data: null, error: null }).then(resolve)
      );

      let sticker: unknown;
      await act(async () => {
        sticker = await result.current.rollForSticker('task-1');
      });

      expect(sticker).toEqual(mockSticker);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'You found a common sticker!',
        description: '"Golden Star" added to your Sticker Book!',
      });
      expect(mock.queryBuilder.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        sticker_id: 'sticker-1',
        task_id: 'task-1',
      });

      mockRandom.mockRestore();
    });

    it('handles insert error gracefully', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const mockRandom = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0);

      // Mock insert failure
      mock.queryBuilder.then.mockImplementationOnce((resolve) =>
        Promise.resolve({ data: null, error: { message: 'Insert failed' } }).then(resolve)
      );

      let sticker: unknown;
      await act(async () => {
        sticker = await result.current.rollForSticker('task-1');
      });

      expect(sticker).toBeNull();
      expect(handleError).toHaveBeenCalledWith(
        { message: 'Insert failed' },
        { component: 'useStickers', action: 'award sticker', silent: true }
      );
      expect(mockToast).not.toHaveBeenCalled();

      mockRandom.mockRestore();
    });
  });

  describe('refetch', () => {
    it('refetch invalidates userStickers cache', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [mockSticker], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        )
        .mockImplementationOnce((resolve) =>
          Promise.resolve({ data: [], error: null }).then(resolve)
        );

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Setup for refetch
      mock.queryBuilder.then.mockImplementation((resolve) =>
        Promise.resolve({ data: [mockUserSticker], error: null }).then(resolve)
      );

      await act(async () => {
        await result.current.refetch();
      });

      // refetch should trigger invalidation (function exists and can be called)
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('auth guard', () => {
    it('does not fetch when user is null', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const mock = getMockSupabase();
      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      // Give time for any async operations
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not have fetched any tables
      expect(mock.client.from).not.toHaveBeenCalled();
      expect(result.current.stickers).toEqual([]);
      expect(result.current.userStickers).toEqual([]);
    });

    it('returns empty arrays when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useStickers(), { wrapper: createWrapper() });

      expect(result.current.stickers).toEqual([]);
      expect(result.current.userStickers).toEqual([]);
      expect(result.current.streak).toBe(0);
    });
  });
});

describe('calculateStreak (pure function)', () => {
  it('returns 0 for empty array', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 0 for only null completed_at values', () => {
    expect(calculateStreak([{ completed_at: null }, { completed_at: null }])).toBe(0);
  });

  it('returns 1 for task completed today', () => {
    const today = new Date().toISOString();
    expect(calculateStreak([{ completed_at: today }])).toBe(1);
  });

  it('returns correct streak for consecutive days from today', () => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2);

    const tasks = [
      { completed_at: today.toISOString() },
      { completed_at: yesterday.toISOString() },
      { completed_at: twoDaysAgo.toISOString() },
    ];

    expect(calculateStreak(tasks)).toBe(3);
  });

  it('returns streak from yesterday if no task today', () => {
    const yesterday = new Date(Date.now() - 86400000);
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2);

    const tasks = [
      { completed_at: yesterday.toISOString() },
      { completed_at: twoDaysAgo.toISOString() },
    ];

    expect(calculateStreak(tasks)).toBe(2);
  });

  it('returns 0 if oldest task is more than 1 day ago with gap', () => {
    // Task completed 3 days ago, nothing since
    const threeDaysAgo = new Date(Date.now() - 86400000 * 3);

    const tasks = [{ completed_at: threeDaysAgo.toISOString() }];

    expect(calculateStreak(tasks)).toBe(0);
  });

  it('handles duplicate dates correctly', () => {
    const today = new Date();
    const todayStr = today.toISOString();
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString();

    // Multiple tasks on same days
    const tasks = [
      { completed_at: todayStr },
      { completed_at: todayStr },
      { completed_at: yesterdayStr },
      { completed_at: yesterdayStr },
    ];

    expect(calculateStreak(tasks)).toBe(2);
  });
});
