import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
import { useGroups } from './useGroups';
import { getMockSupabase, resetMockSupabase } from '@/test/mocks/supabase';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );
}

describe('useGroups', () => {
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

  describe('fetchGroups', () => {
    it('loads groups with member counts', async () => {
      const mock = getMockSupabase();
      const mockGroups = [
        { id: 'group-1', name: 'Group 1', color: '#FF0000', icon: 'users', coach_id: 'coach-1', join_code: 'ABC123', created_at: '2026-01-01', qr_token: null },
        { id: 'group-2', name: 'Group 2', color: '#00FF00', icon: 'star', coach_id: 'coach-1', join_code: 'DEF456', created_at: '2026-01-02', qr_token: null },
      ];

      // Mock groups query (returns array)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockGroups, error: null }).then(resolve);
      });

      // Mock member count queries (one for each group)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 5, data: null, error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 3, data: null, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.groups).toHaveLength(2);
      expect(result.current.groups[0].member_count).toBe(5);
      expect(result.current.groups[1].member_count).toBe(3);
    });

    it('sets loading to false after fetch completes', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.groups).toEqual([]);
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
      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      // Give time for any async operations
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not have called from('groups')
      expect(mock.client.from).not.toHaveBeenCalledWith('groups');
      expect(result.current.groups).toEqual([]);
    });
  });

  describe('createGroup', () => {
    it('creates group with join code', async () => {
      const mock = getMockSupabase();

      // Mock fetchGroups first (initial load returns empty)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock RPC for join code generation
      mock.client.rpc.mockResolvedValueOnce({ data: 'NEW123', error: null });

      // Mock insert response
      const newGroup = {
        id: 'new-group-1',
        name: 'New Group',
        color: '#0000FF',
        icon: 'users',
        coach_id: 'coach-1',
        join_code: 'NEW123',
        created_at: '2026-01-15',
        qr_token: null,
      };
      mock.queryBuilder.single.mockResolvedValueOnce({ data: newGroup, error: null });

      // Mock fetchGroups after create (returns new group)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [newGroup], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 0, data: null, error: null }).then(resolve);
      });

      let createdGroup: unknown;
      await act(async () => {
        createdGroup = await result.current.createGroup('New Group', '#0000FF', 'users');
      });

      expect(createdGroup).toEqual(newGroup);
      expect(mock.client.rpc).toHaveBeenCalledWith('generate_group_join_code');
      expect(mock.queryBuilder.insert).toHaveBeenCalledWith({
        name: 'New Group',
        color: '#0000FF',
        icon: 'users',
        coach_id: 'coach-1',
        join_code: 'NEW123',
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Group Created',
        description: '"New Group" has been created',
      });
    });

    it('handles RPC error when generating join code', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock RPC error
      mock.client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } });

      let createdGroup: unknown;
      await act(async () => {
        createdGroup = await result.current.createGroup('New Group', '#0000FF');
      });

      expect(createdGroup).toBeNull();
    });

    it('returns null when user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      let createdGroup: unknown;
      await act(async () => {
        createdGroup = await result.current.createGroup('New Group', '#0000FF');
      });

      expect(createdGroup).toBeNull();
    });
  });

  describe('updateGroup', () => {
    it('updates group and shows toast', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      const existingGroup = {
        id: 'group-1',
        name: 'Old Name',
        color: '#FF0000',
        icon: 'users',
        coach_id: 'coach-1',
        join_code: 'ABC123',
        created_at: '2026-01-01',
        qr_token: null,
      };
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [existingGroup], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 2, data: null, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock update response (returns via .then since no .single)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchGroups after update
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [{ ...existingGroup, name: 'Updated Name' }], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 2, data: null, error: null }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateGroup('group-1', { name: 'Updated Name' });
      });

      expect(success).toBe(true);
      expect(mock.queryBuilder.update).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('id', 'group-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Group Updated',
        description: 'Group has been updated',
      });
    });

    it('shows error toast on update failure', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock update error
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Update failed' } }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateGroup('group-1', { name: 'New Name' });
      });

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Update failed',
        variant: 'destructive',
      });
    });
  });

  describe('deleteGroup', () => {
    it('removes group and updates state', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups with two groups
      const groups = [
        { id: 'group-1', name: 'Group 1', color: '#FF0000', icon: 'users', coach_id: 'coach-1', join_code: 'ABC123', created_at: '2026-01-01', qr_token: null },
        { id: 'group-2', name: 'Group 2', color: '#00FF00', icon: 'star', coach_id: 'coach-1', join_code: 'DEF456', created_at: '2026-01-02', qr_token: null },
      ];
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: groups, error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 2, data: null, error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 3, data: null, error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.groups).toHaveLength(2);

      // Mock delete response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteGroup('group-1');
      });

      expect(success).toBe(true);
      expect(mock.queryBuilder.delete).toHaveBeenCalled();
      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('id', 'group-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Group Deleted',
        description: 'Group has been removed',
      });

      // Verify local state updated (filtered out deleted group)
      expect(result.current.groups).toHaveLength(1);
      expect(result.current.groups[0].id).toBe('group-2');
    });

    it('shows error toast on delete failure', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock delete error
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Cannot delete group' } }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteGroup('group-1');
      });

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Cannot delete group',
        variant: 'destructive',
      });
    });
  });
});
