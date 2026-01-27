# Phase 12: Mutations & Optimistic Updates - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add mutation patterns (create/update/delete) with React Query's useMutation. Task completion gets optimistic updates for instant checkbox feedback. All mutations use query invalidation for cache sync and show appropriate loading/error states.

</domain>

<decisions>
## Implementation Decisions

### Feedback timing
- Success toasts appear after server confirms (not on optimistic click)
- Success toasts display for 3 seconds
- Error toasts display for 5 seconds (longer to ensure user reads)
- Task completion: checkbox update only, no toast (reduces noise for frequent action)

### Rollback behavior
- Failed optimistic updates show error toast + quietly revert UI
- No shake/flash animation on rollback
- No retry button in toast - user repeats action to retry
- Checkbox briefly shows error/failed state before reverting to unchecked
- Error messages are user-friendly: "Couldn't save changes. Please try again."

### Mutation scope
- Optimistic updates: task completion only (most frequent, highest benefit)
- Non-optimistic mutations: Groups first, then Templates, then Assignments
- Delete operations always require modal confirmation
- Cache strategy: invalidate + refetch (not manual cache updates)

### Loading states
- Buttons: spinner + disabled + text changes to "Saving..."
- Modals/forms prevent close while mutation is pending
- Inline edits show subtle spinner next to field
- No global loading indicator - local indicators only

### Claude's Discretion
- Exact spinner component/styling
- Error state color for checkbox (brief red/error appearance)
- Which existing mutations to migrate vs. which to add fresh
- Invalidation granularity (invalidate single key vs. related keys)

</decisions>

<specifics>
## Specific Ideas

- Task checkbox is the critical optimistic update - it's the most used interaction
- Groups > Templates > Assignments priority based on user management frequency
- "Couldn't save changes" is the fallback error message - keep it simple

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 12-mutations-optimistic-updates*
*Context gathered: 2026-01-26*
