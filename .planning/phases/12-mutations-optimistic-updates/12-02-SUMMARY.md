---
phase: 12
plan: 02
subsystem: hooks
tags: [react-query, useMutation, templates, profile, loading-states]

dependency-graph:
  requires:
    - "09-01: queryKeys factory"
    - "10-02: useProfile React Query migration"
    - "10-03: useTemplates React Query migration"
  provides:
    - "useMutation pattern for useTemplates (3 mutations)"
    - "useMutation pattern for useProfile (1 mutation)"
    - "Mutation loading states (isCreating, isUpdating, isDeleting)"
  affects:
    - "12-03: useAssignments useMutation migration"
    - "12-04: useRecurringSchedules useMutation migration"

tech-stack:
  added: []
  patterns:
    - "useMutation with onSuccess/onError callbacks"
    - "Backward-compatible wrapper functions"
    - "isPending state exposure as isCreating/isUpdating/isDeleting"

key-files:
  created: []
  modified:
    - src/hooks/useTemplates.ts
    - src/hooks/useTemplates.test.tsx
    - src/hooks/useProfile.ts
    - src/hooks/useProfile.test.tsx

decisions:
  - id: D-1202-01
    decision: "useMutation hooks defined inside useTemplates/useProfile for access to user context"
    rationale: "Mutations need user.id which comes from useAuth - defining inside the hook avoids prop drilling"
    outcome: "Clean access to user context, mutations properly scoped"
  - id: D-1202-02
    decision: "Wrapper functions catch errors and return null/false for backward compatibility"
    rationale: "Existing consumers expect null/boolean returns, not thrown errors"
    outcome: "Zero breaking changes to existing code"

metrics:
  duration: "3m 26s"
  completed: "2026-01-27"
---

# Phase 12 Plan 02: useTemplates and useProfile Mutations Summary

**One-liner:** Migrated 4 mutations (3 templates, 1 profile) to useMutation pattern with isPending loading states.

## What Was Built

Migrated mutation functions in useTemplates and useProfile from manual async functions to React Query's useMutation pattern, exposing loading states for UI feedback.

### useTemplates Mutations (3 total)

1. **createTemplateMutation**
   - Creates template in `templates` table
   - Creates associated tasks in `template_tasks` table
   - onSuccess: Shows toast, invalidates templates cache
   - onError: Calls handleError
   - Exposes: `isCreating`

2. **updateTemplateMutation**
   - Updates template record
   - Deletes existing tasks, inserts new tasks
   - onSuccess: Shows toast, invalidates templates cache
   - onError: Calls handleError
   - Exposes: `isUpdating`

3. **deleteTemplateMutation**
   - Deletes template (cascades to tasks)
   - onSuccess: Shows toast, invalidates templates cache
   - onError: Calls handleError
   - Exposes: `isDeleting`

### useProfile Mutation (1 total)

1. **updateProfileMutation**
   - Updates profile fields (display_name, avatar_url)
   - onSuccess: Shows toast, invalidates profile cache
   - onError: Calls handleError
   - Exposes: `isUpdating`

## Implementation Details

### Pattern Applied

```typescript
// Define mutation inside hook for access to user context
const createTemplateMutation = useMutation({
  mutationFn: async (data: { name: string; description: string; tasks: TemplateTask[] }) => {
    // Supabase operations...
    return createdTemplate;
  },
  onSuccess: async (data) => {
    toast({ title: "Template Created", description: `"${data.name}" has been saved...` });
    return queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(user!.id) });
  },
  onError: (error) => {
    handleError(error, { component: 'useTemplates', action: 'create template' });
  },
});

// Backward-compatible wrapper
const createTemplate = async (name: string, description: string, tasks: TemplateTask[]) => {
  if (!user) return null;
  try {
    return await createTemplateMutation.mutateAsync({ name, description, tasks });
  } catch {
    return null;
  }
};

// Return with new loading state
return {
  // ...existing
  createTemplate,
  isCreating: createTemplateMutation.isPending,
};
```

### Backward Compatibility

- All wrapper functions maintain exact same signatures and return types
- Errors caught and converted to null/false returns (as before)
- Toast notifications moved from try/catch to onSuccess callbacks
- handleError moved from try/catch to onError callbacks

## Tests Added

### useTemplates.test.tsx (+4 tests, now 21 total)
- `exposes isCreating, isUpdating, isDeleting states` - Verifies all states start false
- `isCreating becomes false after createTemplate completes` - Verifies post-mutation state
- `isUpdating becomes false after updateTemplate completes` - Verifies post-mutation state
- `isDeleting becomes false after deleteTemplate completes` - Verifies post-mutation state

### useProfile.test.tsx (+2 tests, now 16 total)
- `exposes isUpdating state` - Verifies state starts false
- `isUpdating becomes false after updateProfile completes` - Verifies post-mutation state

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript build | Pass |
| useTemplates tests | 21/21 pass |
| useProfile tests | 16/16 pass |
| Full test suite | 221/221 pass |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| c1f6d78 | feat(12-02): migrate useTemplates mutations to useMutation |
| d9016d0 | feat(12-02): migrate useProfile mutation to useMutation |

## Next Steps

Plans 12-03 (useAssignments) and 12-04 (useRecurringSchedules) can now apply the same pattern to remaining hooks, completing Phase 12 mutation migration.
