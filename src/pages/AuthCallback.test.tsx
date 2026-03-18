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
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');

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

  it('still exchanges callback code when a session already exists', async () => {
    const mockSession = createMockSession({ userId: 'user-2' });
    const mock = getMockSupabase();

    mock.auth.getSession.mockResolvedValueOnce({ data: { session: mockSession }, error: null });
    mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });

    mock.setResponse({ data: { role: 'coach', timezone: 'UTC' }, error: null });

    render(<AuthCallback />, { initialRoute: '/auth/callback?code=url-code' });

    await waitFor(() => {
      expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith('url-code');
    });
  });

  it('verifies recovery token hashes and redirects to reset mode', async () => {
    const mockSession = createMockSession({ userId: 'user-3' });
    const mock = getMockSupabase();

    mock.auth.getSession
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({ data: { session: mockSession }, error: null });

    mock.auth.verifyOtp.mockResolvedValueOnce({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });

    render(<AuthCallback />, { initialRoute: '/auth/callback?token_hash=recovery-hash&type=recovery' });

    await waitFor(() => {
      expect(mock.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'recovery-hash',
        type: 'recovery',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?mode=reset', { replace: true });
    });

    expect(sessionStorage.getItem('tcc_password_reset_pending')).toBe('true');
  });

  it('treats PKCE recovery callbacks without a url type as reset mode', async () => {
    const mockSession = createMockSession({ userId: 'user-5' });
    const mock = getMockSupabase();

    mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { session: mockSession, user: mockSession.user, redirectType: 'PASSWORD_RECOVERY' },
      error: null,
    });
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    render(<AuthCallback />, { initialRoute: '/auth/callback?code=recovery-code' });

    await waitFor(() => {
      expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith('recovery-code');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?mode=reset', { replace: true });
    });

    expect(sessionStorage.getItem('tcc_password_reset_pending')).toBe('true');
  });

  it('treats recovery url params as reset mode even when exchange metadata omits the redirect type', async () => {
    const mockSession = createMockSession({ userId: 'user-6' });
    const mock = getMockSupabase();

    mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    render(<AuthCallback />, { initialRoute: '/auth/callback?code=recovery-code&type=recovery' });

    await waitFor(() => {
      expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith('recovery-code');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?mode=reset', { replace: true });
    });

    expect(sessionStorage.getItem('tcc_password_reset_pending')).toBe('true');
  });

  it('keeps email confirmation callbacks on the confirmed-login fallback when pkce verification is missing', async () => {
    const mock = getMockSupabase();

    mock.auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { session: null, user: null, redirectType: null },
      error: { message: 'PKCE code verifier missing' },
    });
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(<AuthCallback />, { initialRoute: '/auth/callback?code=confirm-code' });

    await waitFor(() => {
      expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith('confirm-code');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?confirmed=true', { replace: true });
    });
  });

  it('treats fragment recovery sessions as password reset callbacks', async () => {
    const mockSession = createMockSession({ userId: 'user-4' });
    const mock = getMockSupabase();

    mock.auth.setSession.mockResolvedValueOnce({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    window.history.replaceState(
      {},
      '',
      '/auth/callback#access_token=access-token&refresh_token=refresh-token&type=recovery'
    );

    render(<AuthCallback />, { initialRoute: '/auth/callback' });

    await waitFor(() => {
      expect(mock.auth.setSession).toHaveBeenCalledWith({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?mode=reset', { replace: true });
    });
  });
});
