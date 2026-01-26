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

  describe('rendering', () => {
    it('renders dialog with title when open', async () => {
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('How are you feeling today?')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<CheckInModal {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows all sentiment options', async () => {
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /great/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /okay/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tired/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sore/i })).toBeInTheDocument();
    });
  });

  describe('sentiment selection', () => {
    it('highlights selected sentiment', async () => {
      const user = userEvent.setup();
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const greatButton = screen.getByRole('button', { name: /great/i });
      await user.click(greatButton);

      expect(greatButton.className).toContain('border-primary');
    });

    it('shows notes field for tired sentiment', async () => {
      const user = userEvent.setup();
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // No textbox initially
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

      // Click tired button
      await user.click(screen.getByRole('button', { name: /tired/i }));

      // Textbox appears
      const textbox = screen.getByRole('textbox');
      expect(textbox).toBeInTheDocument();
      expect(textbox).toHaveAttribute('placeholder', expect.stringMatching(/sleep well/i));
    });

    it('shows notes field for sore sentiment', async () => {
      const user = userEvent.setup();
      render(<CheckInModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sore/i }));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });
});
