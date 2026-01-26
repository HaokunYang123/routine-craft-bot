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

  describe('retry behavior', () => {
    it('retries on transient errors with exponential backoff', async () => {
      // First call fails with timeout, second succeeds
      mockFunctionsInvoke
        .mockRejectedValueOnce({ name: 'AbortError', message: 'timeout' })
        .mockResolvedValueOnce({
          data: { result: { name: 'Success Plan', tasks: [] } },
          error: null,
        });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;
      const requestPromise = act(async () => {
        response = await result.current.generatePlan('test');
      });

      // Run timers to allow retry
      await vi.runAllTimersAsync();
      await requestPromise;

      expect(response!.success).toBe(true);
      expect(response!.data?.name).toBe('Success Plan');
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('retries on 5xx server errors', async () => {
      // First call returns 500, second succeeds
      mockFunctionsInvoke
        .mockResolvedValueOnce({
          data: { error: 'Internal server error', status: 500 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { result: { name: 'Recovered Plan', tasks: [] } },
          error: null,
        });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;
      const requestPromise = act(async () => {
        response = await result.current.generatePlan('test');
      });

      await vi.runAllTimersAsync();
      await requestPromise;

      expect(response!.success).toBe(true);
      expect(response!.data?.name).toBe('Recovered Plan');
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry auth errors (401)', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized', status: 401 },
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;
      await act(async () => {
        response = await result.current.generatePlan('test');
      });

      expect(response!.success).toBe(false);
      expect(response!.error).toContain('Session expired');
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1); // No retry
    });

    it('does NOT retry rate limit errors (429)', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Too many requests', status: 429 },
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;
      await act(async () => {
        response = await result.current.generatePlan('test');
      });

      expect(response!.success).toBe(false);
      expect(response!.error).toContain('Too many requests');
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1); // No retry
    });

    it('does NOT retry 4xx client errors', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Bad request', status: 400 },
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;
      await act(async () => {
        response = await result.current.generatePlan('test');
      });

      expect(response!.success).toBe(false);
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('cancellation and cleanup', () => {
    it('cancel() aborts pending request', async () => {
      // Use a controllable promise that we can resolve after cancel
      let resolveInvoke: (value: unknown) => void;
      mockFunctionsInvoke.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveInvoke = resolve;
        });
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;

      // Start a request (don't await yet)
      const requestPromise = act(async () => {
        response = await result.current.generatePlan('test');
      });

      // Wait a tick for the request to start
      await vi.advanceTimersByTimeAsync(10);

      // Cancel the request - this sets aborted flag
      act(() => {
        result.current.cancel();
      });

      // Now resolve the invoke (hook should detect aborted state)
      resolveInvoke!({ data: { result: { name: 'Plan', tasks: [] } }, error: null });

      // Run timers and wait for promise
      await vi.runAllTimersAsync();
      await requestPromise;

      expect(response!.success).toBe(false);
      expect(response!.error).toBe('Request cancelled');
      expect(result.current.loading).toBe(false);
    });

    it('returns cancelled on abort during retry wait', async () => {
      // First call fails with transient error, then we cancel during retry delay
      let callCount = 0;
      let resolveSecond: (value: unknown) => void;

      mockFunctionsInvoke.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call rejects immediately with transient error
          return Promise.reject({ name: 'AbortError', message: 'timeout' });
        }
        // Second call hangs until we resolve it
        return new Promise((resolve) => {
          resolveSecond = resolve;
        });
      });

      const { result } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;

      // Start request
      const requestPromise = act(async () => {
        response = await result.current.generatePlan('test');
      });

      // First call rejects, wait for retry delay to start
      await vi.advanceTimersByTimeAsync(500); // Partway through 1000ms delay

      // Cancel during retry wait
      act(() => {
        result.current.cancel();
      });

      // Run remaining timers
      await vi.runAllTimersAsync();

      // If second call was made, resolve it
      if (resolveSecond!) {
        resolveSecond({ data: { result: { name: 'Plan', tasks: [] } }, error: null });
      }

      await requestPromise;

      expect(response!.success).toBe(false);
      expect(response!.error).toBe('Request cancelled');
    });

    it('aborts request on unmount (cleanup)', async () => {
      // Use a controllable promise
      let resolveInvoke: (value: unknown) => void;
      mockFunctionsInvoke.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveInvoke = resolve;
        });
      });

      const { result, unmount } = renderHook(() => useAIAssistant());

      let response: Awaited<ReturnType<typeof result.current.generatePlan>>;

      // Store result.current reference before unmount
      const generatePlanFn = result.current.generatePlan;

      // Start a request using the stored function
      const requestPromise = act(async () => {
        response = await generatePlanFn('test');
      });

      // Wait for request to start
      await vi.advanceTimersByTimeAsync(10);

      // Unmount the hook (calls cleanup which aborts)
      unmount();

      // Resolve the invoke
      resolveInvoke!({ data: { result: { name: 'Plan', tasks: [] } }, error: null });

      await vi.runAllTimersAsync();
      await requestPromise;

      expect(response!.success).toBe(false);
      expect(response!.error).toBe('Request cancelled');
    });

    it('clears error state on cancel', async () => {
      // First set an error state
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Some error', status: 400 },
      });

      const { result } = renderHook(() => useAIAssistant());

      await act(async () => {
        await result.current.generatePlan('test');
      });

      expect(result.current.error).not.toBeNull();

      // Now cancel should clear error
      act(() => {
        result.current.cancel();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
