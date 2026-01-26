/**
 * Query Key Factory for React Query
 *
 * Provides hierarchical query keys for all entities, enabling:
 * - Targeted cache invalidation (e.g., invalidate all group queries)
 * - Type-safe query key references
 * - Consistent key patterns across the application
 *
 * Pattern: entity.all -> entity.lists() -> entity.list(id)
 *
 * @example
 * // Use in useQuery
 * useQuery({
 *   queryKey: queryKeys.groups.list(userId),
 *   queryFn: () => fetchGroups(userId),
 * });
 *
 * @example
 * // Invalidate all group queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
 *
 * @example
 * // Invalidate specific group detail
 * queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
 */
export const queryKeys = {
  // Groups
  groups: {
    all: ['groups'] as const,
    lists: () => [...queryKeys.groups.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.groups.lists(), userId] as const,
    details: () => [...queryKeys.groups.all, 'detail'] as const,
    detail: (groupId: string) => [...queryKeys.groups.details(), groupId] as const,
    members: (groupId: string) => [...queryKeys.groups.all, 'members', groupId] as const,
  },
  // Templates
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.templates.lists(), userId] as const,
    details: () => [...queryKeys.templates.all, 'detail'] as const,
    detail: (templateId: string) => [...queryKeys.templates.details(), templateId] as const,
  },
  // Assignments
  assignments: {
    all: ['assignments'] as const,
    lists: () => [...queryKeys.assignments.all, 'list'] as const,
    list: (filters: { userId?: string; groupId?: string }) =>
      [...queryKeys.assignments.lists(), filters] as const,
    instances: (filters: { assigneeId?: string; date?: string; startDate?: string }) =>
      [...queryKeys.assignments.all, 'instances', filters] as const,
    progress: (groupId: string, date: string) =>
      [...queryKeys.assignments.all, 'progress', groupId, date] as const,
  },
  // Profile
  profile: {
    all: ['profile'] as const,
    current: (userId: string) => [...queryKeys.profile.all, userId] as const,
  },
  // Stickers
  stickers: {
    all: ['stickers'] as const,
    byUser: (userId: string) => [...queryKeys.stickers.all, userId] as const,
  },
  // Recurring Schedules
  recurringSchedules: {
    all: ['recurringSchedules'] as const,
    lists: () => [...queryKeys.recurringSchedules.all, 'list'] as const,
    list: (userId: string) => [...queryKeys.recurringSchedules.lists(), userId] as const,
  },
} as const;
