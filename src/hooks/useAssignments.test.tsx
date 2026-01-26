import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock useAuth
vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('./use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock handleError
vi.mock('@/lib/error', () => ({
  handleError: vi.fn(),
}));

// Mock Supabase client - must use async factory to avoid hoisting issues
vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseModule } = await import('@/test/mocks/supabase');
  return mockSupabaseModule;
});

// Import after mocks are set up
import { useAssignments } from './useAssignments';
import { useAuth } from './useAuth';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';

/**
 * Create wrapper with required providers for hook testing
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MemoryRouter>
    );
  };
}

describe('useAssignments', () => {
  beforeEach(() => {
    resetMockSupabase();
    mockToast.mockClear();
  });

  describe('createAssignment', () => {
    it('returns null when no user is authenticated', async () => {
      // Setup: no user
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let assignment: unknown;
      await act(async () => {
        assignment = await result.current.createAssignment({
          schedule_type: 'once',
          start_date: '2026-01-25',
          assignee_id: 'student-1',
        });
      });

      expect(assignment).toBeNull();
    });

    it('creates assignment for individual assignee', async () => {
      // Setup: authenticated user
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'coach-1', email: 'coach@example.com' } as any,
        session: { access_token: 'token' } as any,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const mock = getMockSupabase();

      // Mock assignment insert
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'assignment-1', assigned_by: 'coach-1' },
        error: null,
      });

      // Mock task instances insert (no single() call, uses then)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({
          data: [{ id: 'task-1', assignee_id: 'student-1', name: 'Test Task' }],
          error: null,
        }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let assignment: unknown;
      await act(async () => {
        assignment = await result.current.createAssignment({
          schedule_type: 'once',
          start_date: '2026-01-25',
          assignee_id: 'student-1',
          tasks: [{ name: 'Test Task', day_offset: 0 }],
        });
      });

      expect(assignment).toBeDefined();
      expect((assignment as { id: string }).id).toBe('assignment-1');
      expect(mock.client.from).toHaveBeenCalledWith('assignments');
      expect(mock.queryBuilder.insert).toHaveBeenCalled();
    });

    it('shows warning toast when no assignees found', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'coach-1', email: 'coach@example.com' } as any,
        session: { access_token: 'token' } as any,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const mock = getMockSupabase();

      // Mock assignment insert success
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'assignment-1', assigned_by: 'coach-1' },
        error: null,
      });

      // No assignee_id and no group_id = no assignees

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.createAssignment({
          schedule_type: 'once',
          start_date: '2026-01-25',
          // No assignee_id or group_id
          tasks: [{ name: 'Test Task', day_offset: 0 }],
        });
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Warning',
          description: 'No assignees found for this assignment',
          variant: 'destructive',
        })
      );
    });
  });

  describe('getTaskInstances', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'coach-1' } as any,
        session: {} as any,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });
    });

    it('returns filtered task instances by assignee', async () => {
      const mockTasks = [
        { id: 'task-1', assignee_id: 'student-1', name: 'Task 1', scheduled_date: '2026-01-25' },
        { id: 'task-2', assignee_id: 'student-1', name: 'Task 2', scheduled_date: '2026-01-25' },
      ];

      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: mockTasks, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let tasks: unknown[];
      await act(async () => {
        tasks = await result.current.getTaskInstances({ assigneeId: 'student-1' });
      });

      expect(tasks!).toHaveLength(2);
      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('assignee_id', 'student-1');
    });

    it('returns filtered task instances by date', async () => {
      const mockTasks = [
        { id: 'task-1', assignee_id: 'student-1', name: 'Task 1', scheduled_date: '2026-01-25' },
      ];

      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: mockTasks, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let tasks: unknown[];
      await act(async () => {
        tasks = await result.current.getTaskInstances({ date: '2026-01-25' });
      });

      expect(tasks!).toHaveLength(1);
      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('scheduled_date', '2026-01-25');
    });

    it('returns empty array on error', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: null, error: { message: 'Database error' } }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let tasks: unknown[];
      await act(async () => {
        tasks = await result.current.getTaskInstances({ assigneeId: 'student-1' });
      });

      expect(tasks!).toEqual([]);
    });
  });

  describe('updateTaskStatus', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'coach-1' } as any,
        session: {} as any,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });
    });

    it('updates task status and shows toast on completion', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.updateTaskStatus('task-1', 'completed');
      });

      expect(success!).toBe(true);
      expect(mock.client.from).toHaveBeenCalledWith('task_instances');
      expect(mock.queryBuilder.update).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Task Completed',
          description: 'Great job!',
        })
      );
    });

    it('updates task status without toast for non-completed status', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.updateTaskStatus('task-1', 'pending');
      });

      expect(success!).toBe(true);
      // No "Task Completed" toast
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Task Completed' })
      );
    });

    it('handles errors and shows error toast', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: null, error: { message: 'Update failed' } }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.updateTaskStatus('task-1', 'completed');
      });

      expect(success!).toBe(false);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Failed to update task',
          variant: 'destructive',
        })
      );
    });
  });

  describe('scheduling logic', () => {
    // Helper to capture task instances from insert calls
    let capturedTaskInstances: Array<{ scheduled_date: string; name: string }>;

    beforeEach(() => {
      capturedTaskInstances = [];

      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'coach-1', email: 'coach@example.com' } as any,
        session: { access_token: 'token' } as any,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });
    });

    /**
     * Setup mocks for assignment creation and capture task instances
     */
    function setupMocksForScheduling() {
      const mock = getMockSupabase();

      // Mock assignment insert
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'assignment-1', assigned_by: 'coach-1' },
        error: null,
      });

      // Capture and return task instances insert
      mock.queryBuilder.then.mockImplementation((resolve: (value: unknown) => void) => {
        // Extract the data that was passed to insert
        const insertCalls = mock.queryBuilder.insert.mock.calls;
        const lastCall = insertCalls[insertCalls.length - 1];
        if (lastCall && Array.isArray(lastCall[0])) {
          capturedTaskInstances = lastCall[0];
        }
        return Promise.resolve({
          data: capturedTaskInstances,
          error: null,
        }).then(resolve);
      });

      return mock;
    }

    describe('schedule_type: once', () => {
      it('creates single task on start_date', async () => {
        setupMocksForScheduling();

        const { result } = renderHook(() => useAssignments(), {
          wrapper: createWrapper(),
        });

        await act(async () => {
          await result.current.createAssignment({
            assignee_id: 'student-1',
            schedule_type: 'once',
            start_date: '2026-01-25',
            tasks: [{ name: 'One-time task', day_offset: 0 }],
          });
        });

        expect(capturedTaskInstances).toHaveLength(1);
        expect(capturedTaskInstances[0].scheduled_date).toBe('2026-01-25');
        expect(capturedTaskInstances[0].name).toBe('One-time task');
      });
    });

    describe('schedule_type: daily', () => {
      it('creates tasks for each day in range', async () => {
        setupMocksForScheduling();

        const { result } = renderHook(() => useAssignments(), {
          wrapper: createWrapper(),
        });

        await act(async () => {
          await result.current.createAssignment({
            assignee_id: 'student-1',
            schedule_type: 'daily',
            start_date: '2026-01-25',
            end_date: '2026-01-27', // 3 days
            tasks: [{ name: 'Daily task', day_offset: 0 }],
          });
        });

        // Should create 3 task instances (Jan 25, 26, 27)
        expect(capturedTaskInstances).toHaveLength(3);
        expect(capturedTaskInstances.map(t => t.scheduled_date)).toEqual([
          '2026-01-25',
          '2026-01-26',
          '2026-01-27',
        ]);
      });
    });

    describe('schedule_type: weekly', () => {
      it('creates tasks on same day of week as start_date', async () => {
        setupMocksForScheduling();

        const { result } = renderHook(() => useAssignments(), {
          wrapper: createWrapper(),
        });

        // 2026-01-25 is a Sunday (day 0)
        await act(async () => {
          await result.current.createAssignment({
            assignee_id: 'student-1',
            schedule_type: 'weekly',
            start_date: '2026-01-25', // Sunday
            end_date: '2026-02-08', // 2 weeks later (Sunday)
            tasks: [{ name: 'Weekly task', day_offset: 0 }],
          });
        });

        // Should create tasks on Sundays only: Jan 25, Feb 1, Feb 8
        expect(capturedTaskInstances).toHaveLength(3);
        expect(capturedTaskInstances.map(t => t.scheduled_date)).toEqual([
          '2026-01-25', // Sunday
          '2026-02-01', // Sunday
          '2026-02-08', // Sunday
        ]);
      });
    });

    describe('schedule_type: custom', () => {
      it('creates tasks only on specified days (Mon, Wed, Fri)', async () => {
        setupMocksForScheduling();

        const { result } = renderHook(() => useAssignments(), {
          wrapper: createWrapper(),
        });

        // schedule_days: 1=Monday, 3=Wednesday, 5=Friday
        await act(async () => {
          await result.current.createAssignment({
            assignee_id: 'student-1',
            schedule_type: 'custom',
            schedule_days: [1, 3, 5], // Mon, Wed, Fri
            start_date: '2026-01-26', // Monday
            end_date: '2026-02-01', // Sunday (includes one full week)
            tasks: [{ name: 'Custom task', day_offset: 0 }],
          });
        });

        // Jan 26 (Mon), Jan 28 (Wed), Jan 30 (Fri)
        expect(capturedTaskInstances).toHaveLength(3);
        expect(capturedTaskInstances.map(t => t.scheduled_date)).toEqual([
          '2026-01-26', // Monday
          '2026-01-28', // Wednesday
          '2026-01-30', // Friday
        ]);
      });
    });
  });
});
