import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@/test/test-utils';
import {
  getMockSupabase,
  resetMockSupabase,
  createMockSession,
} from '@/test/mocks/supabase';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as object), useNavigate: () => mockNavigate };
});

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

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/auth/persistRoleMetadata', () => ({
  persistRoleToAuthMetadata: vi.fn().mockResolvedValue(undefined),
}));

import AuthCallback from './AuthCallback';

describe('AuthCallback', () => {
  beforeEach(() => {
    resetMockSupabase();
    mockNavigate.mockClear();
    mockToast.mockClear();
    localStorage.clear();

    const mock = getMockSupabase();
    mock.auth.exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('uses stored code when URL code is missing', async () => {
    localStorage.setItem('authCallbackCode', 'stored-code');

    const mockSession = createMockSession({ userId: 'user-1' });
    const mock = getMockSupabase();

    mock.auth.getSession
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({ data: { session: mockSession }, error: null });

    mock.setResponse({ data: { role: 'coach', timezone: 'UTC' }, error: null });

    render(<AuthCallback />, { initialRoute: '/auth/callback' });

    await waitFor(() => {
      expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith('stored-code');
    });
  });

  it('skips code exchange when session already exists', async () => {
    const mockSession = createMockSession({ userId: 'user-2' });
    const mock = getMockSupabase();

    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    mock.setResponse({ data: { role: 'coach', timezone: 'UTC' }, error: null });

    render(<AuthCallback />, { initialRoute: '/auth/callback?code=url-code' });

    await waitFor(() => {
      expect(mock.auth.getSession).toHaveBeenCalled();
    });

    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
