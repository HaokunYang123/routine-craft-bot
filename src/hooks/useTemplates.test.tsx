import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
import { useTemplates } from './useTemplates';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useTemplates', () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    resetMockSupabase();
    mockToast.mockClear();

    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'coach-1', email: 'coach@example.com' } as User,
      session: { access_token: 'mock-token' } as Session,
      loading: false,
      signOut: vi.fn(),
      sessionExpired: false,
      clearSessionExpired: vi.fn(),
    });
  });

  describe('fetchTemplates', () => {
    it('returns loading state initially', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return new Promise((r) => setTimeout(r, 100)).then(() =>
          resolve({ data: [], error: null })
        );
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('returns templates with tasks on successful fetch', async () => {
      const mock = getMockSupabase();
      const mockTemplates = [
        { id: 'template-1', name: 'Morning Routine', description: 'Start your day', coach_id: 'coach-1', created_at: '2026-01-01' },
        { id: 'template-2', name: 'Evening Routine', description: 'Wind down', coach_id: 'coach-1', created_at: '2026-01-02' },
      ];

      const mockTasks1 = [
        { id: 'task-1', title: 'Wake up', description: null, duration_minutes: 5, day_offset: 0, sort_order: 0, template_id: 'template-1' },
        { id: 'task-2', title: 'Stretch', description: 'Light stretching', duration_minutes: 10, day_offset: 0, sort_order: 1, template_id: 'template-1' },
      ];

      const mockTasks2 = [
        { id: 'task-3', title: 'Read', description: null, duration_minutes: 30, day_offset: 0, sort_order: 0, template_id: 'template-2' },
      ];

      // Mock templates query
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockTemplates, error: null }).then(resolve);
      });

      // Mock tasks queries for each template
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockTasks1, error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockTasks2, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.templates).toHaveLength(2);
      expect(result.current.templates[0].tasks).toHaveLength(2);
      expect(result.current.templates[1].tasks).toHaveLength(1);
    });

    it('handles PGRST205 gracefully (table not exist)', async () => {
      const mock = getMockSupabase();

      // Mock PGRST205 error (table not found)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({
          data: null,
          error: { code: 'PGRST205', message: 'Could not find table' }
        }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should return empty array, not throw error
      expect(result.current.templates).toEqual([]);
      expect(result.current.isError).toBe(false);
    });

    it('handles fetch error', async () => {
      const mock = getMockSupabase();

      // Mock generic error (not PGRST205)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({
          data: null,
          error: { code: 'OTHER', message: 'Database error' }
        }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.templates).toEqual([]);
    });

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
      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      // Give time for any async operations
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not have called from('templates')
      expect(mock.client.from).not.toHaveBeenCalledWith('templates');
      expect(result.current.templates).toEqual([]);
    });

    it('exposes isFetching for background refresh indicator', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      // isFetching should be true during initial fetch
      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // After fetch completes, isFetching should be false
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('createTemplate', () => {
    it('creates template with tasks', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchTemplates (empty)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock insert template response
      const newTemplate = {
        id: 'new-template-1',
        name: 'New Template',
        description: 'Test description',
        coach_id: 'coach-1',
        created_at: '2026-01-15',
      };
      mock.queryBuilder.single.mockResolvedValueOnce({ data: newTemplate, error: null });

      // Mock insert tasks response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchTemplates after invalidation
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [newTemplate], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const tasks = [
        { title: 'Task 1', description: null, duration_minutes: 10, day_offset: 0 },
        { title: 'Task 2', description: 'Do something', duration_minutes: 15, day_offset: 1 },
      ];

      let createdTemplate: unknown;
      await act(async () => {
        createdTemplate = await result.current.createTemplate('New Template', 'Test description', tasks);
      });

      expect(createdTemplate).toMatchObject({ id: 'new-template-1', name: 'New Template' });
      expect(mock.queryBuilder.insert).toHaveBeenCalledWith({
        coach_id: 'coach-1',
        name: 'New Template',
        description: 'Test description',
      });
    });

    it('shows success toast', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchTemplates
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock insert template response
      const newTemplate = {
        id: 'new-template-1',
        name: 'My Template',
        description: 'Description',
        coach_id: 'coach-1',
        created_at: '2026-01-15',
      };
      mock.queryBuilder.single.mockResolvedValueOnce({ data: newTemplate, error: null });

      // Mock fetchTemplates after invalidation
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [newTemplate], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.createTemplate('My Template', 'Description', []);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Template Created',
        description: '"My Template" has been saved with 0 tasks.',
      });
    });

    it('returns null when user is null', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      let createdTemplate: unknown;
      await act(async () => {
        createdTemplate = await result.current.createTemplate('Template', 'Desc', []);
      });

      expect(createdTemplate).toBeNull();
    });

    it('invalidates cache after create', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchTemplates (empty)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock insert template response
      const newTemplate = {
        id: 'new-template-1',
        name: 'New Template',
        description: 'Test',
        coach_id: 'coach-1',
        created_at: '2026-01-15',
      };
      mock.queryBuilder.single.mockResolvedValueOnce({ data: newTemplate, error: null });

      // Mock fetchTemplates after invalidation (returns the new template)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [newTemplate], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.createTemplate('New Template', 'Test', []);
      });

      // After invalidation, templates should be refetched
      await waitFor(() => {
        expect(result.current.templates).toHaveLength(1);
        expect(result.current.templates[0].id).toBe('new-template-1');
      });
    });
  });

  describe('updateTemplate', () => {
    it('updates template and replaces tasks', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchTemplates
      const existingTemplate = {
        id: 'template-1',
        name: 'Old Name',
        description: 'Old desc',
        coach_id: 'coach-1',
        created_at: '2026-01-01',
      };
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [existingTemplate], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock update template response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock delete tasks response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock insert new tasks response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchTemplates after invalidation
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [{ ...existingTemplate, name: 'Updated Name' }], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const newTasks = [
        { title: 'New Task', description: null, duration_minutes: 20, day_offset: 0 },
      ];

      let updatedTemplate: unknown;
      await act(async () => {
        updatedTemplate = await result.current.updateTemplate('template-1', 'Updated Name', 'New desc', newTasks);
      });

      expect(updatedTemplate).toMatchObject({ id: 'template-1', name: 'Updated Name' });
      expect(mock.queryBuilder.update).toHaveBeenCalled();
      expect(mock.queryBuilder.delete).toHaveBeenCalled();
    });

    it('shows success toast', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchTemplates
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock update template response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock delete tasks response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchTemplates after invalidation
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.updateTemplate('template-1', 'Updated Template', 'Desc', []);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Template Updated',
        description: '"Updated Template" has been saved.',
      });
    });

    it('returns null when user is null', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      let updatedTemplate: unknown;
      await act(async () => {
        updatedTemplate = await result.current.updateTemplate('template-1', 'Name', 'Desc', []);
      });

      expect(updatedTemplate).toBeNull();
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchTemplates
      const existingTemplate = {
        id: 'template-1',
        name: 'To Delete',
        description: 'Will be deleted',
        coach_id: 'coach-1',
        created_at: '2026-01-01',
      };
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [existingTemplate], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.templates).toHaveLength(1);

      // Mock delete response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchTemplates after invalidation (empty)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteTemplate('template-1');
      });

      expect(success).toBe(true);
      expect(mock.queryBuilder.delete).toHaveBeenCalled();
      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('id', 'template-1');
    });

    it('shows success toast', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchTemplates
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock delete response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchTemplates after invalidation
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.deleteTemplate('template-1');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Template Deleted',
        description: 'Template has been removed.',
      });
    });

    it('returns false when user is null', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteTemplate('template-1');
      });

      expect(success).toBe(false);
    });

    it('handles delete error', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchTemplates
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock delete error
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Cannot delete template' } }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteTemplate('template-1');
      });

      expect(success).toBe(false);
    });
  });
});
