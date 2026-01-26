import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { GeneratedPlan } from './useAIAssistant';

// Mock supabase before importing hook
const mockFunctionsInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('./useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Import hook after mocks are set up
import { useAIAssistant } from './useAIAssistant';

// Test constants matching hook implementation
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s exponential backoff

describe('useAIAssistant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Mock authenticated user
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: { access_token: 'mock-token' },
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generatePlan success', () => {
    it('returns success with AI-generated plan', async () => {
      const mockPlan: GeneratedPlan = {
        name: 'Beginner Plan',
        description: 'A 4-week beginner training plan',
        tasks: [
          { title: 'Warm up', description: 'Dynamic stretches', duration_minutes: 10, day_offset: 0 },
          { title: 'Main workout', description: 'Full body exercises', duration_minutes: 30, day_offset: 0 },
        ],
      };

      mockFunctionsInvoke.mockResolvedValue({
        data: { result: mockPlan },
        error: null,
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;
      await act(async () => {
        response = await result.current.generatePlan('Create a 4-week beginner plan');
      });

      expect(response!.success).toBe(true);
      expect(response!.data).toEqual(mockPlan);
      expect(response!.error).toBeUndefined();
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('ai-assistant', {
        body: {
          action: 'generate_plan',
          payload: { request: 'Create a 4-week beginner plan', context: undefined },
          userId: 'user-1',
        },
      });
    });

    it('sets loading state during request', async () => {
      let resolveInvoke: (value: unknown) => void;
      const invokePromise = new Promise((resolve) => {
        resolveInvoke = resolve;
      });
      mockFunctionsInvoke.mockImplementation(() => invokePromise);

      const { result } = renderHook(() => useAIAssistant());

      expect(result.current.loading).toBe(false);

      let responsePromise: Promise<unknown>;
      act(() => {
        responsePromise = result.current.generatePlan('test');
      });

      // Loading should be true while request is pending
      expect(result.current.loading).toBe(true);

      // Resolve the request
      await act(async () => {
        resolveInvoke!({ data: { result: { name: 'Test', tasks: [] } }, error: null });
        await responsePromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('timeout handling', () => {
    it('returns error after MAX_RETRIES exceeded', async () => {
      mockFunctionsInvoke.mockRejectedValue({
        name: 'AbortError',
        message: 'The operation was aborted',
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;

      // Start the request (don't await - let it run with timer control)
      const requestPromise = act(async () => {
        response = await result.current.generatePlan('test plan');
      });

      // Run all timers to completion (handles all retry delays)
      await vi.runAllTimersAsync();
      await requestPromise;

      expect(response!.success).toBe(false);
      expect(response!.error).toContain('timed out');
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3
    });

    it('sets error state on timeout', async () => {
      mockFunctionsInvoke.mockRejectedValue({
        name: 'AbortError',
        message: 'The operation was aborted',
      });

      const { result } = renderHook(() => useAIAssistant());

      // Start request and run all timers
      const requestPromise = act(async () => {
        await result.current.generatePlan('test');
      });

      await vi.runAllTimersAsync();
      await requestPromise;

      expect(result.current.error).toContain('timed out');
      expect(result.current.loading).toBe(false);
    });
  });
});
