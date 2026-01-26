import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import {
  getMockSupabase,
  resetMockSupabase,
} from '@/test/mocks/supabase';

// Mock useAuth
vi.mock('@/hooks/useAuth');

// Mock Supabase client using a Proxy that lazily accesses getMockSupabase
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

// Mock useToast to capture toast calls
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Import useAuth after mocks
import { useAuth } from '@/hooks/useAuth';
import { CheckInModal } from './CheckInModal';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onCheckInComplete: vi.fn(),
};

describe('CheckInModal', () => {
  beforeEach(() => {
    resetMockSupabase();
    localStorage.clear();
    mockToast.mockClear();
    defaultProps.onOpenChange.mockClear();
    defaultProps.onCheckInComplete.mockClear();

    // Mock useAuth with authenticated user
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'student-1', email: 'student@example.com' } as ReturnType<typeof useAuth>['user'],
      session: {} as ReturnType<typeof useAuth>['session'],
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });

    // Set default supabase response (no existing check-in)
    getMockSupabase().setResponse({ data: null, error: null });
  });
});
