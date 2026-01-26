import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type React from 'react';

// These imports MUST come after the vi.mock calls are hoisted
// but vi.mock factories cannot use these imports
import {
  getMockSupabase,
  resetMockSupabase,
  createMockSession,
} from '@/test/mocks/supabase';

// Mock useNavigate to capture navigation calls
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

// Mock Supabase client using a Proxy that lazily accesses getMockSupabase
// The proxy is created inline so it doesn't reference hoisted imports
vi.mock('@/integrations/supabase/client', async () => {
  // Use dynamic import inside the factory
  const { getMockSupabase: getSupabase } = await import('@/test/mocks/supabase');
  return {
    supabase: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          const mock = getSupabase();
          if (!mock) return undefined;
          return (mock.client as Record<string, unknown>)[prop];
        },
      }
    ),
  };
});

// Import useAuth AFTER mocks are set up (hoisting will handle order correctly)
import { useAuth } from './useAuth';

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );
}

describe('useAuth', () => {
  // Captured auth state change callback for triggering events in tests
  let authStateCallback: ((event: string, session: unknown) => void) | null = null;

  beforeEach(() => {
    resetMockSupabase();
    mockNavigate.mockClear();
    authStateCallback = null;

    const mock = getMockSupabase();
    mock.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  describe('loading state', () => {
    it('starts in loading state', () => {
      // Mock getSession to never resolve (pending promise)
      getMockSupabase().auth.getSession.mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });
  });

  describe('authenticated state', () => {
    it('sets user when session exists', async () => {
      const mockSession = createMockSession({ userId: 'user-1' });
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user?.id).toBe('user-1');
      expect(result.current.session).toBeDefined();
    });
  });

  describe('unauthenticated state', () => {
    it('sets user to null when no session', async () => {
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('session expiry', () => {
    it('sets sessionExpired on SIGNED_OUT event', async () => {
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        authStateCallback?.('SIGNED_OUT', null);
      });

      expect(result.current.sessionExpired).toBe(true);
    });

    it('clears sessionExpired on TOKEN_REFRESHED', async () => {
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // First trigger SIGNED_OUT to set sessionExpired
      act(() => {
        authStateCallback?.('SIGNED_OUT', null);
      });
      expect(result.current.sessionExpired).toBe(true);

      // Then trigger TOKEN_REFRESHED to clear it
      const newSession = createMockSession();
      act(() => {
        authStateCallback?.('TOKEN_REFRESHED', newSession);
      });

      expect(result.current.sessionExpired).toBe(false);
    });
  });

  describe('signOut', () => {
    it('navigates to home and signs out', async () => {
      const mockSession = createMockSession();
      getMockSupabase().auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(getMockSupabase().auth.signOut).toHaveBeenCalled();
    });
  });
});
