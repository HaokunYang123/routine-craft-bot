# Phase 10: Simple Hook Migration - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate low-complexity data fetching hooks (useProfile, useGroups, useTemplates) to React Query pattern. Component interfaces remain unchanged — this is internal refactoring. Leverages Phase 9's QueryClient config and key factory.

</domain>

<decisions>
## Implementation Decisions

### Loading State Behavior
- Show cached data instantly on navigation, refresh silently in background
- First load (no cache): skeleton placeholders, not spinners
- Subtle indicator (small spinner in corner/header) during background refresh
- Show "Taking longer than usual..." message if fetch exceeds 2 seconds

### Error Handling Approach
- Toast notification for fetch failures (non-blocking)
- Manual retry button in UI when fetch fails
- Single consolidated toast when multiple hooks fail together ("Multiple items failed to load")
- Keep stale cached data visible on error, show error indicator alongside it

### Cache/Refetch Triggers
- Refetch on window focus (user returns to tab)
- Refetch on network reconnect
- Visible refresh button for manual user-triggered refetch
- Automatic query invalidation when related data is created/updated

### Migration Strategy
- One hook per commit (atomic, easy to revert)
- Replace hooks in place — no legacy/deprecated versions
- Update existing tests (modify to mock React Query, not Supabase directly)
- Migration order: useProfile → useGroups → useTemplates (simplest first)

### Claude's Discretion
- Exact skeleton placeholder designs
- Refresh button placement and styling
- Slow connection threshold timing (around 2s)
- Error indicator visual treatment

</decisions>

<specifics>
## Specific Ideas

- Consolidated toast: "Multiple items failed to load" when network issues cause multiple failures
- Skeleton placeholders should mimic actual content layout
- Retry button should be clearly visible but not intrusive

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-simple-hook-migration*
*Context gathered: 2026-01-26*
