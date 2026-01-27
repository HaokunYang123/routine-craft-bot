# Phase 12: Mutations & Optimistic Updates - Research

**Researched:** 2026-01-27
**Domain:** React Query mutations, optimistic updates, cache invalidation
**Confidence:** HIGH

## Summary

This phase migrates existing mutation functions (create/update/delete) in useGroups, useTemplates, useProfile, and useAssignments to React Query's `useMutation` pattern. The critical focus is task completion in StudentSchedule.tsx and StudentHome.tsx which already implements a manual optimistic update pattern that should be replaced with React Query's standard approach.

The project already uses @tanstack/react-query v5.83.0 with a properly configured QueryClient (5-minute staleTime, global error handling). The existing hooks already use `invalidateQueries` after mutations - the migration formalizes this with `useMutation` hooks for better state management (isPending, isError) and standardizes the optimistic update pattern.

**Primary recommendation:** Migrate mutations to `useMutation` with explicit callback patterns (onSuccess, onError, onSettled). Implement optimistic updates ONLY for task completion checkboxes using the onMutate/onError/onSettled pattern. Use invalidation-only for all other mutations.

## Standard Stack

The project already has all required dependencies installed - no new packages needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.83.0 | Mutations, cache management | Already installed, industry standard |
| @radix-ui/react-toast | ^1.2.14 | Toast notifications | Already installed via shadcn/ui |
| lucide-react | ^0.462.0 | Loader2 spinner icon | Already installed, consistent with existing patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-alert-dialog | ^1.1.14 | Delete confirmations | Already used in Templates.tsx |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| invalidateQueries | setQueryData | Manual cache updates require more code and must match server logic exactly; invalidation is safer |
| useMutation | raw async functions | Already have async functions working; useMutation adds isPending/isError state, standardized callbacks |

**Installation:**
```bash
# No installation needed - all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useGroups.ts          # Add useMutation for createGroup, updateGroup, deleteGroup
│   ├── useTemplates.ts       # Add useMutation for createTemplate, updateTemplate, deleteTemplate
│   ├── useProfile.ts         # Add useMutation for updateProfile
│   └── useAssignments.ts     # Add useMutation for createAssignment, updateTaskStatus (optimistic)
└── lib/
    └── queries/
        └── keys.ts           # Already exists, no changes needed
```

### Pattern 1: Standard Mutation (Invalidation Only)
**What:** Non-optimistic mutation that shows loading state, invalidates cache on success, shows error toast on failure
**When to use:** All mutations except task completion checkbox
**Example:**
```typescript
// Source: TkDodo's blog - Mastering Mutations in React Query
const createGroupMutation = useMutation({
  mutationFn: async (data: { name: string; color: string; icon: string }) => {
    const { data: joinCode, error: codeError } = await supabase.rpc("generate_group_join_code");
    if (codeError) throw codeError;

    const { data: result, error } = await supabase
      .from("groups")
      .insert({ ...data, coach_id: user.id, join_code: joinCode })
      .select()
      .single();

    if (error) throw error;
    return result;
  },
  onSuccess: async (data) => {
    toast({ title: "Group Created", description: `"${data.name}" has been created` });
    // Return Promise to keep isPending true until invalidation completes
    return queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user.id) });
  },
  onError: (error) => {
    const message = error && typeof error === 'object' && 'message' in error
      ? (error as { message: string }).message
      : "Couldn't save changes. Please try again.";
    toast({ title: "Error", description: message, variant: "destructive" });
  },
});

// Usage in component
<Button
  disabled={createGroupMutation.isPending}
  onClick={() => createGroupMutation.mutate({ name, color, icon })}
>
  {createGroupMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
  {createGroupMutation.isPending ? "Saving..." : "Create Group"}
</Button>
```

### Pattern 2: Optimistic Update (Task Completion Only)
**What:** Instantly update UI before server confirms, rollback on error
**When to use:** Task completion checkbox only (most frequent interaction, highest benefit)
**Example:**
```typescript
// Source: TanStack Query Docs - Optimistic Updates
const updateTaskStatusMutation = useMutation({
  mutationFn: async ({ taskId, status }: { taskId: string; status: 'pending' | 'completed' }) => {
    const { error } = await supabase
      .from("task_instances")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", taskId);

    if (error) throw error;
    return { taskId, status };
  },
  onMutate: async ({ taskId, status }) => {
    // 1. Cancel outgoing refetches (prevents overwriting optimistic update)
    await queryClient.cancelQueries({ queryKey: queryKeys.assignments.all });

    // 2. Snapshot previous value for rollback
    const previousTasks = queryClient.getQueryData<TaskInstance[]>(
      queryKeys.assignments.instances({ assigneeId: user.id, date: today })
    );

    // 3. Optimistically update cache
    queryClient.setQueryData<TaskInstance[]>(
      queryKeys.assignments.instances({ assigneeId: user.id, date: today }),
      (old) => old?.map(t => t.id === taskId ? { ...t, status } : t)
    );

    // 4. Return context for rollback
    return { previousTasks };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousTasks) {
      queryClient.setQueryData(
        queryKeys.assignments.instances({ assigneeId: variables.assigneeId, date: today }),
        context.previousTasks
      );
    }
    toast({
      title: "Error",
      description: "Couldn't save changes. Please try again.",
      variant: "destructive",
    });
  },
  onSettled: () => {
    // Always refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
  },
});
```

