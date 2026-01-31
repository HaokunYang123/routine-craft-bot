# Phase 19: Student Dashboard Layout - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the student dashboard to always display three consistent boxes (My Group, Tasks to Do, Coach's Notes) with color-coding. Also includes security feature removal (merged from Phase 22): Delete Account, Change Password, and 2FA.

</domain>

<decisions>
## Implementation Decisions

### Box visual styling
- Colored left border for each box (not background or header bar)
- Match app theme colors for the three boxes
- Bold title only for headers (no icons)
- Subtle drop shadow around boxes (no border)
- Slightly rounded corners (4-8px radius)
- Full-height left border (entire side of box)
- Thin left border (3-4px)
- Pure white (#fff) background for boxes

### Empty state content
- "My Group" empty: Simple text message ("No group yet" or similar)
- "Tasks to Do" empty: Simple text ("No tasks assigned" or similar)
- "Coach's Notes" empty: Simple text ("No notes yet" or similar)
- Empty state text styled with gray/muted color

### Box sizing & spacing
- All three boxes equal height (match tallest)
- Desktop: 3 columns side-by-side
- Mobile: Vertically stacked (one box per row)
- Tight spacing between boxes (8-12px)

### Security feature removal
- Remove Delete Account completely (UI, backend, database functions)
- Remove for all users (coaches and students)
- Remove Change Password completely
- Remove 2FA completely
- Separate commits for each removal (one at a time)
- Update documentation if any exists
- Ensure settings page layout remains clean after removals

### Claude's Discretion
- Exact shade of theme colors for left borders
- Exact empty state text wording
- Breakpoint for mobile vs desktop layout transition
- Investigation of what security code actually exists before removal

</decisions>

<specifics>
## Specific Ideas

- Data export feature does not exist (skip "Download Data" removal)
- No concern about users requesting account deletion in the future
- Remove any related logging/analytics for deleted features

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (Phase 22 security work merged into this phase)

</deferred>

---

*Phase: 19-student-dashboard-layout*
*Context gathered: 2026-01-31*
