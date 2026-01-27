# Phase 13: Pagination - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Add cursor-based pagination and infinite scroll for large datasets. Focuses on client list initially. Users can navigate large lists smoothly without performance degradation.

</domain>

<decisions>
## Implementation Decisions

### Pagination Trigger
- Infinite scroll (auto-load when user scrolls near bottom)
- Preload threshold: 2-3 items before end of visible list
- Preserve scroll position when navigating away and back
- Fast scroll behavior: load all skipped pages in sequence (no gaps)

### Page Size UX
- Page size selector at top of list
- Default page size: 25 items
- Options: 10 / 25 / 50
- Persist preference per list (client list can differ from other lists)
- Store in localStorage or user preferences

### Loading & End States
- Loading indicator: spinner at bottom of list (below last item)
- End of list text: "That's everything"
- End styling: text with subtle horizontal divider
- Error handling: inline retry button where spinner was ("Failed to load. Retry")

### Which Lists Paginate
- Client list only (for this phase)
- Always show pagination controls, even for small lists
- Show total count: "Showing 25 of 142"
- Pagination applies regardless of dataset size (good practice)

### Claude's Discretion
- Intersection Observer vs scroll event implementation
- Exact spinner component/styling
- How to store per-list preferences (localStorage key structure)
- Cursor implementation details for Supabase queries

</decisions>

<specifics>
## Specific Ideas

- User wants scroll position preserved when navigating away and returning
- Friendly "That's everything" tone rather than technical "End of list"
- Total count gives user context for how much data exists

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-pagination*
*Context gathered: 2026-01-27*
