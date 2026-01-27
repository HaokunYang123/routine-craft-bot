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
import { useGroups } from './useGroups';
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

    it('exposes isFetching for background refresh indicator', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      // isFetching should be true during initial fetch
      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // After fetch completes, isFetching should be false
      expect(result.current.isFetching).toBe(false);
    });

    it('exposes isError on fetch failure', async () => {
      const mock = getMockSupabase();
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Fetch failed' } }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeTruthy();
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

      // Mock fetchGroups after create (returns new group) - React Query will refetch
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

    it('invalidates query cache after successful create', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
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

      // Mock the refetch after invalidation
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [newGroup], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 0, data: null, error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.createGroup('New Group', '#0000FF', 'users');
      });

      // After invalidation, groups should be refetched and contain the new group
      await waitFor(() => {
        expect(result.current.groups).toHaveLength(1);
        expect(result.current.groups[0].id).toBe('new-group-1');
      });
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

      // Mock fetchGroups after update (React Query refetch)
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

    it('returns false when user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.updateGroup('group-1', { name: 'New Name' });
      });

      expect(success).toBe(false);
    });
  });

  describe('deleteGroup', () => {
    it('removes group and invalidates cache', async () => {
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

      // Mock fetchGroups after delete (React Query refetch - returns only group-2)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [groups[1]], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 3, data: null, error: null }).then(resolve);
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

      // Verify cache was invalidated and refetched (now only one group)
      await waitFor(() => {
        expect(result.current.groups).toHaveLength(1);
        expect(result.current.groups[0].id).toBe('group-2');
      });
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

    it('returns false when user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.deleteGroup('group-1');
      });

      expect(success).toBe(false);
    });
  });

  describe('addMember', () => {
    it('adds member to group', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock insert member response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchGroups after addMember (React Query refetch)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.addMember('group-1', 'student-1');
      });

      expect(success).toBe(true);
      expect(mock.client.from).toHaveBeenCalledWith('group_members');
      expect(mock.queryBuilder.insert).toHaveBeenCalledWith({
        group_id: 'group-1',
        user_id: 'student-1',
        role: 'member',
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Member Added',
        description: 'Member has been added to the group',
      });
    });

    it('handles duplicate member error', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock insert error (duplicate key)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'duplicate key value violates unique constraint' } }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.addMember('group-1', 'student-1');
      });

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'duplicate key value violates unique constraint',
        variant: 'destructive',
      });
    });

    it('returns false when user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.addMember('group-1', 'student-1');
      });

      expect(success).toBe(false);
    });
  });

  describe('removeMember', () => {
    it('removes member from group', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock delete member response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchGroups after removeMember (React Query refetch)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.removeMember('group-1', 'student-1');
      });

      expect(success).toBe(true);
      expect(mock.client.from).toHaveBeenCalledWith('group_members');
      expect(mock.queryBuilder.delete).toHaveBeenCalled();
      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('group_id', 'group-1');
      expect(mock.queryBuilder.eq).toHaveBeenCalledWith('user_id', 'student-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Member Removed',
        description: 'Member has been removed from the group',
      });
    });

    it('shows error toast on remove failure', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock delete error
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: { message: 'Cannot remove member' } }).then(resolve);
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.removeMember('group-1', 'student-1');
      });

      expect(success).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Cannot remove member',
        variant: 'destructive',
      });
    });

    it('returns false when user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn(),
        sessionExpired: false,
        clearSessionExpired: vi.fn(),
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.removeMember('group-1', 'student-1');
      });

      expect(success).toBe(false);
    });
  });

  describe('getGroupMembers', () => {
    it('returns members with display names', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock group_members query
      const mockMembers = [
        { id: 'member-1', group_id: 'group-1', user_id: 'user-1', role: 'member', joined_at: '2026-01-01' },
        { id: 'member-2', group_id: 'group-1', user_id: 'user-2', role: 'member', joined_at: '2026-01-02' },
      ];
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockMembers, error: null }).then(resolve);
      });

      // Mock profiles query for display names
      const mockProfiles = [
        { user_id: 'user-1', display_name: 'John Doe', email: 'john@example.com' },
        { user_id: 'user-2', display_name: 'Jane Smith', email: 'jane@example.com' },
      ];
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockProfiles, error: null }).then(resolve);
      });

      let members: unknown;
      await act(async () => {
        members = await result.current.getGroupMembers('group-1');
      });

      expect(members).toHaveLength(2);
      expect((members as Array<{ display_name: string }>)[0].display_name).toBe('John Doe');
      expect((members as Array<{ display_name: string }>)[1].display_name).toBe('Jane Smith');
    });

    it('falls back to email prefix when no display name', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock group_members query
      const mockMembers = [
        { id: 'member-1', group_id: 'group-1', user_id: 'user-1', role: 'member', joined_at: '2026-01-01' },
      ];
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockMembers, error: null }).then(resolve);
      });

      // Mock profiles query - no display_name, only email
      const mockProfiles = [
        { user_id: 'user-1', display_name: null, email: 'testuser@example.com' },
      ];
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockProfiles, error: null }).then(resolve);
      });

      let members: unknown;
      await act(async () => {
        members = await result.current.getGroupMembers('group-1');
      });

      expect(members).toHaveLength(1);
      // Should use email prefix when display_name is null
      expect((members as Array<{ display_name: string }>)[0].display_name).toBe('testuser');
    });

    it('returns empty array when no members', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock empty group_members query
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      let members: unknown;
      await act(async () => {
        members = await result.current.getGroupMembers('group-1');
      });

      expect(members).toEqual([]);
    });

    it('falls back to Student when no profile found', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Mock group_members query
      const mockMembers = [
        { id: 'member-1', group_id: 'group-1', user_id: 'user-1', role: 'member', joined_at: '2026-01-01' },
      ];
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: mockMembers, error: null }).then(resolve);
      });

      // Mock empty profiles response (user not found)
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      let members: unknown;
      await act(async () => {
        members = await result.current.getGroupMembers('group-1');
      });

      expect(members).toHaveLength(1);
      // Should fall back to "Student" when profile not found
      expect((members as Array<{ display_name: string }>)[0].display_name).toBe('Student');
    });
  });

  describe('mutation loading states', () => {
    it('exposes isCreating state and returns false after mutation completes', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Initially isCreating should be false
      expect(result.current.isCreating).toBe(false);

      // Mock RPC for join code
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

      // Mock fetchGroups after create
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [newGroup], error: null }).then(resolve);
      });
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ count: 0, data: null, error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.createGroup('New Group', '#0000FF');
      });

      // After completion, isCreating should be false
      expect(result.current.isCreating).toBe(false);
    });

    it('exposes isUpdating state and returns false after mutation completes', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Initially isUpdating should be false
      expect(result.current.isUpdating).toBe(false);

      // Mock update response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchGroups after update
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.updateGroup('group-1', { name: 'Updated Name' });
      });

      // After completion, isUpdating should be false
      expect(result.current.isUpdating).toBe(false);
    });

    it('exposes isDeleting state and returns false after mutation completes', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Initially isDeleting should be false
      expect(result.current.isDeleting).toBe(false);

      // Mock delete response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchGroups after delete
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.deleteGroup('group-1');
      });

      // After completion, isDeleting should be false
      expect(result.current.isDeleting).toBe(false);
    });

    it('exposes isAddingMember state and returns false after mutation completes', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Initially isAddingMember should be false
      expect(result.current.isAddingMember).toBe(false);

      // Mock add member response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchGroups after add member
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.addMember('group-1', 'student-1');
      });

      // After completion, isAddingMember should be false
      expect(result.current.isAddingMember).toBe(false);
    });

    it('exposes isRemovingMember state and returns false after mutation completes', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Initially isRemovingMember should be false
      expect(result.current.isRemovingMember).toBe(false);

      // Mock remove member response
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      // Mock fetchGroups after remove member
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await act(async () => {
        await result.current.removeMember('group-1', 'student-1');
      });

      // After completion, isRemovingMember should be false
      expect(result.current.isRemovingMember).toBe(false);
    });

    it('all mutation states are initially false', async () => {
      const mock = getMockSupabase();

      // Mock initial fetchGroups
      mock.queryBuilder.then.mockImplementationOnce((resolve: (value: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // All mutation states should be false
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.isAddingMember).toBe(false);
      expect(result.current.isRemovingMember).toBe(false);
    });
  });
});
