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

vi.mock('./use-toast');

vi.mock('@/lib/error', () => ({
  handleError: vi.fn(),
}));

// Now import the modules after mocks are set up
import { useProfile } from './useProfile';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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

describe('useProfile', () => {
  const mockToast = vi.fn();

  const mockProfile = {
    id: 'profile-1',
    user_id: 'user-1',
    display_name: 'Test User',
    email: 'test@example.com',
    avatar_url: null,
    role: 'coach',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    resetMockSupabase();
    mockToast.mockClear();

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

  describe('fetching profile', () => {
    it('returns loading state initially', async () => {
      const mock = getMockSupabase();
      // Don't resolve immediately - let loading state be captured
      mock.queryBuilder.single.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.profile).toBeNull();
    });

    it('returns profile data on successful fetch', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isError).toBe(false);
    });

    it('creates profile when not found (PGRST116)', async () => {
      const mock = getMockSupabase();

      // First fetch returns not found error
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      // Insert + select returns created profile
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockProfile, id: 'new-profile-1' },
        error: null,
      });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).not.toBeNull();
      expect(mock.queryBuilder.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        display_name: 'Test User',
        email: 'test@example.com',
        role: 'coach',
      });
    });

    it('handles fetch error', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'UNKNOWN', message: 'Database error' },
      });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });

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
      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      // Give time for any async operations
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not have called from('profiles') - this is the key assertion
      expect(mock.client.from).not.toHaveBeenCalledWith('profiles');
      expect(result.current.profile).toBeNull();
      // Note: isPending starts true in React Query v5 when disabled, but no fetch occurs
    });
  });

  describe('updateProfile', () => {
    it('updates profile and shows toast on success', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock update response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock refetch after invalidation
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockProfile, display_name: 'Updated Name' },
        error: null,
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateProfile({ display_name: 'Updated Name' });
      });

      expect(success).toBe(true);
      expect(mock.queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'Updated Name' })
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Profile Updated',
        description: 'Your changes have been saved.',
      });
    });

    it('returns false when user is null', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateProfile({ display_name: 'Test' });
      });

      expect(success).toBe(false);
    });

    it('handles update error', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock update error
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Update failed' } }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateProfile({ display_name: 'New Name' });
      });

      expect(success).toBe(false);
    });
  });

  describe('computed values', () => {
    it('computes displayName from profile', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.displayName).toBe('Test User');
    });

    it('falls back to email prefix when no display_name', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockProfile, display_name: null },
        error: null,
      });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.displayName).toBe('test');
    });

    it('computes initials from displayName', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.initials).toBe('TE');
    });

    it('extracts avatarEmoji from avatar_url', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockProfile, avatar_url: 'emoji:🎉' },
        error: null,
      });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.avatarEmoji).toBe('🎉');
      expect(result.current.avatarDisplay).toBe('🎉');
    });

    it('uses initials when no avatar emoji', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.avatarEmoji).toBeNull();
      expect(result.current.avatarDisplay).toBe('TE');
    });
  });

  describe('fetchProfile (refetch)', () => {
    it('triggers refetch when called', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Setup for refetch
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockProfile, display_name: 'Refetched Name' },
        error: null,
      });

      await act(async () => {
        await result.current.fetchProfile();
      });

      await waitFor(() => {
        expect(result.current.profile?.display_name).toBe('Refetched Name');
      });
    });
  });

  describe('mutation loading states', () => {
    it('exposes isUpdating state', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // isUpdating should start as false
      expect(result.current.isUpdating).toBe(false);
    });

    it('isUpdating becomes false after updateProfile completes', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.single.mockResolvedValueOnce({ data: mockProfile, error: null });

      const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock update response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock refetch after invalidation
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockProfile, display_name: 'Updated Name' },
        error: null,
      });

      await act(async () => {
        await result.current.updateProfile({ display_name: 'Updated Name' });
      });

      // After completion, isUpdating should be false
      expect(result.current.isUpdating).toBe(false);
    });
  });
});
