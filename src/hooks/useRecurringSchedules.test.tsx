import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User, Session } from '@supabase/supabase-js';
import React from 'react';

// Mock modules before imports that use them
vi.mock('@/integrations/supabase/client', async () => {
  const actual = await import('@/test/mocks/supabase');
  return actual.mockSupabaseModule;
});

vi.mock('./useAuth');

vi.mock('./use-toast');

vi.mock('@/lib/error', () => ({
  handleError: vi.fn(),
}));

// Now import the modules after mocks are set up
import { useRecurringSchedules } from './useRecurringSchedules';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { handleError } from '@/lib/error';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Helper to create a mock schedule
function createMockSchedule(overrides: Partial<{
  id: string;
  name: string;
  user_id: string;
  template_id: string | null;
  assigned_student_id: string | null;
  class_session_id: string | null;
}> = {}) {
  return {
    id: overrides.id ?? 'schedule-1',
    name: overrides.name ?? 'Morning Routine',
    description: 'Daily morning tasks',
    recurrence_type: 'daily',
    days_of_week: [1, 2, 3, 4, 5],
    custom_interval_days: null,
    start_date: '2026-01-01',
    end_date: null,
    is_active: true,
    user_id: overrides.user_id ?? 'user-1',
    template_id: overrides.template_id ?? null,
    assigned_student_id: overrides.assigned_student_id ?? null,
    class_session_id: overrides.class_session_id ?? null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('useRecurringSchedules', () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    resetMockSupabase();
    mockToast.mockClear();
    vi.mocked(handleError).mockClear();

    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' } as User,
      session: { access_token: 'mock-token' } as Session,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });
  });

  describe('Loading state tests', () => {
    it('shows loading state initially', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('sets loading to false after fetch completes', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [createMockSchedule()], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toHaveLength(1);
    });

    it('shows isFetching during background refresh', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      // isFetching should be true during initial fetch
      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // After fetch completes, isFetching should be false
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('Success fetch tests', () => {
    it('fetches schedules for authenticated user', async () => {
      const mock = getMockSupabase();
      const mockSchedules = [createMockSchedule(), createMockSchedule({ id: 'schedule-2', name: 'Evening Routine' })];

      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockSchedules, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toHaveLength(2);
      expect(result.current.schedules[0].name).toBe('Morning Routine');
      expect(result.current.schedules[1].name).toBe('Evening Routine');
    });

    it('returns empty array when no schedules exist', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toEqual([]);
    });

    it('enriches schedules with template names', async () => {
      const mock = getMockSupabase();
      const scheduleWithTemplate = createMockSchedule({ template_id: 'template-1' });

      // First call: fetch schedules
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [scheduleWithTemplate], error: null }).then(resolve);
      });
      // Second call: fetch templates (enrichment)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [{ id: 'template-1', name: 'Math Worksheet' }], error: null }).then(resolve);
      });
      // Third/Fourth calls: profiles and classes (empty)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules[0].template_name).toBe('Math Worksheet');
    });

    it('enriches schedules with student names', async () => {
      const mock = getMockSupabase();
      const scheduleWithStudent = createMockSchedule({ assigned_student_id: 'student-1' });

      // First call: fetch schedules
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [scheduleWithStudent], error: null }).then(resolve);
      });
      // Only profiles will be queried (no templateIds, no classIds)
      // Second call: fetch profiles (enrichment)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [{ user_id: 'student-1', display_name: 'John Doe' }], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules[0].student_name).toBe('John Doe');
    });

    it('enriches schedules with class names', async () => {
      const mock = getMockSupabase();
      const scheduleWithClass = createMockSchedule({ class_session_id: 'class-1' });

      // First call: fetch schedules
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [scheduleWithClass], error: null }).then(resolve);
      });
      // Only classes will be queried (no templateIds, no studentIds)
      // Second call: fetch classes (enrichment)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [{ id: 'class-1', name: 'Period 1 Math' }], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules[0].class_name).toBe('Period 1 Math');
    });

    it('handles missing enrichment data gracefully', async () => {
      const mock = getMockSupabase();
      // Schedule references template that doesn't exist
      const scheduleWithMissingTemplate = createMockSchedule({ template_id: 'template-missing' });

      // First call: fetch schedules
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [scheduleWithMissingTemplate], error: null }).then(resolve);
      });
      // Second call: templates (empty - not found)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });
      // Third/Fourth calls: profiles and classes (empty)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash, template_name should be undefined
      expect(result.current.schedules[0].template_name).toBeUndefined();
    });

    it('uses Student fallback when profile display_name is null', async () => {
      const mock = getMockSupabase();
      const scheduleWithStudent = createMockSchedule({ assigned_student_id: 'student-1' });

      // First call: fetch schedules
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [scheduleWithStudent], error: null }).then(resolve);
      });
      // Only profiles will be queried (no templateIds, no classIds)
      // Profile exists but display_name is null
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [{ user_id: 'student-1', display_name: null }], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules[0].student_name).toBe('Student');
    });
  });

  describe('PGRST205 handling tests', () => {
    it('returns empty array on PGRST205 error (table not found)', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Table not found' } }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toEqual([]);
      expect(result.current.isError).toBe(false);
    });

    it('returns empty array when error message contains not find', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Could not find table' } }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toEqual([]);
      expect(result.current.isError).toBe(false);
    });
  });

  describe('Error handling tests', () => {
    it('sets isError true on fetch failure', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Database connection failed' } }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
    });

    it('exposes error object for UI display', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Connection timeout' } }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Cache behavior tests', () => {
    it('uses cached data on subsequent renders', async () => {
      const mock = getMockSupabase();
      const mockSchedules = [createMockSchedule()];

      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockSchedules, error: null }).then(resolve);
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // First render
      const { result, unmount } = renderHook(() => useRecurringSchedules(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toHaveLength(1);

      // Unmount and remount - should use cache
      unmount();

      const { result: result2 } = renderHook(() => useRecurringSchedules(), { wrapper });

      // Should immediately have data from cache (not loading)
      await waitFor(() => {
        expect(result2.current.schedules).toHaveLength(1);
      });
    });

    it('refetches when user changes', async () => {
      const mock = getMockSupabase();

      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [createMockSchedule()], error: null }).then(resolve);
      });

      const { result, rerender } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.schedules).toHaveLength(1);

      // Change user - React Query will use different cache key
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-2', email: 'other@example.com' } as User,
        session: { access_token: 'mock-token' } as Session,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      // New query for new user
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      rerender();

      await waitFor(() => {
        expect(result.current.schedules).toHaveLength(0);
      });
    });
  });

  describe('Mutation tests', () => {
    it('createSchedule invalidates cache after success', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock insert response
      const newSchedule = createMockSchedule({ name: 'New Schedule' });
      mock.queryBuilder.single.mockResolvedValueOnce({ data: newSchedule, error: null });

      // Mock refetch after invalidation
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [newSchedule], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.createSchedule({
          name: 'New Schedule',
          recurrence_type: 'daily',
        });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Schedule Created',
        description: '"New Schedule" recurring schedule has been created.',
      });

      // Cache should be invalidated and refetched
      await waitFor(() => {
        expect(result.current.schedules).toHaveLength(1);
      });
    });

    it('updateSchedule invalidates cache after success', async () => {
      const mock = getMockSupabase();
      const existingSchedule = createMockSchedule();

      // Initial fetch
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [existingSchedule], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock delete tasks response (cleanup before update)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock update response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock refetch after invalidation
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [{ ...existingSchedule, name: 'Updated Name' }], error: null }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateSchedule('schedule-1', { name: 'Updated Name' });
      });

      expect(success).toBe(true);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Schedule Updated',
        description: 'Recurring schedule has been updated. Future pending tasks have been cleared.',
      });
    });

    it('deleteSchedule invalidates cache after success', async () => {
      const mock = getMockSupabase();
      const schedules = [
        createMockSchedule({ id: 'schedule-1' }),
        createMockSchedule({ id: 'schedule-2', name: 'Other Schedule' }),
      ];

      // Initial fetch
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: schedules, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.schedules).toHaveLength(2);

      // Mock delete tasks response (cleanup)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock delete schedule response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock refetch after invalidation (now only schedule-2)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [schedules[1]], error: null }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteSchedule('schedule-1');
      });

      expect(success).toBe(true);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Schedule Deleted',
        description: 'Recurring schedule and pending tasks have been removed.',
      });

      await waitFor(() => {
        expect(result.current.schedules).toHaveLength(1);
        expect(result.current.schedules[0].id).toBe('schedule-2');
      });
    });

    it('generateTasks calls RPC function', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock RPC response
      mock.client.rpc.mockResolvedValueOnce({
        data: { success: true, task_count: 5, message: 'Generated 5 tasks.' },
        error: null
      });

      let generateResult: { success: boolean; taskCount?: number } | undefined;
      await act(async () => {
        generateResult = await result.current.generateTasks('schedule-1');
      });

      expect(generateResult?.success).toBe(true);
      expect(generateResult?.taskCount).toBe(5);
      expect(mock.client.rpc).toHaveBeenCalledWith('generate_recurring_tasks', expect.objectContaining({
        p_schedule_id: 'schedule-1',
      }));
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Tasks Generated',
        description: 'Generated 5 tasks.',
      });
    });

    it('createSchedule returns null on error', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock insert error
      mock.queryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

      let createdSchedule: unknown;
      await act(async () => {
        createdSchedule = await result.current.createSchedule({
          name: 'New Schedule',
          recurrence_type: 'daily',
        });
      });

      expect(createdSchedule).toBeNull();
      expect(handleError).toHaveBeenCalled();
    });

    it('updateSchedule returns false on error', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock delete tasks (success)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock update error
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Update failed' } }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateSchedule('schedule-1', { name: 'New Name' });
      });

      expect(success).toBe(false);
      expect(handleError).toHaveBeenCalled();
    });

    it('deleteSchedule returns false on error', async () => {
      const mock = getMockSupabase();

      // Initial fetch
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock delete tasks (success)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock delete schedule error
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Delete failed' } }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteSchedule('schedule-1');
      });

      expect(success).toBe(false);
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('Auth guard tests', () => {
    it('does not fetch when user is null', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const mock = getMockSupabase();
      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      // Give time for any async operations
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not have called from('recurring_schedules')
      expect(mock.client.from).not.toHaveBeenCalledWith('recurring_schedules');
      expect(result.current.schedules).toEqual([]);
    });

    it('returns empty schedules when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(result.current.schedules).toEqual([]);
      // When disabled (user is null), isPending stays true (no query runs)
      // But schedules defaults to empty array
    });

    it('createSchedule returns null when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      let createdSchedule: unknown;
      await act(async () => {
        createdSchedule = await result.current.createSchedule({
          name: 'Test',
          recurrence_type: 'daily',
        });
      });

      expect(createdSchedule).toBeNull();
    });

    it('updateSchedule returns false when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateSchedule('schedule-1', { name: 'New Name' });
      });

      expect(success).toBe(false);
    });

    it('deleteSchedule returns false when not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useRecurringSchedules(), { wrapper: createWrapper() });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteSchedule('schedule-1');
      });

      expect(success).toBe(false);
    });
  });
});