### Pattern 3: Delete with Confirmation Modal
**What:** Use AlertDialog for confirmation before delete mutation
**When to use:** All delete operations (groups, templates, assignments)
**Example:**
```typescript
// Source: Existing pattern in Templates.tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon" disabled={deleteMutation.isPending}>
      {deleteMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Group?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete "{group.name}" and remove all members.
        This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => deleteMutation.mutate(group.id)}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Anti-Patterns to Avoid
- **Over-using optimistic updates:** Only use for task completion. Forms in dialogs, redirects after updates - these are hard to rollback and create poor UX.
- **Not returning Promise from invalidateQueries:** If you want mutation to stay in loading state while cache updates, return the Promise from onSuccess/onSettled.
- **Forgetting cancelQueries in onMutate:** Without it, in-flight refetches can overwrite optimistic updates causing UI flicker.
- **Mutating cache data directly:** Always use immutable updates with setQueryData.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading states | Boolean useState + manual toggle | `mutation.isPending` | Automatic, handles edge cases, consistent |
| Error handling | try/catch + setState | `mutation.isError`, `onError` callback | Centralized, works with React Query's error boundaries |
| Cache invalidation | Manual refetch calls | `invalidateQueries` | Handles stale queries, respects staleTime |
| Optimistic rollback | Manual state revert | `onMutate` context + `onError` rollback | Standard pattern, handles concurrent mutations |
| Toast timing | setTimeout-based toasts | Radix toast with duration prop | Auto-dismiss, accessible, swipe-to-dismiss |

**Key insight:** The project already has manual mutation patterns with try/catch and useState for loading. useMutation consolidates these into a standard interface with better error handling and automatic state management.

## Common Pitfalls

### Pitfall 1: Toasts on Optimistic Updates
**What goes wrong:** Showing success toast immediately on optimistic update, then error toast if it fails - user sees conflicting messages
**Why it happens:** Treating optimistic UI feedback the same as server-confirmed feedback
**How to avoid:** Per CONTEXT.md decisions:
  - Task completion: No toast at all (checkbox update only)
  - Other mutations: Toast only in onSuccess (after server confirms)
**Warning signs:** Success toasts appearing before spinner finishes

### Pitfall 2: Stale Optimistic State
**What goes wrong:** User clicks checkbox, refetch happens, optimistic update gets overwritten, checkbox flickers back
**Why it happens:** Forgot to cancel in-flight queries before optimistic update
**How to avoid:** Always call `await queryClient.cancelQueries()` first in onMutate
**Warning signs:** UI state "jumping" or flickering on fast networks

### Pitfall 3: Complex Cache Updates
**What goes wrong:** Trying to manually update sorted/filtered lists, nested data, or computed values
**Why it happens:** Overcomplicating optimistic updates instead of using simple invalidation
**How to avoid:** Only optimistically update simple boolean toggles (task completed). For everything else, use invalidation.
**Warning signs:** Extensive cache manipulation code, items appearing in wrong order

### Pitfall 4: Modal Close During Pending Mutation
**What goes wrong:** User closes modal while mutation is pending, loses feedback on success/failure
**Why it happens:** Modal's close handler doesn't check mutation state
**How to avoid:** Disable close button/escape during `isPending`, or use `onSuccess` to close modal
**Warning signs:** Users reporting they don't know if action succeeded

### Pitfall 5: Missing Query Key in Invalidation
**What goes wrong:** Mutation succeeds but list doesn't update
**Why it happens:** Using wrong query key pattern for invalidation
**How to avoid:** Use exact keys from queryKeys factory; for related queries, use partial key matching
**Warning signs:** Data only updates after manual refresh or navigation

## Code Examples

Verified patterns from codebase analysis and official sources:

### Hook Structure with Multiple Mutations
```typescript
// Source: Existing useGroups.ts pattern + TanStack best practices
export function useGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for reading groups
  const { data: groups, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: queryKeys.groups.list(user?.id ?? ''),
    queryFn: () => fetchGroupsWithCounts(user!.id),
    enabled: !!user,
  });

  // Mutation for creating groups
  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupInput) => { /* ... */ },
    onSuccess: async (data) => {
      toast({ title: "Group Created", description: `"${data.name}" has been created` });
      return queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(user!.id) });
    },
    onError: (error) => {
      handleError(error, { component: 'useGroups', action: 'create group' });
    },
  });

  // Mutation for updating groups
  const updateGroupMutation = useMutation({ /* similar pattern */ });

  // Mutation for deleting groups
  const deleteGroupMutation = useMutation({ /* similar pattern */ });

  return {
    groups: groups ?? [],
    loading: isPending,
    isFetching,
    isError,
    error,
    fetchGroups: refetch,
    // Expose mutations with backward-compatible wrappers
    createGroup: createGroupMutation.mutate,
    createGroupAsync: createGroupMutation.mutateAsync,
    isCreating: createGroupMutation.isPending,
    updateGroup: updateGroupMutation.mutate,
    isUpdating: updateGroupMutation.isPending,
    deleteGroup: deleteGroupMutation.mutate,
    isDeleting: deleteGroupMutation.isPending,
  };
}
```

### Button with Loading State
```typescript
// Source: Existing pattern in CoachDashboard.tsx, standardized
<Button
  onClick={() => createGroup({ name, color, icon })}
  disabled={isCreating}
  className="w-full"
