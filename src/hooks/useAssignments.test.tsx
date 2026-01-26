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
});
