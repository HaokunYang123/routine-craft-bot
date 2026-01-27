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

    it('updates task status successfully without showing toast (per CONTEXT.md)', async () => {
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
      // No toast on successful completion - per CONTEXT.md "Task completion: checkbox update only, no toast"
      expect(mockToast).not.toHaveBeenCalled();
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

    it('handles errors and shows user-friendly error toast', async () => {
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
      // Per CONTEXT.md - user-friendly error message
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: "Couldn't save changes. Please try again.",
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

  describe('group assignments', () => {
    let capturedTaskInstances: Array<{ assignee_id: string; name: string; scheduled_date: string }>;

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

    it('creates task instances for all group members', async () => {
      const mock = getMockSupabase();

      // Mock assignment insert
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'assignment-1', assigned_by: 'coach-1' },
        error: null,
      });

      // Mock group members fetch - 3 students in group
      mock.queryBuilder.then
        .mockImplementationOnce((resolve: (value: unknown) => void) => {
          return Promise.resolve({
            data: [
              { user_id: 'student-1' },
              { user_id: 'student-2' },
              { user_id: 'student-3' },
            ],
            error: null,
          }).then(resolve);
        })
        // Mock task instances insert
        .mockImplementation((resolve: (value: unknown) => void) => {
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

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.createAssignment({
          group_id: 'group-1',
          schedule_type: 'once',
          start_date: '2026-01-25',
          tasks: [{ name: 'Group task', day_offset: 0 }],
        });
      });

      // Should create 3 task instances (one per member)
      expect(capturedTaskInstances).toHaveLength(3);
      expect(capturedTaskInstances.map(t => t.assignee_id).sort()).toEqual([
        'student-1',
        'student-2',
        'student-3',
      ]);
      // All should have the same task name
      capturedTaskInstances.forEach(t => {
        expect(t.name).toBe('Group task');
      });
    });
  });

  describe('template assignments', () => {
    let capturedTaskInstances: Array<{ name: string; scheduled_date: string; description: string | null }>;

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

    it('uses template tasks with day_offset for scheduling', async () => {
      const mock = getMockSupabase();

      // Mock assignment insert
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'assignment-1', assigned_by: 'coach-1' },
        error: null,
      });

      // Mock template tasks fetch - 3 tasks with different day_offsets
      mock.queryBuilder.then
        .mockImplementationOnce((resolve: (value: unknown) => void) => {
          return Promise.resolve({
            data: [
              { title: 'Day 1 Task', description: 'First task', duration_minutes: 30, day_offset: 0, sort_order: 1 },
              { title: 'Day 3 Task', description: 'Second task', duration_minutes: 45, day_offset: 2, sort_order: 2 },
              { title: 'Day 5 Task', description: 'Third task', duration_minutes: 60, day_offset: 4, sort_order: 3 },
            ],
            error: null,
          }).then(resolve);
        })
        // Mock task instances insert
        .mockImplementation((resolve: (value: unknown) => void) => {
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

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.createAssignment({
          template_id: 'template-1',
          assignee_id: 'student-1',
          schedule_type: 'once',
          start_date: '2026-01-25',
        });
      });

      // Should create 3 task instances with dates based on day_offset
      expect(capturedTaskInstances).toHaveLength(3);

      // Verify scheduled dates based on day_offset from start_date 2026-01-25
      const tasksByName = Object.fromEntries(
        capturedTaskInstances.map(t => [t.name, t])
      );

      expect(tasksByName['Day 1 Task'].scheduled_date).toBe('2026-01-25'); // offset 0
      expect(tasksByName['Day 3 Task'].scheduled_date).toBe('2026-01-27'); // offset 2
      expect(tasksByName['Day 5 Task'].scheduled_date).toBe('2026-01-29'); // offset 4
    });
  });

  describe('React Query caching behavior', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'coach-1', email: 'coach@example.com' } as any,
        session: { access_token: 'token' } as any,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });
    });

    it('getTaskInstances uses cached data for same filter combination', async () => {
      const mock = getMockSupabase();
      const mockTasks = [
        { id: 'task-1', assignee_id: 'student-1', name: 'Task 1', scheduled_date: '2026-01-25' },
      ];

      mock.queryBuilder.then.mockImplementation((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: mockTasks, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      // First call - fetches from API
      let tasks1: unknown;
      await act(async () => {
        tasks1 = await result.current.getTaskInstances({ assigneeId: 'student-1', date: '2026-01-25' });
      });

      // Second call with same filters - should use cache
      let tasks2: unknown;
      await act(async () => {
        tasks2 = await result.current.getTaskInstances({ assigneeId: 'student-1', date: '2026-01-25' });
      });

      // Both calls return the same data
      expect(tasks1).toEqual(tasks2);
      // from() should only be called once due to caching
      expect(mock.client.from).toHaveBeenCalledTimes(1);
    });

    it('getTaskInstances fetches fresh data when filters change', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then.mockImplementation((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      // First call with date A
      await act(async () => {
        await result.current.getTaskInstances({ date: '2026-01-25' });
      });

      // Second call with date B - different filter, should fetch again
      await act(async () => {
        await result.current.getTaskInstances({ date: '2026-01-26' });
      });

      // from() should be called twice due to different filters
      expect(mock.client.from).toHaveBeenCalledTimes(2);
    });

    it('getGroupProgress uses cached data for same groupId and date', async () => {
      const mock = getMockSupabase();

      // Mock empty group (no members) - simple case
      mock.queryBuilder.then.mockImplementation((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      // First call
      await act(async () => {
        await result.current.getGroupProgress('group-1', '2026-01-25');
      });

      // Second call with same params - should use cache
      await act(async () => {
        await result.current.getGroupProgress('group-1', '2026-01-25');
      });

      // from() should only be called once due to caching (for group_members)
      expect(mock.client.from).toHaveBeenCalledTimes(1);
    });

    it('createAssignment invalidates cache after successful creation', async () => {
      const mock = getMockSupabase();

      // Mock assignment insert
      mock.queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'assignment-1', assigned_by: 'coach-1' },
        error: null,
      });

      // Mock task instances insert
      mock.queryBuilder.then.mockImplementation((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </MemoryRouter>
      );

      const { result } = renderHook(() => useAssignments(), { wrapper });

      await act(async () => {
        await result.current.createAssignment({
          assignee_id: 'student-1',
          schedule_type: 'once',
          start_date: '2026-01-25',
          tasks: [{ name: 'Test Task', day_offset: 0 }],
        });
      });

      // Should invalidate all assignments queries
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assignments'] });
    });

    it('updateTaskStatus invalidates cache after successful update', async () => {
      const mock = getMockSupabase();

      // Mock update response
      mock.queryBuilder.then.mockImplementation((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </MemoryRouter>
      );

      const { result } = renderHook(() => useAssignments(), { wrapper });

      await act(async () => {
        await result.current.updateTaskStatus('task-1', 'completed');
      });

      // Should invalidate all assignments queries
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assignments'] });
    });
  });

  describe('getGroupProgress', () => {
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

    it('returns progress with member stats', async () => {
      const mock = getMockSupabase();

      // Mock group_members query
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({
          data: [{ user_id: 'student-1' }, { user_id: 'student-2' }],
          error: null,
        }).then(resolve);
      });

      // Mock profiles query
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({
          data: [
            { user_id: 'student-1', display_name: 'Alice', email: 'alice@example.com' },
            { user_id: 'student-2', display_name: 'Bob', email: 'bob@example.com' },
          ],
          error: null,
        }).then(resolve);
      });

      // Mock todayInstances query
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({
          data: [
            { id: 'task-1', assignee_id: 'student-1', status: 'completed' },
            { id: 'task-2', assignee_id: 'student-1', status: 'pending' },
            { id: 'task-3', assignee_id: 'student-2', status: 'completed' },
          ],
          error: null,
        }).then(resolve);
      });

      // Mock overdueInstances query
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      // Mock catchupInstances query
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let progress: { completed: number; total: number; members: Array<{ name: string; completedToday: number }> };
      await act(async () => {
        progress = await result.current.getGroupProgress('group-1', '2026-01-25');
      });

      expect(progress!.completed).toBe(2);
      expect(progress!.total).toBe(3);
      expect(progress!.members).toHaveLength(2);
      expect(progress!.members.find(m => m.name === 'Alice')?.completedToday).toBe(1);
      expect(progress!.members.find(m => m.name === 'Bob')?.completedToday).toBe(1);
    });

    it('returns default progress when no members in group', async () => {
      const mock = getMockSupabase();

      // Mock empty group_members
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let progress: { completed: number; total: number; members: unknown[]; overdueCount: number };
      await act(async () => {
        progress = await result.current.getGroupProgress('group-1', '2026-01-25');
      });

      expect(progress!).toEqual({
        completed: 0,
        total: 0,
        members: [],
        overdueCount: 0,
      });
    });

    it('returns default progress on error', async () => {
      const mock = getMockSupabase();

      // Mock error
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => void) => {
        return Promise.resolve({ data: null, error: { message: 'Database error' } }).then(resolve);
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      let progress: { completed: number; total: number; members: unknown[]; overdueCount: number };
      await act(async () => {
        progress = await result.current.getGroupProgress('group-1', '2026-01-25');
      });

      expect(progress!).toEqual({
        completed: 0,
        total: 0,
        members: [],
        overdueCount: 0,
      });
    });
  });

  describe('initialization', () => {
    it('returns loading: false (utility hook always ready)', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'coach-1' } as any,
        session: {} as any,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(false);
    });

    it('returns all expected functions', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'coach-1' } as any,
        session: {} as any,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useAssignments(), {
        wrapper: createWrapper(),
      });

      expect(result.current.createAssignment).toBeInstanceOf(Function);
      expect(result.current.getTaskInstances).toBeInstanceOf(Function);
      expect(result.current.updateTaskStatus).toBeInstanceOf(Function);
      expect(result.current.getGroupProgress).toBeInstanceOf(Function);
    });
  });
});