>
  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
  {isCreating ? "Saving..." : "Create Group"}
</Button>
```

### Task Completion Checkbox (Optimistic)
```typescript
// Source: StudentSchedule.tsx existing pattern + React Query optimistic updates
const handleToggleComplete = (taskId: string, completed: boolean) => {
  updateTaskStatusMutation.mutate({
    taskId,
    status: completed ? 'completed' : 'pending',
  });
};

// In JSX
<button
  onClick={() => handleToggleComplete(task.id, task.status !== 'completed')}
  disabled={updateTaskStatusMutation.isPending}
  className="..."
>
  {task.status === 'completed' ? (
    <CheckCircle2 className="w-6 h-6 text-green-600" />
  ) : (
    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground hover:border-green-500" />
  )}
</button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useState + useEffect for mutations | useMutation hook | React Query v3+ (2020) | Cleaner code, built-in loading/error states |
| Manual cache updates after mutation | invalidateQueries + staleTime | Best practice in v4/v5 | Simpler, less error-prone |
| onSuccess in useQuery | Removed in v5 | React Query v5 (2023) | Use useEffect or event handlers instead |
| useMutation onSuccess/onError | Still supported in v5 | N/A | Mutations are imperative, callbacks appropriate |

**Deprecated/outdated:**
- `onSuccess`, `onError`, `onSettled` in useQuery: Removed in v5, but still supported in useMutation
- Manual setQueryData for all mutations: Use invalidation unless optimistic updates are needed

## Open Questions

Things that couldn't be fully resolved:

1. **Checkbox error state visual**
   - What we know: CONTEXT.md says "Checkbox briefly shows error/failed state before reverting to unchecked"
   - What's unclear: Exact visual treatment (red border? red fill? error icon?)
   - Recommendation: Claude's discretion per CONTEXT.md - use brief red border or subtle red tint

2. **Invalidation granularity for assignments**
   - What we know: queryKeys.assignments has `.all`, `.instances()`, `.progress()`
   - What's unclear: Should task completion invalidate just instances or also progress?
   - Recommendation: Invalidate `queryKeys.assignments.all` to catch both (progress depends on completion)

3. **Toast duration configuration**
   - What we know: CONTEXT.md says 3s success, 5s error
   - What's unclear: Whether current toast implementation supports duration
   - Recommendation: Check toast component, may need to add duration prop or configure globally

## Sources

### Primary (HIGH confidence)
- TanStack Query v5 Docs - Mutations, Optimistic Updates, Query Invalidation
- TkDodo's blog - [Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
- Existing codebase: useGroups.ts, useTemplates.ts, useProfile.ts, useAssignments.ts
- Existing codebase: StudentSchedule.tsx, StudentHome.tsx (current optimistic update pattern)

### Secondary (MEDIUM confidence)
- TkDodo's blog - [Concurrent Optimistic Updates in React Query](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- Medium articles on React Query v5 mutations (verified against official docs)

### Tertiary (LOW confidence)
- None - all patterns verified against official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed, no new dependencies
- Architecture: HIGH - Patterns verified against TanStack docs and existing code
- Pitfalls: HIGH - Based on official docs warnings and TkDodo's authoritative blog

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - React Query is stable, patterns unlikely to change)
